import { useNavigate, useSearchParams } from 'react-router'
import type { FormStep } from '../../form/schema'
import { confirmed, makeLookup } from '../../form/validation'
import { getSpecies } from '../../form/species'
import { db } from '../../db/db'
import { addTree, removeTree } from '../../db/repo'
import { useWizard } from '../WizardContext'
import { SectionView } from '../SectionView'
import { TreeTabs } from './TreeTabs'
import { SpeciesHazards } from './SpeciesHazards'
import { treeLabel } from './treeLabel'
import { addTreeLike } from './copyTree'
import type { Answer } from '../../domain/types'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'

/** A per-tree step (basic data or assessment) for the tree selected via ?baum=. */
export function TreeStepView({ step }: { step: FormStep }) {
  const { assessment, trees, definition, setAnswers } = useWizard()
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

  // Answers copied from another tree that still need a look at this tree.
  const stepIds = new Set(
    step.sections.flatMap((s) => [...(s.gate ? [s.gate.id] : []), ...s.items.map((i) => i.id)]),
  )
  const prefilled = Object.entries(tree.answers).filter(([id, a]) => stepIds.has(id) && a.prefilled)
  const confirmAll = () => {
    const changes: Record<string, Answer> = {}
    for (const [id, a] of prefilled) changes[id] = confirmed(a)
    void setAnswers(changes, tree.id)
  }
  const addLike = async () => {
    const t = await addTreeLike(db, definition, tree)
    navigate(`/einsatz/${assessment.id}/tree?baum=${t.id}`)
  }

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
      {prefilled.length > 0 && (
        <Card>
          <p className="mb-3">
            {prefilled.length} {prefilled.length === 1 ? 'Angabe wurde' : 'Angaben wurden'} von{' '}
            {prefilled[0]![1].prefilledFrom ?? 'einem anderen Baum'} übernommen. Prüfe sie an diesem
            Baum und bestätige oder ändere sie.
          </p>
          <Button variant="secondary" onClick={confirmAll}>
            Alle übernommenen bestätigen
          </Button>
        </Card>
      )}
      {step.sections.map((section) => (
        <SectionView
          key={section.id}
          section={section}
          lookup={lookup}
          answers={tree.answers}
          treeId={tree.id}
          headingLevel={3}
        />
      ))}
      {step.id === 'treeAssessment' && (
        <Button variant="secondary" className="min-h-14 w-full" onClick={() => void addLike()}>
          + Weiterer Baum wie {treeLabel(tree).split(' · ')[0]}
        </Button>
      )}
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
