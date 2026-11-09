import { useNavigate, useSearchParams } from 'react-router'
import type { FormStep } from '../../form/schema'
import { isItemVisible, makeLookup } from '../../form/validation'
import { getSpecies } from '../../form/species'
import { db } from '../../db/db'
import { addTree, removeTree } from '../../db/repo'
import { useWizard } from '../WizardContext'
import { ItemField } from '../ItemField'
import { TreeTabs } from './TreeTabs'
import { SpeciesHazards } from './SpeciesHazards'
import { treeLabel } from './treeLabel'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'

/** A per-tree step (basic data or assessment) for the tree selected via ?baum=. */
export function TreeStepView({ step }: { step: FormStep }) {
  const { assessment, trees } = useWizard()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const tree = trees.find((t) => t.id === params.get('baum')) ?? trees[0]

  if (!tree) {
    return (
      <Card>
        <p className="mb-3 text-stone-700 dark:text-stone-300">Noch kein Baum erfasst.</p>
        <Button
          className="min-h-14 w-full"
          onClick={() =>
            void addTree(db, assessment.id).then((t) =>
              navigate(`/einsatz/${assessment.id}/tree?baum=${t.id}`),
            )
          }
        >
          + Ersten Baum erfassen
        </Button>
      </Card>
    )
  }

  const lookup = makeLookup(assessment.answers, tree.answers)
  const speciesAnswer = tree.answers['tree.species']?.value
  const species = getSpecies(typeof speciesAnswer === 'string' ? speciesAnswer : undefined)

  const remove = async () => {
    if (!window.confirm(`${treeLabel(tree)} mit allen Angaben und Fotos entfernen?`)) return
    await removeTree(db, tree.id)
    navigate(`/einsatz/${assessment.id}/${step.id}`, { replace: true })
  }

  return (
    <div className="space-y-6">
      <TreeTabs stepId={step.id} currentTreeId={tree.id} />
      <h2 className="text-2xl font-bold">{treeLabel(tree)}</h2>
      {step.id === 'treeAssessment' && species && <SpeciesHazards species={species} compact />}
      {step.sections.map((section) => {
        const items = section.items.filter((i) => isItemVisible(i, lookup))
        if (items.length === 0) return null
        return (
          <section key={section.id} className="space-y-3">
            {section.title && <h3 className="text-xl font-bold">{section.title}</h3>}
            {items.map((item) => (
              // Keyed by tree: switching trees remounts inputs with that tree's values.
              <ItemField key={`${tree.id}-${item.id}`} item={item} treeId={tree.id} />
            ))}
          </section>
        )
      })}
      {step.id === 'tree' && (
        <Button
          variant="secondary"
          className="w-full text-red-700 dark:text-red-400"
          onClick={() => void remove()}
        >
          {treeLabel(tree)} entfernen
        </Button>
      )}
    </div>
  )
}
