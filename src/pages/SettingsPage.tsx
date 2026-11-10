import { useEffect, useState } from 'react'
import { Card, PageTitle } from '../components/Card'
import { setThemePreference, useThemePreference, type ThemePreference } from '../lib/theme'
import {
  formatBytes,
  getStorageStatus,
  requestPersistentStorage,
  type StorageStatus,
} from '../lib/storage'
import { Button } from '../components/Button'
import { TextField } from '../components/form/Field'
import { db } from '../db/db'
import { META_DEVICE_CODE } from '../db/repo'
import { normalizeCode } from '../domain/protocolNumber'
import { BackupCard } from './BackupCard'
import { ColorModeChooser } from './ColorModeChooser'

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Wie Gerät' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
]

export function SettingsPage() {
  const theme = useThemePreference()
  const [storage, setStorage] = useState<StorageStatus | null>(null)

  const [deviceCode, setDeviceCode] = useState<string>()
  const [deviceSaved, setDeviceSaved] = useState(false)

  useEffect(() => {
    void getStorageStatus().then(setStorage)
    void db.meta.get(META_DEVICE_CODE).then((m) => setDeviceCode((m?.value as string) ?? ''))
  }, [])

  const saveDeviceCode = async () => {
    const code = normalizeCode(deviceCode ?? '')
    setDeviceCode(code)
    if (code) await db.meta.put({ key: META_DEVICE_CODE, value: code })
    else await db.meta.delete(META_DEVICE_CODE)
    setDeviceSaved(true)
  }

  return (
    <div className="space-y-4">
      <PageTitle>Einstellungen</PageTitle>

      <Card title="Darstellung">
        <fieldset>
          <legend className="mb-2 font-semibold">Hell oder dunkel</legend>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((o) => (
              <label
                key={o.value}
                className="flex min-h-14 cursor-pointer items-center justify-center rounded-xl border-2 border-stone-300 font-semibold has-checked:border-brand-700 has-checked:bg-brand-700 has-checked:text-white has-focus-visible:outline-3 has-focus-visible:outline-brand-500 dark:border-stone-600"
              >
                <input
                  type="radio"
                  name="theme"
                  value={o.value}
                  checked={theme === o.value}
                  onChange={() => setThemePreference(o.value)}
                  className="sr-only"
                />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
        <ColorModeChooser />
      </Card>

      <Card title="Speicher auf diesem Gerät">
        {storage === null ? (
          <p>Wird geprüft …</p>
        ) : !storage.supported ? (
          <p>Dieser Browser gibt keine Speicherinformationen heraus.</p>
        ) : (
          <div className="space-y-3">
            <p data-testid="storage-persisted">
              {storage.persisted
                ? '✓ Daten sind dauerhaft gespeichert und werden vom Browser nicht automatisch gelöscht.'
                : '⚠ Der Browser darf die Daten bei Speichermangel löschen. Installiere die App auf dem Startbildschirm und mache regelmäßig Backups.'}
            </p>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Belegt: {formatBytes(storage.usageBytes)} von {formatBytes(storage.quotaBytes)}
            </p>
            {!storage.persisted && (
              <Button
                variant="secondary"
                onClick={() =>
                  void requestPersistentStorage().then(() => getStorageStatus().then(setStorage))
                }
              >
                Dauerhaften Speicher anfordern
              </Button>
            )}
          </div>
        )}
      </Card>

      <BackupCard />

      <Card title="Dieses Gerät">
        {deviceCode === undefined ? (
          <p>Lädt …</p>
        ) : (
          <div className="space-y-3">
            <TextField
              label="Gerätekürzel (optional)"
              hint="Nur nötig, wenn mehrere Geräte ohne Cloud Protokolle erstellen. Dann bekommt jedes Gerät eigene Nummern, z. B. T2 → ZW-2026-T2-001."
              value={deviceCode}
              maxLength={6}
              autoCapitalize="characters"
              onChange={(e) => {
                setDeviceCode(e.target.value)
                setDeviceSaved(false)
              }}
            />
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => void saveDeviceCode()}>
                Kürzel speichern
              </Button>
              <span role="status" className="font-semibold text-brand-700 dark:text-brand-300">
                {deviceSaved ? '✓ Gespeichert' : ''}
              </span>
            </div>
          </div>
        )}
      </Card>

      <Card title="Über">
        <p className="text-stone-700 dark:text-stone-300">BaumCheck, Version {__APP_VERSION__}</p>
        <p className="text-stone-700 dark:text-stone-300" data-testid="build-info">
          Stand:{' '}
          {new Date(__BUILD_TIME__).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          Uhr{__BUILD_COMMIT__ && ` · ${__BUILD_COMMIT__}`}
        </p>
      </Card>
    </div>
  )
}
