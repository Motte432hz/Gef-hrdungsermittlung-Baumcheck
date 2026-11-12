import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate, useParams } from 'react-router'
import { db } from '../db/db'
import { createNewVersion, getProtocolPdf, markSent } from '../db/repo'
import { listCustomers } from '../db/profiles'
import { sha256Hex, shortHash } from '../lib/hash'
import { downloadPdf, sharePdf } from '../lib/sharePdf'
import { useObjectUrl } from '../lib/useObjectUrl'
import { assessmentTitle, formatDateDe } from '../wizard/draftInfo'
import { createFromTemplate } from '../wizard/template'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { DocumentsCard } from './DocumentsCard'

const fmt = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '–'

export function ProtocolPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [shareInfo, setShareInfo] = useState<string>()
  const data = useLiveQuery(async () => {
    const a = await db.assessments.get(id!)
    if (!a) return null
    const [pdf, customers, newer] = await Promise.all([
      getProtocolPdf(db, a.id),
      listCustomers(db, a.organizationId),
      db.assessments.where('previousVersionId').equals(a.id).first(),
    ])
    // Integrity check: the stored PDF must still match the hash saved on completion.
    const intact = pdf && a.pdfHash ? (await sha256Hex(pdf.file.data)) === a.pdfHash : undefined
    return { a, pdf, title: assessmentTitle(a, customers), intact, newer }
  }, [id])
  const pdfUrl = useObjectUrl(data?.pdf?.file)

  if (data === undefined) return <p>Lädt …</p>
  if (data === null) return <PageHeader title="Nicht gefunden" back="/archiv" backLabel="Archiv" />
  const { a, pdf, title, intact, newer } = data
  if (a.status === 'draft')
    return <PageHeader title="Noch nicht abgeschlossen" back="/" backLabel="Start" />

  const share = async () => {
    if (!pdf) return
    const r = await sharePdf(pdf.file, pdf.fileName, `Gefährdungsermittlung ${a.protocolNumber}`)
    if (r === 'unsupported') {
      downloadPdf(pdf.file, pdf.fileName)
      setShareInfo('Teilen wird hier nicht unterstützt – das PDF wurde stattdessen gespeichert.')
    } else setShareInfo(undefined)
  }

  const correct = async () => {
    if (
      !window.confirm(
        'Eine neue Version als Entwurf anlegen? Das abgeschlossene Protokoll bleibt unverändert erhalten.',
      )
    )
      return
    const v = await createNewVersion(db, a.id)
    navigate(`/einsatz/${v.id}/job`)
  }

  return (
    <div className="space-y-4">
      <PageHeader title={`Protokoll ${a.protocolNumber}`} back="/archiv" backLabel="Archiv" />

      <Card>
        <p className="text-lg font-semibold">{title}</p>
        <p className="text-stone-600 dark:text-stone-400">
          Einsatz {formatDateDe(a.date)} · abgeschlossen {fmt(a.completedAt)} Uhr
          {a.version > 1 && ` · Version ${a.version}`}
        </p>
        <p className="mt-2 inline-block rounded-md bg-brand-100 px-2 py-0.5 text-sm font-semibold text-brand-900 dark:bg-brand-900 dark:text-brand-100">
          {a.status === 'sent' ? `versendet ${fmt(a.sentAt)}` : 'abgeschlossen und gesperrt'}
        </p>
        {newer && (
          <p className="mt-2 font-semibold text-amber-800 dark:text-amber-300">
            Es gibt eine neuere Version dieses Protokolls.
          </p>
        )}
      </Card>

      <Card title="PDF">
        {pdf ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void share()}>Teilen (Mail, WhatsApp …)</Button>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center rounded-xl border-2 border-stone-300 px-5 font-semibold dark:border-stone-600"
              >
                Öffnen
              </a>
              <Button variant="secondary" onClick={() => downloadPdf(pdf.file, pdf.fileName)}>
                Speichern
              </Button>
            </div>
            {shareInfo && <p className="text-sm">{shareInfo}</p>}
            {a.status !== 'sent' && (
              <Button variant="secondary" onClick={() => void markSent(db, a.id)}>
                Als versendet markieren
              </Button>
            )}
          </div>
        ) : (
          <p>Kein PDF gespeichert.</p>
        )}
      </Card>

      <DocumentsCard assessmentId={a.id} />

      <Card title="Nachweis">
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-stone-600 dark:text-stone-400">Prüfwert Inhalt (steht im PDF)</dt>
            <dd className="font-mono">{a.contentHash ? shortHash(a.contentHash, 4) : '–'}</dd>
          </div>
          <div>
            <dt className="text-stone-600 dark:text-stone-400">SHA-256 der PDF-Datei</dt>
            <dd className="font-mono break-all">{a.pdfHash ?? '–'}</dd>
          </div>
          <div>
            <dt className="text-stone-600 dark:text-stone-400">Prüfung</dt>
            <dd className="font-semibold" data-testid="pdf-integrity">
              {intact === undefined
                ? '–'
                : intact
                  ? '✓ PDF ist unverändert'
                  : '⚠ PDF stimmt nicht mit dem gespeicherten Prüfwert überein'}
            </dd>
          </div>
          <div>
            <dt className="text-stone-600 dark:text-stone-400">Gerät</dt>
            <dd className="break-all">{a.deviceInfo ?? '–'}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Wiederkehrender Einsatz">
        <p className="mb-3 text-stone-700 dark:text-stone-300">
          Neuer Einsatz mit Kunde, Ort, Rettungsinfos, Team und Baum-Grunddaten aus diesem
          Protokoll. Alle Prüfpunkte und Gefahren werden vor Ort neu beurteilt.
        </p>
        <Button
          variant="secondary"
          onClick={() =>
            void createFromTemplate(db, a.id).then((d) => navigate(`/einsatz/${d.id}/job`))
          }
        >
          Als Vorlage für neuen Einsatz
        </Button>
      </Card>

      <Card title="Korrektur">
        <p className="mb-3 text-stone-700 dark:text-stone-300">
          Abgeschlossene Protokolle können nicht geändert werden. Für eine Korrektur wird eine neue
          Version mit Verweis auf dieses Protokoll angelegt; alle unterschreiben erneut.
        </p>
        <Button variant="secondary" onClick={() => void correct()}>
          Neue Version anlegen
        </Button>
        {a.previousVersionId && (
          <p className="mt-3 text-sm">
            Ersetzt{' '}
            <Link to={`/protokoll/${a.previousVersionId}`} className="font-semibold underline">
              die vorherige Version
            </Link>
            .
          </p>
        )}
      </Card>
    </div>
  )
}
