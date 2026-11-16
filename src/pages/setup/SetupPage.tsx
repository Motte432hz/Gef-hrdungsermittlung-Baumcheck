import { useEffect, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { db } from '../../db/db'
import {
  getDefaultEquipmentPreset,
  listWorkers,
  saveDefaultEquipmentPreset,
  saveOrganization,
  saveWorker,
} from '../../db/profiles'
import { useOrganization } from '../../app/useOrganization'
import { useAutosave } from '../../components/useAutosave'
import { TextField } from '../../components/form/Field'
import { ChipGroup } from '../../components/form/ChipGroup'
import { Button } from '../../components/Button'
import { email, numberPrefix, postalCode, required } from '../../domain/validate'
import { resizeImage } from '../../lib/image'
import { formatProtocolNumber } from '../../domain/protocolNumber'
import { toStoredFile } from '../../lib/storedFile'
import { useObjectUrl } from '../../lib/useObjectUrl'
import { equipmentItems } from '../profiles/equipmentItems'
import { BackupCard } from '../BackupCard'
import { META_WELCOME_DISMISSED, usePracticeStart } from '../../help/practice'
import { META_SETUP_SELF, SETUP_STEPS, suggestPrefix, useSetupStatus } from '../../help/setup'
import {
  QUALIFICATIONS,
  QUALIFICATION_LABELS,
  type Organization,
  type QualificationType,
  type StoredFile,
} from '../../domain/types'

export function SetupPage() {
  const { step: stepId } = useParams()
  const navigate = useNavigate()
  const org = useOrganization()
  const index = SETUP_STEPS.findIndex((s) => s.id === stepId)

  // Once the assistant has been opened, the start page shows the checklist instead.
  useEffect(() => {
    void db.meta.put({ key: META_WELCOME_DISMISSED, value: true })
  }, [])

  if (!stepId) return <Navigate to="/einrichtung/firma" replace />
  if (index < 0) return <Navigate to="/einrichtung/firma" replace />
  const step = SETUP_STEPS[index]!
  const go = (i: number) => navigate(`/einrichtung/${SETUP_STEPS[i]!.id}`)
  const last = index === SETUP_STEPS.length - 1

  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col bg-stone-50 dark:bg-stone-950">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto flex min-h-14 max-w-2xl items-center gap-3 px-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Einrichtung · Schritt {index + 1} von {SETUP_STEPS.length}
            </p>
            <h1 className="truncate text-lg font-bold">{step.title}</h1>
          </div>
          {!last && (
            <Link
              to="/"
              className="min-h-12 content-center rounded-xl px-2 text-sm font-semibold text-brand-700 dark:text-brand-300"
            >
              Später weiter
            </Link>
          )}
        </div>
        <div className="h-1 bg-stone-200 dark:bg-stone-800">
          <div
            className="h-1 bg-accent-500 transition-all"
            style={{ width: `${((index + 1) / SETUP_STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 pt-4 pb-32">
        {!org ? (
          <p>Lädt …</p>
        ) : step.id === 'firma' ? (
          <CompanyStep key={org.id} org={org} />
        ) : step.id === 'ich' ? (
          <SelfStep orgId={org.id} />
        ) : step.id === 'team' ? (
          <TeamStep orgId={org.id} />
        ) : step.id === 'ausruestung' ? (
          <EquipmentStep orgId={org.id} />
        ) : step.id === 'sicherung' ? (
          <SafetyStep />
        ) : (
          <DoneStep />
        )}
      </main>

      {!last && (
        <nav
          aria-label="Einrichtung"
          className="pb-safe fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
        >
          <div className="mx-auto flex max-w-2xl gap-3 p-3">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              className="min-h-14 flex-1 rounded-xl border-2 border-stone-300 font-semibold disabled:opacity-40 dark:border-stone-600"
            >
              ‹ Zurück
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="min-h-14 flex-[2] rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-500"
            >
              Weiter ›
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}

function Intro({ children }: { children: ReactNode }) {
  return <p className="text-lg leading-relaxed text-stone-700 dark:text-stone-300">{children}</p>
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      {children}
    </section>
  )
}

function Saved({ state }: { state: string }) {
  return (
    <p role="status" className="min-h-6 text-sm font-semibold text-brand-700 dark:text-brand-300">
      {state === 'saving' ? 'Wird gespeichert …' : state === 'saved' ? '✓ Gespeichert' : ''}
    </p>
  )
}

// ── Step 1: company ────────────────────────────────────────────────────────

function CompanyStep({ org }: { org: Organization }) {
  const [form, setForm] = useState({
    name: org.name,
    numberPrefix: org.numberPrefix,
    street: org.street ?? '',
    postalCode: org.postalCode ?? '',
    city: org.city ?? '',
    phone: org.phone ?? '',
    email: org.email ?? '',
    logo: org.logo as StoredFile | undefined,
  })
  // The prefix follows the name until it is changed by hand.
  const [prefixTouched, setPrefixTouched] = useState(org.numberPrefix !== 'BC')
  const [logoError, setLogoError] = useState<string>()
  const logoUrl = useObjectUrl(form.logo)
  const errors = {
    name: form.name ? required(form.name, 'Firmenname') : undefined,
    numberPrefix: numberPrefix(form.numberPrefix),
    postalCode: postalCode(form.postalCode),
    email: email(form.email),
  }
  const valid = !Object.values(errors).some(Boolean)

  const state = useAutosave(
    form,
    (f) =>
      saveOrganization(db, org.id, {
        name: f.name.trim(),
        numberPrefix: f.numberPrefix.trim().toUpperCase(),
        street: f.street.trim() || undefined,
        postalCode: f.postalCode.trim() || undefined,
        city: f.city.trim() || undefined,
        phone: f.phone.trim() || undefined,
        email: f.email.trim() || undefined,
        logo: f.logo,
      }),
    { enabled: valid },
  )

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => {
      const next = { ...f, [key]: e.target.value }
      if (key === 'name' && !prefixTouched) next.numberPrefix = suggestPrefix(next.name) || 'BC'
      return next
    })

  const onLogo = async (file: File | undefined) => {
    setLogoError(undefined)
    if (!file) return
    try {
      const logo = await toStoredFile(await resizeImage(file, 800, 'image/png'), 'image/png')
      setForm((f) => ({ ...f, logo }))
    } catch {
      setLogoError('Das Bild konnte nicht gelesen werden. Bitte PNG, JPG oder SVG verwenden.')
    }
  }

  return (
    <>
      <Intro>
        Diese Angaben stehen oben auf jedem Protokoll. Alles wird sofort gespeichert und lässt sich
        später unter Profile → Firma ändern.
      </Intro>
      <Panel>
        <TextField
          label="Firmenname"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
        />
        <TextField
          label="Kürzel für Protokollnummern"
          hint={`Beispiel: ${formatProtocolNumber({ prefix: form.numberPrefix || 'ZW', year: new Date().getFullYear(), seq: 1 })}`}
          value={form.numberPrefix}
          maxLength={6}
          autoCapitalize="characters"
          onChange={(e) => {
            setPrefixTouched(true)
            set('numberPrefix')(e)
          }}
          error={errors.numberPrefix}
        />
        <TextField label="Telefon" type="tel" value={form.phone} onChange={set('phone')} />
        <TextField
          label="E-Mail"
          type="email"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />
        <TextField label="Straße und Hausnummer" value={form.street} onChange={set('street')} />
        <div className="grid grid-cols-[7rem_1fr] gap-3">
          <TextField
            label="PLZ"
            inputMode="numeric"
            value={form.postalCode}
            onChange={set('postalCode')}
            error={errors.postalCode}
          />
          <TextField label="Ort" value={form.city} onChange={set('city')} />
        </div>
      </Panel>
      <Panel>
        <h2 className="text-lg font-bold">Logo</h2>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Firmenlogo"
            className="max-h-24 max-w-full rounded-lg bg-white object-contain p-2"
          />
        ) : (
          <p className="text-stone-600 dark:text-stone-400">Noch kein Logo. Geht auch später.</p>
        )}
        <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl border-2 border-stone-300 px-4 font-semibold dark:border-stone-600">
          {logoUrl ? 'Anderes Logo wählen' : 'Logo auswählen'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void onLogo(e.target.files?.[0])}
          />
        </label>
        {logoError && <p className="font-semibold text-red-700 dark:text-red-400">{logoError}</p>}
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Farben und PDF-Layout kannst du später unter Profile → Firma anpassen.
        </p>
      </Panel>
      <Saved state={state} />
    </>
  )
}

// ── Step 2: yourself ───────────────────────────────────────────────────────

const qualificationOptions = QUALIFICATIONS.map((q) => ({
  value: q,
  label: QUALIFICATION_LABELS[q],
}))

function SelfStep({ orgId }: { orgId: string }) {
  // Loaded once; the form keeps its own state while the profile is being saved.
  const [initial, setInitial] = useState<{
    id?: string
    name: string
    quals: QualificationType[]
  }>()
  useEffect(() => {
    void (async () => {
      const id = (await db.meta.get(META_SETUP_SELF))?.value as string | undefined
      const self = id ? await db.workers.get(id) : undefined
      setInitial({
        id: self?.id,
        name: self?.name ?? '',
        quals: self?.qualifications.map((q) => q.type) ?? [],
      })
    })()
  }, [])
  if (!initial) return <p>Lädt …</p>
  return <SelfForm orgId={orgId} initial={initial} />
}

function SelfForm({
  orgId,
  initial,
}: {
  orgId: string
  initial: { id?: string; name: string; quals: QualificationType[] }
}) {
  const [form, setForm] = useState(initial)
  const state = useAutosave(
    form,
    async (f) => {
      const existing = f.id ? await db.workers.get(f.id) : undefined
      const id = await saveWorker(
        db,
        orgId,
        {
          kind: 'employee',
          name: f.name.trim(),
          nickname: existing?.nickname,
          phone: existing?.phone,
          gear: existing?.gear,
          signature: existing?.signature,
          active: true,
          // Expiry dates entered elsewhere are kept.
          qualifications: f.quals.map(
            (type) => existing?.qualifications.find((q) => q.type === type) ?? { type },
          ),
        },
        f.id,
      )
      if (!f.id) {
        await db.meta.put({ key: META_SETUP_SELF, value: id })
        setForm((x) => ({ ...x, id }))
      }
    },
    { enabled: !!form.name.trim() },
  )
  return (
    <>
      <Intro>
        Lege dein eigenes Profil an. Im Einsatz wählst du dich dann als Aufsicht oder Teammitglied
        mit einem Tipp aus.
      </Intro>
      <Panel>
        <TextField
          label="Dein Name"
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <ChipGroup
          legend="Deine Qualifikationen"
          hint="Gültigkeitsdaten der Nachweise kannst du später unter Team & Partner eintragen."
          options={qualificationOptions}
          value={form.quals}
          onChange={(quals) => setForm((f) => ({ ...f, quals }))}
        />
      </Panel>
      <Saved state={state} />
    </>
  )
}

// ── Step 3: team ───────────────────────────────────────────────────────────

function TeamStep({ orgId }: { orgId: string }) {
  const people = useLiveQuery(() => listWorkers(db, orgId, 'employee'), [orgId])
  const [name, setName] = useState('')
  const [quals, setQuals] = useState<QualificationType[]>([])
  const [busy, setBusy] = useState(false)

  const add = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    await saveWorker(db, orgId, {
      kind: 'employee',
      name: name.trim(),
      qualifications: quals.map((type) => ({ type })),
      active: true,
    })
    setName('')
    setQuals([])
    setBusy(false)
  }

  return (
    <>
      <Intro>
        Wer arbeitet regelmäßig mit? Name und Qualifikationen reichen – alles Weitere später.
      </Intro>
      {people && people.length > 0 && (
        <Panel>
          <h2 className="text-lg font-bold">Im Team ({people.length})</h2>
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {people.map((p) => (
              <li key={p.id} className="py-2">
                <span className="block font-semibold">{p.name}</span>
                <span className="block text-sm text-stone-600 dark:text-stone-400">
                  {p.qualifications.map((q) => QUALIFICATION_LABELS[q.type]).join(' · ') ||
                    'keine Qualifikation eingetragen'}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Panel>
        <h2 className="text-lg font-bold">Person hinzufügen</h2>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <ChipGroup
            legend="Qualifikationen"
            options={qualificationOptions}
            value={quals}
            onChange={setQuals}
          />
          <Button type="submit" disabled={!name.trim() || busy}>
            + Hinzufügen
          </Button>
        </form>
      </Panel>
      <p className="text-stone-700 dark:text-stone-300">
        Subunternehmer, Ablaufdaten von Nachweisen und gespeicherte Unterschriften: unter{' '}
        <Link to="/profile/team" className="font-semibold underline">
          Team & Partner
        </Link>
        .
      </p>
    </>
  )
}

// ── Step 4: equipment ──────────────────────────────────────────────────────

function EquipmentStep({ orgId }: { orgId: string }) {
  const preset = useLiveQuery(() => getDefaultEquipmentPreset(db, orgId), [orgId])
  const count = Object.keys(preset?.answers ?? {}).length
  const allYes = () =>
    saveDefaultEquipmentPreset(
      db,
      orgId,
      Object.fromEntries(equipmentItems.map((i) => [i.id, 'yes'])),
    )
  return (
    <>
      <Intro>
        Was habt ihr immer dabei und regelmäßig geprüft? Diese Punkte sind dann in jedem Einsatz
        vorbelegt und müssen vor Ort nur noch bestätigt werden.
      </Intro>
      <Panel>
        <p>
          {count > 0 ? <strong>✓ {count} Punkte sind vorbelegt.</strong> : 'Noch nichts vorbelegt.'}
        </p>
        <Button onClick={() => void allYes()} className="w-full">
          Alles mit „Ja“ vorbelegen
        </Button>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          PSA, Kletter- und Abseilausrüstung, Maschinen, Funk, Absperrmaterial, Erste Hilfe und
          Rettung. Die Aufsicht bestätigt vor Ort, dass es stimmt.
        </p>
        <Link
          to="/profile/ausruestung"
          className="inline-flex min-h-12 items-center rounded-xl border-2 border-stone-300 px-4 font-semibold dark:border-stone-600"
        >
          Einzeln festlegen ›
        </Link>
      </Panel>
    </>
  )
}

// ── Step 5: keep the data safe ─────────────────────────────────────────────

function SafetyStep() {
  return (
    <>
      <Intro>
        Ohne Cloud liegen alle Protokolle nur auf diesem Gerät. Geht es verloren, sind sie weg.
        Wähle, was zu euch passt:
      </Intro>
      <Panel>
        <h2 className="text-lg font-bold">Mehrere Geräte oder Büro</h2>
        <p>
          Mit der Firmen-Kartei (Cloud) teilen alle Geräte Profile und Protokolle. Fertige PDFs
          gehen automatisch per E-Mail ans Büro. Kollegen treten mit einem Einladungs-Code bei.
        </p>
        <Link
          to="/profile/firma/cloud"
          className="inline-flex min-h-12 items-center rounded-xl bg-brand-700 px-4 font-semibold text-white"
        >
          Firmen-Kartei einrichten ›
        </Link>
      </Panel>
      <h2 className="pt-2 text-lg font-bold">Nur dieses Gerät</h2>
      <BackupCard />
    </>
  )
}

// ── Step 6: done ───────────────────────────────────────────────────────────

function DoneStep() {
  const status = useSetupStatus()
  const practice = usePracticeStart()
  return (
    <>
      <div className="py-4 text-center">
        <p aria-hidden="true" className="text-6xl">
          🎉
        </p>
        <h2 className="mt-2 text-2xl font-bold">Gut gemacht!</h2>
        <p className="mt-2 text-lg text-stone-700 dark:text-stone-300">
          Am besten spielst du jetzt einmal einen Übungseinsatz durch. Er bekommt keine Nummer und
          kommt nicht ins Archiv.
        </p>
      </div>
      {status && (
        <Panel>
          <h3 className="font-bold">
            Einrichtung: {status.done} von {status.items.length} erledigt
          </h3>
          <ul className="space-y-1">
            {status.items.map((i) => (
              <li key={i.id} className="flex gap-2">
                <span aria-hidden="true">{i.done ? '✓' : '○'}</span>
                <span className={i.done ? '' : 'text-stone-600 dark:text-stone-400'}>
                  {i.title}
                  {!i.done && ' – noch offen'}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Offene Punkte findest du auf der Startseite in der Checkliste.
          </p>
        </Panel>
      )}
      <div className="space-y-3">
        <Button
          className="min-h-16 w-full text-lg"
          onClick={() => void practice.start()}
          disabled={practice.busy}
        >
          🎓 Übungseinsatz starten
        </Button>
        <Link
          to="/hilfe/rundgang"
          className="flex min-h-14 w-full items-center justify-center rounded-xl border-2 border-stone-300 font-semibold dark:border-stone-600"
        >
          Rundgang ansehen
        </Link>
        <Link
          to="/"
          className="flex min-h-14 w-full items-center justify-center rounded-xl border-2 border-stone-300 font-semibold dark:border-stone-600"
        >
          Zur Startseite
        </Link>
      </div>
    </>
  )
}
