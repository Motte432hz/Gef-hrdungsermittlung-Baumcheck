/** DOM id of a form item, used to jump to it from the summary. */
export const itemAnchor = (itemId: string, treeId?: string) =>
  `item-${treeId ? `${treeId}-` : ''}${itemId.replace(/\./g, '-')}`
