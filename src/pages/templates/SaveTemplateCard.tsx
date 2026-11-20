import { useState } from 'react'
import { db } from '../../db/db'
import { saveJobTemplate, templateFromAssessment } from '../../db/templates'
import { useCloudRights } from '../../cloud/useCloudRights'
import { Card } from '../../components/Card'
import { Button } from '../../components/Button'
import { TextField } from '../../components/form/Field'
import type { Assessment } from '../../domain/types'
import { JOB_TYPE_LABELS, templateSummary } from './templateText'

/** Saves job types, planned work, team and equipment of an assessment as a named template. */
export function SaveTemplateCard({ assessment }: { assessment: Assessment }) {
  const { isAdmin } = useCloudRights()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [saved, setSaved] = useState<string>()
  const preview = templateFromAssessment(assessment, name || 'Vorlage')

  const save = async () => {
    if (!name.trim()) return
    await saveJobTemplate(db, assessment.organizationId, templateFromAssessment(assessment, name))
    setSaved(name.trim())
    setName('')
    setOpen(false)
  }

  return (
    <Card title="Als Einsatz-Vorlage speichern">
      <p className="mb-3 text-stone-700 dark:text-stone-300">
        Für Einsätze, die oft gleich ablaufen: Einsatzart, geplante Arbeiten, Team mit Rollen und
        geprüfte Ausrüstung werden gespeichert. Prüfpunkte und Gefahren nie.
      </p>
      {!isAdmin ? (
        <p className="text-stone-600 dark:text-stone-400">
          Vorlagen gehören zu den Firmendaten und können nur von Admins angelegt werden.
        </p>
      ) : open ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <TextField
            label="Name der Vorlage"
            placeholder="z. B. Kronenpflege SKT Standard"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {templateSummary(preview, JOB_TYPE_LABELS)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!name.trim()}>
              Vorlage speichern
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Vorlage anlegen …
        </Button>
      )}
      {saved && (
        <p role="status" className="mt-3 font-semibold text-brand-700 dark:text-brand-300">
          ✓ Vorlage „{saved}“ gespeichert. Sie steht auf der Startseite zur Auswahl.
        </p>
      )}
    </Card>
  )
}
