import { useState } from 'react'
import { db } from '../../db/db'
import { deleteJobTemplate, renameJobTemplate } from '../../db/templates'
import { useOrganization } from '../../app/useOrganization'
import { useCloudRights } from '../../cloud/useCloudRights'
import { PageHeader } from '../../components/PageHeader'
import { EmptyState } from '../../components/ListLink'
import { ReadOnlyNotice } from '../../components/ReadOnlyNotice'
import { Button } from '../../components/Button'
import { TextField } from '../../components/form/Field'
import type { JobTemplate } from '../../domain/types'
import { templateSummary } from './templateText'

/** Einsatz-Vorlagen: rename and delete (templates are saved from a protocol). */
export function TemplatesPage() {
  const org = useOrganization()
  const { isAdmin } = useCloudRights()
  if (!org) return <p>Lädt …</p>
  const list = [...(org.jobTemplates ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return (
    <div className="space-y-4">
      <PageHeader title="Einsatz-Vorlagen" back="/profile" backLabel="Profile" />
      <p className="text-stone-700 dark:text-stone-300">
        Eine Vorlage startet einen neuen Einsatz mit Einsatzart, geplanten Arbeiten, Team und
        geprüfter Ausrüstung. Anlegen: im letzten Schritt eines Einsatzes oder bei einem
        abgeschlossenen Protokoll „Vorlage anlegen …“.
      </p>
      {!isAdmin && <ReadOnlyNotice text="Vorlagen können nur Admins der Firma ändern." />}
      {list.length === 0 ? (
        <EmptyState>Noch keine Vorlagen.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.map((t) => (
            <TemplateRow key={t.id} orgId={org.id} template={t} canEdit={isAdmin} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TemplateRow({
  orgId,
  template,
  canEdit,
}: {
  orgId: string
  template: JobTemplate
  canEdit: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(template.name)
  return (
    <li
      aria-label={`Vorlage ${template.name}`}
      className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
    >
      {editing ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            void renameJobTemplate(db, orgId, template.id, name).then(() => setEditing(false))
          }}
        >
          <TextField
            label="Name der Vorlage"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={!name.trim()}>
              Speichern
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              Abbrechen
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-lg font-semibold">{template.name}</p>
          <p className="text-sm text-stone-600 dark:text-stone-400">{templateSummary(template)}</p>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Umbenennen
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (window.confirm(`Vorlage „${template.name}“ löschen?`))
                    void deleteJobTemplate(db, orgId, template.id)
                }}
              >
                Löschen
              </Button>
            </div>
          )}
        </>
      )}
    </li>
  )
}
