import { useEffect, useRef, useState } from 'react'
import SignaturePad from 'signature_pad'
import { Button } from './Button'
import { useObjectUrl } from '../lib/useObjectUrl'
import { toStoredFile } from '../lib/storedFile'
import type { StoredFile } from '../domain/types'

/**
 * Signature capture. The canvas is always white with black ink, so the image looks the same
 * in dark mode and in the (black and white printable) PDF.
 */
export function SignatureField({
  label,
  value,
  onChange,
}: {
  label: string
  value: StoredFile | undefined
  onChange: (file: StoredFile | undefined) => void
}) {
  const [editing, setEditing] = useState(!value)
  const url = useObjectUrl(value)

  if (value && !editing) {
    return (
      <div className="space-y-2">
        <p className="font-semibold">{label}</p>
        <img
          src={url}
          alt={`${label} (gespeichert)`}
          className="h-32 w-full rounded-xl border-2 border-stone-300 bg-white object-contain dark:border-stone-600"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Neu unterschreiben
          </Button>
          <Button variant="secondary" onClick={() => onChange(undefined)}>
            Entfernen
          </Button>
        </div>
      </div>
    )
  }

  return (
    <SignatureCanvas
      label={label}
      onDone={(blob) => {
        void toStoredFile(blob, 'image/png').then((file) => {
          onChange(file)
          setEditing(false)
        })
      }}
      onCancel={value ? () => setEditing(false) : undefined}
    />
  )
}

function SignatureCanvas({
  label,
  onDone,
  onCancel,
}: {
  label: string
  onDone: (blob: Blob) => void
  onCancel?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePad | null>(null)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const pad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255,255,255)',
      penColor: 'rgb(0,0,0)',
      minWidth: 1,
      maxWidth: 3,
    })
    padRef.current = pad
    const onEnd = () => setEmpty(pad.isEmpty())
    pad.addEventListener('endStroke', onEnd)

    // Match the canvas resolution to its displayed size (sharp on high-DPI screens).
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const data = pad.toData()
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d')?.scale(ratio, ratio)
      pad.clear()
      pad.fromData(data)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => {
      ro.disconnect()
      pad.removeEventListener('endStroke', onEnd)
      pad.off()
    }
  }, [])

  const clear = () => {
    padRef.current?.clear()
    setEmpty(true)
  }

  const done = () => {
    canvasRef.current?.toBlob((b) => b && onDone(b), 'image/png')
  }

  return (
    <div className="space-y-2">
      <p className="font-semibold" id="sig-label">
        {label}
      </p>
      <canvas
        ref={canvasRef}
        aria-label={`${label}: Unterschriftenfeld`}
        role="img"
        className="h-44 w-full touch-none rounded-xl border-2 border-dashed border-stone-400 bg-white md:h-56"
      />
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Mit dem Finger oder Stift im weißen Feld unterschreiben.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={done} disabled={empty}>
          Unterschrift übernehmen
        </Button>
        <Button variant="secondary" onClick={clear} disabled={empty}>
          Löschen
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
        )}
      </div>
    </div>
  )
}
