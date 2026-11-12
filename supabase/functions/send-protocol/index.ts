// Supabase Edge Function: sends a completed protocol (PDF) to the company's report addresses.
//
// Called by the app after the protocol and its PDF are synced. Checks that the caller is an
// active member of the company, loads the PDF from storage and sends it via Brevo
// (BREVO_API_KEY secret). Marks the protocol as sent. `dryRun` validates without sending.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })

function base64(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Nur POST.' }, 405)

  const apiKey = Deno.env.get('BREVO_API_KEY')
  if (!apiKey)
    return json({ error: 'Der Mail-Versand ist auf dem Server nicht eingerichtet.' }, 500)
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Who is calling?
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  const { data: userData } = await admin.auth.getUser(jwt)
  const user = userData?.user
  if (!user) return json({ error: 'Nicht angemeldet.' }, 401)

  const { assessmentId, dryRun } = (await req.json().catch(() => ({}))) as {
    assessmentId?: string
    dryRun?: boolean
  }
  if (!assessmentId) return json({ error: 'assessmentId fehlt.' }, 400)

  const { data: a } = await admin
    .from('assessments')
    .select('id, organization_id, status, deleted_at, data')
    .eq('id', assessmentId)
    .maybeSingle()
  if (!a || a.deleted_at)
    return json({ error: 'Protokoll nicht gefunden (noch nicht abgeglichen?).' }, 404)

  const { data: member } = await admin
    .from('memberships')
    .select('role')
    .eq('organization_id', a.organization_id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!member) return json({ error: 'Kein Mitglied dieser Firma.' }, 403)

  if (a.status === 'draft')
    return json({ error: 'Das Protokoll ist noch nicht abgeschlossen.' }, 409)
  if (a.status === 'sent' && !dryRun)
    return json({ sent: true, already: true, sentAt: a.data?.sentAt })

  const { data: org } = await admin
    .from('organizations')
    .select('data')
    .eq('id', a.organization_id)
    .single()
  const to: string[] = (org?.data?.reportEmails ?? []).filter(
    (e: unknown) => typeof e === 'string' && e.includes('@'),
  )
  if (to.length === 0)
    return json({ error: 'Unter Firma → Versand ist keine E-Mail-Adresse eingetragen.' }, 409)

  const { data: pdfRow } = await admin
    .from('attachments')
    .select('data')
    .eq('assessment_id', assessmentId)
    .is('deleted_at', null)
    .filter('data->>kind', 'eq', 'protocol_pdf')
    .maybeSingle()
  const ref = pdfRow?.data?.file as { $file?: string } | undefined
  if (!ref?.$file) return json({ error: 'Das PDF ist noch nicht abgeglichen.' }, 409)
  const { data: blob, error: dlErr } = await admin.storage.from('files').download(ref.$file)
  if (dlErr || !blob) return json({ error: 'Das PDF konnte nicht geladen werden.' }, 500)
  const pdf = new Uint8Array(await blob.arrayBuffer())

  // Sender: the first verified sender of the Brevo account.
  const sendersRes = await fetch('https://api.brevo.com/v3/senders', {
    headers: { 'api-key': apiKey, accept: 'application/json' },
  })
  const senders = sendersRes.ok
    ? ((await sendersRes.json()).senders as { email: string; name?: string; active: boolean }[])
    : []
  const sender = senders.find((s) => s.active) ?? senders[0]
  if (!sender) return json({ error: 'Bei Brevo ist kein bestätigter Absender eingerichtet.' }, 500)

  const number = (a.data?.protocolNumber as string | undefined) ?? assessmentId
  const companyName = (org?.data?.name as string | undefined) ?? ''
  const fileName =
    (pdfRow?.data?.fileName as string | undefined) ?? `Gefaehrdungsermittlung_${number}.pdf`
  const date = String(a.data?.date ?? '')
    .split('-')
    .reverse()
    .join('.')
  const address = a.data?.answers?.['site.address']?.value as string | undefined

  const mail = {
    sender: { name: companyName ? `${companyName} (BaumCheck)` : 'BaumCheck', email: sender.email },
    to: to.map((email) => ({ email })),
    ...(org?.data?.email ? { replyTo: { email: org.data.email } } : {}),
    subject: `Gefährdungsermittlung ${number}${address ? ` – ${address}` : ''}`,
    htmlContent: `<p>Im Anhang die abgeschlossene Gefährdungsermittlung <strong>${esc(number)}</strong>${
      date ? ` vom ${esc(date)}` : ''
    }${address ? ` (${esc(address)})` : ''}.</p><p>Erstellt und unterschrieben mit BaumCheck. Das PDF ist mit einem Prüfwert gegen Änderungen gesichert.</p>`,
    attachment: [{ name: fileName, content: base64(pdf) }],
  }
  const sendRes = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
      ...(dryRun ? { 'X-Sib-Sandbox': 'drop' } : {}),
    },
    body: JSON.stringify(mail),
  })
  if (!sendRes.ok) {
    const detail = await sendRes.text()
    console.error('brevo', sendRes.status, detail)
    return json({ error: `Der Mail-Dienst hat abgelehnt (${sendRes.status}).` }, 502)
  }
  if (dryRun) return json({ sent: false, dryRun: true, to })

  const sentAt = new Date().toISOString()
  const { error: upErr } = await admin
    .from('assessments')
    .update({
      status: 'sent',
      data: { ...a.data, status: 'sent', sentAt },
      updated_at: sentAt,
    })
    .eq('id', assessmentId)
  if (upErr) console.error('mark sent', upErr)
  await admin.from('audit_log').insert({
    id: crypto.randomUUID(),
    organization_id: a.organization_id,
    created_by: user.id,
    created_at: sentAt,
    updated_at: sentAt,
    data: {
      id: crypto.randomUUID(),
      organizationId: a.organization_id,
      at: sentAt,
      action: 'sent',
      entity: 'assessment',
      entityId: assessmentId,
      details: `E-Mail an ${to.join(', ')}`,
    },
  })
  return json({ sent: true, to, sentAt })
})
