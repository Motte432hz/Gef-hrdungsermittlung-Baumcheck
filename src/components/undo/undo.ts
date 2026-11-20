import { createContext, useContext } from 'react'

export interface UndoOffer {
  message: string
  undo: () => Promise<void> | void
}

export const UndoContext = createContext<(offer: UndoOffer) => void>(() => {})

/** Offers "Rückgängig" for a few seconds after an action that changed several things at once. */
export function useOfferUndo() {
  return useContext(UndoContext)
}

export const UNDO_SECONDS = 8
