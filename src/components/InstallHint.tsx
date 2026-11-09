import { detectPlatform, isStandalone } from '../lib/install'
import { Card } from './Card'

const hints: Record<ReturnType<typeof detectPlatform>, string> = {
  ios: 'In Safari unten auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen. Nur so bleiben die Daten auf dem iPhone/iPad dauerhaft gespeichert.',
  android: 'Im Chrome-Menü (⋮) „App installieren“ bzw. „Zum Startbildschirm hinzufügen“ wählen.',
  other: 'In Chrome oder Edge auf das Installieren-Symbol in der Adressleiste klicken.',
}

export function InstallHint() {
  if (isStandalone()) return null
  const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints)
  return (
    <Card title="App installieren">
      <p className="text-stone-700 dark:text-stone-300">{hints[platform]}</p>
    </Card>
  )
}
