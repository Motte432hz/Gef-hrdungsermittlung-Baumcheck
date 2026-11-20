import { useState } from 'react'
import { Sheet } from '../components/Sheet'
import { EmergencyCard } from './special/EmergencyCard'

/** Always within reach in the wizard: address, access and hospital for the emergency call. */
export function EmergencyButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Notfall"
        title="Notfall"
        className="flex size-12 shrink-0 items-center justify-center rounded-full bg-red-700 text-sm font-black text-white"
      >
        SOS
      </button>
      {open && (
        <Sheet title="Notfall" onClose={() => setOpen(false)}>
          <EmergencyCard large />
        </Sheet>
      )}
    </>
  )
}
