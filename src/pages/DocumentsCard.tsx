import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { addDocument, getDocuments, removeDocument, type DocumentKind } from '../db/repo'
import type { Attachment } from '../domain/types'
import { toStoredFile } from '../lib/storedFile'
import { useObjectUrl } from '../lib/useObjectUrl'
import { detectPlatform } from '../lib/install'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Segmented } from '../components/form/Segmented'
import { ScanEditor } from '../components/ScanEditor'
import { CameraCapture } from '../components/CameraCapture'
import { useCloudRights } from '../cloud/useCloudRights'

const KIND_LABELS: Record<DocumentKind, string> = {
  order_confirmation: 'Auftragsbestätigung',
  invoice: 'Rechnung',
  other: 'Sonstiges',
}
const hasNativeCamera = () =>
  detectPlatform(navigator.userAgent, navigator.maxTouchPoints) !== 'other'
const pickClass =
  'inline-flex min-h-14 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-stone-300 px-4 font-semibold has-focus-visible:outline-3 dark:border-stone-600'

function DocRow({ doc }: { doc: Attachment }) {
  const url = useObjectUrl(doc.file)
  const rights = useCloudRights()
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{KIND_LABELS[doc.kind as DocumentKind]}</span>
        <span className="block text-sm text-stone-600 dark:text-stone-400">
          {doc.fileName} · {new Date(doc.capturedAt).toLocaleDateString('de-DE')}
        </span>
      </span>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-12 items-center rounded-xl border-2 border-stone-300 px-4 font-semibold dark:border-stone-600"
      >
        Öffnen
      </a>
      {rights.canDelete(doc, 'record') && (
        <Button
          variant="secondary"
          onClick={() => {
            if (window.confirm(`${KIND_LABELS[doc.kind as DocumentKind]} entfernen?`))
              void removeDocument(db, doc.id)
          }}
        >
          Entfernen
        </Button>
      )}
    </li>
  )
}

/** Order confirmation and invoice for a job: scan (crop + contrast) or pick a file. */
export function DocumentsCard({ assessmentId }: { assessmentId: string }) {
  const docs = useLiveQuery(() => getDocuments(db, assessmentId), [assessmentId])
  const [kind, setKind] = useState<DocumentKind>('order_confirmation')
  const [scan, setScan] = useState<Blob>()
  const [camera, setCamera] = useState(false)
  const [error, setError] = useState<string>()

  const stamp = () => new Date().toISOString().slice(0, 10)
  const save = async (blob: Blob, name: string) => {
    setError(undefined)
    try {
      await addDocument(
        db,
        assessmentId,
        kind,
        await toStoredFile(blob, blob.type || 'application/pdf'),
        name,
      )
    } catch (e) {
      console.error(e)
      setError('Das Dokument konnte nicht gespeichert werden.')
    }
  }
  const picked = (file: File | undefined) => {
    if (!file) return
    if (file.type === 'application/pdf') void save(file, file.name)
    else if (file.type.startsWith('image/')) setScan(file)
    else setError('Bitte ein Foto oder eine PDF-Datei wählen.')
  }

  return (
    <Card title="Auftrag & Rechnung">
      <div className="space-y-3">
        <Segmented<DocumentKind>
          label="Art des Dokuments"
          options={Object.entries(KIND_LABELS).map(([value, label]) => ({
            value: value as DocumentKind,
            label,
          }))}
          value={kind}
          onChange={setKind}
        />
        <div className="flex flex-wrap gap-2">
          {hasNativeCamera() ? (
            <label className={pickClass}>
              📷 Scannen
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => picked(e.target.files?.[0])}
              />
            </label>
          ) : (
            <button type="button" className={pickClass} onClick={() => setCamera(true)}>
              📷 Scannen
            </button>
          )}
          <label className={pickClass}>
            📄 Datei wählen
            <input
              type="file"
              accept="image/*,application/pdf"
              className="sr-only"
              data-testid="document-file"
              onChange={(e) => picked(e.target.files?.[0])}
            />
          </label>
        </div>
        {error && <p className="font-semibold text-red-700 dark:text-red-400">{error}</p>}
        {docs && docs.length > 0 ? (
          <ul aria-label="Dokumente" className="divide-y divide-stone-200 dark:divide-stone-800">
            {docs.map((d) => (
              <DocRow key={d.id} doc={d} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Noch kein Dokument angehängt. Fotos von Papier werden zugeschnitten und kontrastreich
            gespeichert.
          </p>
        )}
      </div>
      {camera && (
        <CameraCapture
          onCapture={(blob) => {
            setCamera(false)
            setScan(blob)
          }}
          onClose={() => setCamera(false)}
        />
      )}
      {scan && (
        <ScanEditor
          source={scan}
          onCancel={() => setScan(undefined)}
          onSave={async (jpeg) => {
            await save(jpeg, `${KIND_LABELS[kind]} ${stamp()}.jpg`)
            setScan(undefined)
          }}
        />
      )}
    </Card>
  )
}
