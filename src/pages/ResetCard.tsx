import { useEffect, useState } from 'react'
import { db } from '../db/db'
import { useOrganization } from '../app/useOrganization'
import { useOnlineStatus } from '../lib/online'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { TextField, Toggle } from '../components/form/Field'
import { Notice } from '../wizard/inputs/Notice'
import {
  checkResetCode,
  hasResetCode,
  resetCodeMessage,
  setResetCode,
  validResetCode,
} from '../lib/resetCode'
import { wipeDevice } from '../lib/wipe'
import { useCloudRights } from '../cloud/useCloudRights'
import { getClient } from '../cloud/client'
import { cloudErrorMessage, deleteCloudOrganization } from '../cloud/account'

const codeField = {
  type: 'password',
  inputMode: 'numeric' as const,
  autoComplete: 'off',
  maxLength: 8,
}

/** "App zurücksetzen": protected by a reset code set on this device. */
export function ResetCard() {
  const [hasCode, setHasCode] = useState<boolean>()
  useEffect(() => {
    void hasResetCode(db).then(setHasCode)
  }, [])

  return (
    <Card title="App zurücksetzen">
      {hasCode === undefined ? (
        <p>Lädt …</p>
      ) : hasCode ? (
        <ResetActions onCodeChanged={() => setHasCode(true)} />
      ) : (
        <SetCode onSaved={() => setHasCode(true)} />
      )}
    </Card>
  )
}

function SetCode({ onSaved, needOld }: { onSaved: () => void; needOld?: boolean }) {
  const [old, setOld] = useState('')
  const [code, setCode] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setError(undefined)
    const invalid = validResetCode(code)
    if (invalid) return setError(invalid)
    if (code !== again) return setError('Die beiden Codes stimmen nicht überein.')
    setBusy(true)
    try {
      if (needOld) {
        const r = await checkResetCode(db, old)
        if (!r.ok) return setError(resetCodeMessage(r))
      }
      await setResetCode(db, code)
      setOld('')
      setCode('')
      setAgain('')
      onSaved()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
    >
      {!needOld && (
        <p className="text-stone-700 dark:text-stone-300">
          Lege einen Reset-Code fest (6 bis 8 Ziffern). Nur wer ihn kennt, kann die App auf diesem
          Gerät zurücksetzen – z. B. damit auf Firmengeräten niemand versehentlich alles löscht.
        </p>
      )}
      {needOld && (
        <TextField
          label="Bisheriger Reset-Code"
          {...codeField}
          value={old}
          onChange={(e) => setOld(e.target.value)}
        />
      )}
      <TextField
        label={needOld ? 'Neuer Reset-Code' : 'Reset-Code'}
        {...codeField}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <TextField
        label="Reset-Code wiederholen"
        {...codeField}
        value={again}
        onChange={(e) => setAgain(e.target.value)}
      />
      {error && (
        <p role="alert" className="font-semibold text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={busy}>
        {needOld ? 'Code ändern' : 'Reset-Code festlegen'}
      </Button>
    </form>
  )
}

function ResetActions({ onCodeChanged }: { onCodeChanged: () => void }) {
  const org = useOrganization()
  const online = useOnlineStatus()
  const rights = useCloudRights()
  const [mode, setMode] = useState<'device' | 'cloud'>()
  const [code, setCode] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [changed, setChanged] = useState(false)
  const cloudOwner = rights.cloud && rights.isOwner

  const run = async () => {
    setError(undefined)
    if (!understood) return setError('Bitte bestätigen, dass die Daten gelöscht werden.')
    if (mode === 'cloud' && companyName.trim() !== (org?.name ?? '').trim())
      return setError('Der Firmenname stimmt nicht.')
    setBusy(true)
    try {
      const r = await checkResetCode(db, code)
      if (!r.ok) return setError(resetCodeMessage(r))
      if (mode === 'cloud') {
        if (!org) return
        await deleteCloudOrganization(await getClient(), org.id)
      }
      await wipeDevice(db)
      window.location.replace('/')
    } catch (e) {
      setError(cloudErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const start = (m: 'device' | 'cloud') => {
    setMode(m)
    setCode('')
    setUnderstood(false)
    setCompanyName('')
    setError(undefined)
  }

  return (
    <div className="space-y-4">
      {!mode && (
        <div className="space-y-3">
          <Button
            variant="secondary"
            className="w-full text-red-700 dark:text-red-400"
            onClick={() => start('device')}
          >
            Dieses Gerät zurücksetzen
          </Button>
          {cloudOwner && (
            <Button
              variant="secondary"
              className="w-full text-red-700 dark:text-red-400"
              onClick={() => start('cloud')}
            >
              Firmen-Kartei in der Cloud löschen
            </Button>
          )}
        </div>
      )}

      {mode && (
        <form
          className="space-y-3 rounded-xl border-2 border-red-700 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            void run()
          }}
        >
          {mode === 'device' ? (
            <Notice level="danger">
              Alle Daten auf diesem Gerät werden gelöscht: Protokolle, Profile, Fotos,
              Unterschriften, Einstellungen und die Anmeldung.{' '}
              {rights.cloud
                ? 'Was schon mit der Firmen-Kartei abgeglichen ist, kommt nach erneuter Anmeldung wieder – noch nicht abgeglichene Änderungen gehen verloren.'
                : 'Ohne Backup sind sie unwiederbringlich verloren.'}
            </Notice>
          ) : (
            <Notice level="danger">
              Die ganze Firma wird aus der Cloud gelöscht – für alle Geräte und Mitglieder:
              Protokolle, Profile, Kunden, Fotos und alle Zugänge. Danach wird auch dieses Gerät
              zurückgesetzt. Das kann nicht rückgängig gemacht werden.
            </Notice>
          )}
          {mode === 'cloud' && (
            <TextField
              label={`Zur Bestätigung den Firmennamen eingeben: ${org?.name ?? ''}`}
              autoComplete="off"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          )}
          <TextField
            label="Reset-Code"
            {...codeField}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Toggle
            label={
              mode === 'device'
                ? 'Mir ist klar, dass alle Daten auf diesem Gerät gelöscht werden.'
                : 'Mir ist klar, dass die Firma für alle unwiderruflich gelöscht wird.'
            }
            checked={understood}
            onChange={setUnderstood}
          />
          {mode === 'cloud' && !online && (
            <Notice level="info">
              Zum Löschen in der Cloud wird eine Internetverbindung benötigt.
            </Notice>
          )}
          {error && (
            <p role="alert" className="font-semibold text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={busy || code.length < 6 || (mode === 'cloud' && !online)}
              className="bg-red-700 hover:bg-red-600"
            >
              {busy
                ? 'Löscht …'
                : mode === 'device'
                  ? 'Gerät jetzt zurücksetzen'
                  : 'Firma endgültig löschen'}
            </Button>
            <Button variant="secondary" onClick={() => setMode(undefined)}>
              Abbrechen
            </Button>
          </div>
        </form>
      )}

      <details>
        <summary className="min-h-12 cursor-pointer py-3 font-semibold text-brand-700 dark:text-brand-300">
          Reset-Code ändern
        </summary>
        {changed && (
          <p role="status" className="mb-2 font-semibold text-brand-700 dark:text-brand-300">
            ✓ Neuer Reset-Code gespeichert
          </p>
        )}
        <SetCode
          needOld
          onSaved={() => {
            setChanged(true)
            onCodeChanged()
          }}
        />
      </details>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Code vergessen? Dann lässt sich die App nur noch über die Geräte-Einstellungen löschen (App
        entfernen bzw. Website-Daten löschen).
      </p>
    </div>
  )
}
