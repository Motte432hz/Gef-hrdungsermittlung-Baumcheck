/** Shown when the local database cannot be opened (e.g. storage blocked in private mode). */
export function StartupError() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-3 text-2xl font-bold">BaumCheck kann nicht starten</h1>
      <p className="mb-3">
        Die App kann auf diesem Gerät keine Daten speichern. Das passiert meist im privaten
        Browserfenster oder wenn Website-Daten blockiert sind.
      </p>
      <p>
        Bitte öffne die App in einem normalen Fenster oder installiere sie auf dem Startbildschirm.
      </p>
    </main>
  )
}
