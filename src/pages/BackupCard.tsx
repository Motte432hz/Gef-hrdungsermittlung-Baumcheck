import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  backupFileName,
  BackupError,
  exportBackup,
  importBackup,
  META_LAST_BACKUP,
} from '../backup/backup'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { formatBytes } from '../lib/storage'

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

async function deliver(zip: Uint8Array, name: string) {
  const file = new File([zip as Uint8Array<ArrayBuffer>], name, { type: 'application/zip' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return
    } catch {
      // Share sheet closed – fall back to download below.
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function BackupCard() {
  const last = useLiveQuery(
    async () => ((await db.meta.get(META_LAST_BACKUP))?.value as string | undefined) ?? null,
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string }>()

  const create = async () => {
    setBusy(true)
    setMessage(undefined)
    try {
      const { zip, summary } = await exportBackup(db, __APP_VERSION__)
      await deliver(zip, backupFileName())
      setMessage({
        ok: true,
        text: `Backup erstellt (${formatBytes(zip.byteLength)}): ${summary.assessments} Einsätze, davon ${summary.completed} abgeschlossen, ${summary.photos} Fotos.`,
      })
    } catch (e) {
      console.error(e)
      setMessage({ ok: false, text: 'Backup konnte nicht erstellt werden.' })
    } finally {
      setBusy(false)
    }
  }

  const restore = async (file: File | undefined) => {
    if (!file) return
    if (
      !window.confirm(
        `Backup „${file.name}“ einspielen? Vorhandene Daten bleiben erhalten, abgeschlossene Protokolle werden nie überschrieben.`,
      )
    )
      return
    setBusy(true)
    setMessage(undefined)
    try {
      const r = await importBackup(db, new Uint8Array(await file.arrayBuffer()))
      setMessage({
        ok: true,
        text: `Backup eingespielt: ${r.added} neu, ${r.updated} aktualisiert, ${r.skipped} unverändert.`,
      })
    } catch (e) {
      console.error(e)
      setMessage({
        ok: false,
        text: e instanceof BackupError ? e.message : 'Backup konnte nicht eingespielt werden.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Datensicherung">
      <div className="space-y-3">
        <p className="text-stone-700 dark:text-stone-300">
          Ohne Cloud liegen alle Daten nur auf diesem Gerät. Ein Backup enthält alle Einsätze,
          Protokolle (PDF), Fotos, Unterschriften und Profile. Speichere es z. B. in deiner Cloud
          oder schicke es dir per Mail – damit lassen sich die Daten auch auf ein neues Gerät
          übertragen.
        </p>
        <p className="font-semibold" data-testid="last-backup">
          {last === undefined
            ? '…'
            : last
              ? `Letztes Backup: ${fmt(last)} Uhr`
              : 'Noch kein Backup erstellt.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void create()} disabled={busy}>
            {busy ? 'Bitte warten …' : 'Backup erstellen'}
          </Button>
          <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl border-2 border-stone-300 px-5 font-semibold has-focus-visible:outline-3 dark:border-stone-600">
            Backup einspielen
            <input
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void restore(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        </div>
        {message && (
          <p
            role="status"
            className={`font-semibold ${message.ok ? 'text-brand-700 dark:text-brand-300' : 'text-red-700 dark:text-red-400'}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </Card>
  )
}
