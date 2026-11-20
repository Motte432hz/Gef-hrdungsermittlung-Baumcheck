import { setPref, usePref } from '../lib/devicePrefs'
import { Toggle } from './form/Field'

export function SunToggle() {
  const sun = usePref('sun')
  return (
    <Toggle
      label="☀️ Sonnenmodus"
      hint="Größere Schrift und mehr Kontrast für draußen bei Sonne."
      checked={sun}
      onChange={(on) => setPref('sun', on)}
    />
  )
}

export function VibrateToggle() {
  const on = usePref('vibrate')
  return (
    <Toggle
      label="Vibration bei Antworten"
      hint="Kurzes Vibrieren als Rückmeldung, länger bei Gefahren (nur Android)."
      checked={on}
      onChange={(v) => setPref('vibrate', v)}
    />
  )
}
