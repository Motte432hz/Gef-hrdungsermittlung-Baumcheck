import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '../../db/db'
import { useOrganization } from '../../app/useOrganization'
import { useOnlineStatus } from '../../lib/online'
import { PageHeader } from '../../components/PageHeader'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { TextField } from '../../components/form/Field'
import { Notice } from '../../wizard/inputs/Notice'
import { useCloudSession, type CloudUser } from '../../cloud/useCloudSession'
import {
  adoptOrganization,
  cloudErrorMessage,
  createCloudOrganization,
  createInvite,
  loadMemberships,
  requestJoin,
  ROLE_LABELS_CLOUD,
  sendLoginCode,
  verifyLoginCode,
  type Membership,
} from '../../cloud/account'

const META_JOIN_NAME = 'cloudJoinName'

/** Firmen-Kartei: sign in, put the company into the cloud or join one, invite others. */
export function CloudPage() {
  const online = useOnlineStatus()
  const { client, user } = useCloudSession()

  return (
    <div className="space-y-4">
      <PageHeader title="Firmen-Kartei" back="/profile/firma" backLabel="Firma" />
      <p className="text-stone-700 dark:text-stone-300">
        Mit der Firmen-Kartei teilen alle Geräte eurer Firma Mitarbeiter, Subunternehmer, Kunden und
        Protokolle. Ohne Internet funktioniert alles weiter – abgeglichen wird, sobald wieder Netz
        da ist.
      </p>
      {!online && !user && (
        <Notice level="info">Für die Anmeldung wird eine Internetverbindung benötigt.</Notice>
      )}
      {!client || user === undefined ? (
        <p>Lädt …</p>
      ) : user === null ? (
        <LoginCard client={client} />
      ) : (
        <SignedIn client={client} user={user} />
      )}
    </div>
  )
}

function ErrorText({ text }: { text?: string }) {
  return text ? (
    <p role="alert" className="font-semibold text-red-700 dark:text-red-400">
      {text}
    </p>
  ) : null
}

function LoginCard({ client }: { client: SupabaseClient }) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(undefined)
    try {
      await fn()
    } catch (e) {
      setError(cloudErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Anmelden">
      {step === 'email' ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!/^\S+@\S+\.\S+$/.test(email.trim()))
              return setError('Bitte eine gültige E-Mail-Adresse eingeben.')
            void run(async () => {
              await sendLoginCode(client, email)
              setStep('code')
            })
          }}
        >
          <p className="text-stone-700 dark:text-stone-300">
            Kein Passwort nötig: Du bekommst einen 6-stelligen Code per E-Mail.
          </p>
          <TextField
            label="E-Mail-Adresse"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <ErrorText text={error} />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Sendet …' : 'Code senden'}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void run(() => verifyLoginCode(client, email, code))
          }}
        >
          <p className="text-stone-700 dark:text-stone-300">
            Code an <strong>{email.trim()}</strong> gesendet. Schau auch im Spam-Ordner nach.
          </p>
          <TextField
            label="Code aus der E-Mail"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <ErrorText text={error} />
          <Button type="submit" disabled={busy || code.length < 6} className="w-full">
            {busy ? 'Prüft …' : 'Anmelden'}
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void run(() => sendLoginCode(client, email))}
            >
              Code erneut senden
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setStep('email')
                setCode('')
                setError(undefined)
              }}
            >
              Andere E-Mail
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}

function SignedIn({ client, user }: { client: SupabaseClient; user: CloudUser }) {
  const org = useOrganization()
  const [memberships, setMemberships] = useState<Membership[]>()
  const [error, setError] = useState<string>()

  // Bumping `tick` loads the memberships again.
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    loadMemberships(client, user.id)
      .then((list) => {
        if (cancelled) return
        setMemberships(list)
        setError(undefined)
      })
      .catch((e) => !cancelled && setError(cloudErrorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [client, user.id, tick])

  // Waiting for approval: check again every 15 seconds while the page is open.
  const pending = memberships?.find((m) => m.status === 'pending')
  useEffect(() => {
    if (!pending) return
    const t = window.setInterval(refresh, 15_000)
    return () => window.clearInterval(t)
  }, [pending, refresh])

  // One company per device: prefer the one this device already works for.
  const active =
    memberships?.find((m) => m.status === 'active' && m.organizationId === org?.id) ??
    memberships?.find((m) => m.status === 'active')

  // After approval this device switches to the cloud company.
  useEffect(() => {
    if (!active || !org || active.organizationId === org.id) return
    adoptOrganization(db, active.organizationId, active.organizationName).catch((e) =>
      setError(cloudErrorMessage(e)),
    )
  }, [active, org])

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>
            Angemeldet als <strong>{user.email}</strong>
          </p>
          <Button variant="secondary" onClick={() => void client.auth.signOut()}>
            Abmelden
          </Button>
        </div>
      </Card>
      <ErrorText text={error} />
      {memberships === undefined ? (
        !error && <p>Lädt …</p>
      ) : active ? (
        <ActiveCard client={client} membership={active} />
      ) : pending ? (
        <PendingCard membership={pending} onRefresh={refresh} />
      ) : (
        <ChooseCard
          client={client}
          rejected={memberships.some((m) => m.status === 'rejected' || m.status === 'removed')}
          onDone={refresh}
        />
      )}
    </>
  )
}

function ActiveCard({ client, membership }: { client: SupabaseClient; membership: Membership }) {
  const [code, setCode] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const canInvite = membership.role === 'owner' || membership.role === 'admin'

  const invite = async () => {
    setBusy(true)
    setError(undefined)
    try {
      setCode(await createInvite(client, membership.organizationId))
    } catch (e) {
      setError(cloudErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Verbunden">
      <div className="space-y-3">
        <p>
          <strong>{membership.organizationName || 'Eure Firma'}</strong> ·{' '}
          {ROLE_LABELS_CLOUD[membership.role]}
        </p>
        {canInvite && (
          <div className="space-y-3 rounded-xl bg-stone-100 p-3 dark:bg-stone-800">
            <p className="font-semibold">Mitarbeiter oder weiteres Gerät einladen</p>
            {code ? (
              <>
                <p
                  className="font-mono text-3xl font-bold tracking-widest"
                  data-testid="invite-code"
                >
                  {code}
                </p>
                <p className="text-sm">
                  Gilt 7 Tage. Auf dem neuen Gerät: BaumCheck öffnen → Profile → Firma →
                  Firmen-Kartei → anmelden → „Einer Firma beitreten“ → Code eingeben. Danach
                  bekommst du hier eine Anfrage zum Freigeben.
                </p>
                {'share' in navigator && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void navigator
                        .share({
                          text: `Einladung zu ${membership.organizationName || 'unserer Firma'} in BaumCheck: Code ${code}`,
                        })
                        .catch(() => {})
                    }
                  >
                    Code teilen
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={() => void invite()} disabled={busy}>
                {busy ? 'Erstellt …' : 'Einladungs-Code erstellen'}
              </Button>
            )}
            <ErrorText text={error} />
          </div>
        )}
      </div>
    </Card>
  )
}

function PendingCard({ membership, onRefresh }: { membership: Membership; onRefresh: () => void }) {
  const [name, setName] = useState<string>()
  useEffect(() => {
    void db.meta.get(META_JOIN_NAME).then((m) => setName(m?.value as string | undefined))
  }, [])
  return (
    <Card title="Warte auf Freigabe">
      <div className="space-y-3">
        <p>
          Deine Anfrage{name ? ` an ${name}` : ''} ist gesendet ({membership.displayName}). Sobald
          ein Admin sie freigibt, werden die Daten der Firma auf dieses Gerät geladen.
        </p>
        <Button variant="secondary" onClick={onRefresh}>
          Status prüfen
        </Button>
      </div>
    </Card>
  )
}

function ChooseCard({
  client,
  rejected,
  onDone,
}: {
  client: SupabaseClient
  rejected: boolean
  onDone: () => void
}) {
  const org = useOrganization()
  const [mode, setMode] = useState<'create' | 'join'>()
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const submit = async () => {
    if (!displayName.trim()) return setError('Bitte deinen Namen eingeben.')
    setBusy(true)
    setError(undefined)
    try {
      if (mode === 'create') {
        await createCloudOrganization(client, org!, displayName)
      } else {
        const r = await requestJoin(client, code, displayName)
        await db.meta.put({ key: META_JOIN_NAME, value: r.organizationName })
      }
      onDone()
    } catch (e) {
      setError(cloudErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {rejected && (
        <Notice level="warning">
          Deine letzte Anfrage wurde abgelehnt oder der Zugang beendet. Du kannst mit einem neuen
          Code erneut anfragen.
        </Notice>
      )}
      <Card title="Wie möchtest du starten?">
        <div className="space-y-3">
          <Button
            variant={mode === 'create' ? 'primary' : 'secondary'}
            className="w-full"
            onClick={() => setMode('create')}
          >
            Unsere Firma in die Cloud bringen
          </Button>
          <Button
            variant={mode === 'join' ? 'primary' : 'secondary'}
            className="w-full"
            onClick={() => setMode('join')}
          >
            Einer Firma beitreten (mit Code)
          </Button>
        </div>
      </Card>

      {mode === 'create' &&
        (org?.name ? (
          <Card title={`${org.name} in die Cloud bringen`}>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void submit()
              }}
            >
              <p className="text-stone-700 dark:text-stone-300">
                Du wirst Inhaber/in der Firmen-Kartei: Nur du darfst später endgültig löschen.
                Weitere Admins kannst du ernennen.
              </p>
              <TextField
                label="Dein Name"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <ErrorText text={error} />
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? 'Richtet ein …' : 'Firmen-Kartei anlegen'}
              </Button>
            </form>
          </Card>
        ) : (
          <Notice level="info">
            Bitte zuerst unter{' '}
            <Link to="/profile/firma" className="underline">
              Firma
            </Link>{' '}
            den Firmennamen eintragen.
          </Notice>
        ))}

      {mode === 'join' && (
        <Card title="Einer Firma beitreten">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <TextField
              label="Einladungs-Code"
              hint="Bekommst du von der Inhaberin, dem Inhaber oder einem Admin, z. B. K7P3-9QXM."
              autoCapitalize="characters"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <TextField
              label="Dein Name"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <ErrorText text={error} />
            <Button
              type="submit"
              disabled={busy || code.replace(/\W/g, '').length < 8}
              className="w-full"
            >
              {busy ? 'Sendet …' : 'Anfrage senden'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
