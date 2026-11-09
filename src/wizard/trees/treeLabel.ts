import type { Tree } from '../../domain/types'
import { getSpecies, OTHER_SPECIES } from '../../form/species'

/** "Baum 2 · Berg-Ahorn" (species or tree number if known). */
export function treeLabel(tree: Pick<Tree, 'index' | 'answers'>): string {
  const a = tree.answers['tree.species']
  const name =
    a?.value === OTHER_SPECIES
      ? a.otherText?.trim()
      : getSpecies(typeof a?.value === 'string' ? a.value : undefined)?.de
  const number = tree.answers['tree.number']?.value
  const extra = [
    typeof number === 'string' && number.trim() ? `Nr. ${number.trim()}` : undefined,
    name,
  ]
    .filter(Boolean)
    .join(' · ')
  return `Baum ${tree.index + 1}${extra ? ` · ${extra}` : ''}`
}
