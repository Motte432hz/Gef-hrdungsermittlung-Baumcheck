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

const themeOptions: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Wie Gerät' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
]

export function SettingsPage() {
  const theme = useThemePreference()
  const [storage, setStorage] = useState<StorageStatus | null>(null)

  useEffect(() => {
    void getStorageStatus().then(setStorage)
  }, [])

  return (
    <div className="space-y-4">
      <PageTitle>Einstellungen</PageTitle>

      <Card title="Darstellung">
        <fieldset>
          <legend className="sr-only">Farbschema</legend>
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

      <Card title="Über">
        <p className="text-stone-700 dark:text-stone-300">BaumCheck, Version {__APP_VERSION__}</p>
      </Card>
    </div>
  )
}
