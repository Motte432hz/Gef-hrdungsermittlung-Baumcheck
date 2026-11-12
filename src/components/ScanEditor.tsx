import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { clampRect, defaultCrop, enhanceDocument, type Rect } from '../lib/scan'
import { toImage } from '../lib/marks'
import { Button } from './Button'
import { Toggle } from './form/Field'

const MAX_SIDE = 2200
type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'move'

/** Crop a photographed document and clean it up (contrast) before saving. */
export function ScanEditor({
  source,
  onSave,
  onCancel,
}: {
  source: Blob
  onSave: (jpeg: Blob) => void | Promise<void>
  onCancel: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const img = useRef<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState<Rect>()
  const [enhance, setEnhance] = useState(true)
  const [busy, setBusy] = useState(false)
  const drag = useRef<{ handle: Handle; start: { x: number; y: number }; rect: Rect } | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(source)
    const image = new Image()
    image.onload = () => {
      img.current = image
      const c = canvas.current!
      c.width = image.naturalWidth
      c.height = image.naturalHeight
      setCrop(defaultCrop(image.naturalWidth, image.naturalHeight))
    }
    image.src = url
    return () => URL.revokeObjectURL(url)
  }, [source])

  useEffect(() => {
    const c = canvas.current
    const image = img.current
    if (!c || !image || !crop) return
    const ctx = c.getContext('2d')!
    // Clear first: transparent images would otherwise show earlier drawings.
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.drawImage(image, 0, 0)
    // Darken everything outside the crop, frame and corner handles inside.
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, c.width, crop.y)
    ctx.fillRect(0, crop.y + crop.h, c.width, c.height - crop.y - crop.h)
    ctx.fillRect(0, crop.y, crop.x, crop.h)
    ctx.fillRect(crop.x + crop.w, crop.y, c.width - crop.x - crop.w, crop.h)
    const lw = Math.max(3, c.width / 250)
    ctx.strokeStyle = '#22c55e'
    ctx.lineWidth = lw
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h)
    const r = lw * 5
    ctx.fillStyle = '#22c55e'
    for (const [x, y] of [
      [crop.x, crop.y],
      [crop.x + crop.w, crop.y],
      [crop.x, crop.y + crop.h],
      [crop.x + crop.w, crop.y + crop.h],
    ]) {
      ctx.beginPath()
      ctx.arc(x!, y!, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [crop])

  const point = (e: PointerEvent<HTMLCanvasElement>) =>
    toImage(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect(), e.currentTarget)

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!crop) return
    const p = point(e)
    const c = e.currentTarget
    const near = (x: number, y: number) => Math.hypot(p.x - x, p.y - y) < c.width / 12
    const handle: Handle | null = near(crop.x, crop.y)
      ? 'tl'
      : near(crop.x + crop.w, crop.y)
        ? 'tr'
        : near(crop.x, crop.y + crop.h)
          ? 'bl'
          : near(crop.x + crop.w, crop.y + crop.h)
            ? 'br'
            : p.x > crop.x && p.x < crop.x + crop.w && p.y > crop.y && p.y < crop.y + crop.h
              ? 'move'
              : null
    if (!handle) return
    c.setPointerCapture(e.pointerId)
    drag.current = { handle, start: p, rect: crop }
  }
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current
    if (!d) return
    const p = point(e)
    const dx = p.x - d.start.x
    const dy = p.y - d.start.y
    const r = d.rect
    const next: Rect =
      d.handle === 'move'
        ? { ...r, x: r.x + dx, y: r.y + dy }
        : d.handle === 'tl'
          ? { x: r.x + dx, y: r.y + dy, w: r.w - dx, h: r.h - dy }
          : d.handle === 'tr'
            ? { x: r.x, y: r.y + dy, w: r.w + dx, h: r.h - dy }
            : d.handle === 'bl'
              ? { x: r.x + dx, y: r.y, w: r.w - dx, h: r.h + dy }
              : { x: r.x, y: r.y, w: r.w + dx, h: r.h + dy }
    setCrop(clampRect(next, e.currentTarget.width, e.currentTarget.height))
  }
  const up = () => {
    drag.current = null
  }

  const save = async () => {
    const image = img.current
    if (!image || !crop) return
    setBusy(true)
    const scale = Math.min(1, MAX_SIDE / Math.max(crop.w, crop.h))
    const out = document.createElement('canvas')
    out.width = Math.round(crop.w * scale)
    out.height = Math.round(crop.h * scale)
    const ctx = out.getContext('2d')!
    ctx.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height)
    if (enhance) {
      const data = ctx.getImageData(0, 0, out.width, out.height)
      enhanceDocument(data.data)
      ctx.putImageData(data, 0, 0)
    }
    const blob = await new Promise<Blob | null>((r) => out.toBlob(r, 'image/jpeg', 0.85))
    if (blob) await onSave(blob)
    setBusy(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dokument zuschneiden"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
    >
      <p className="pt-safe p-3 text-sm">
        Ecken auf die Kanten des Blatts ziehen. Der grüne Rahmen wird gespeichert.
      </p>
      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        <canvas
          ref={canvas}
          role="img"
          aria-label="Dokument mit Zuschnitt"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="max-h-full max-w-full touch-none object-contain"
        />
      </div>
      <div className="pb-safe space-y-2 p-3">
        <div className="rounded-xl bg-white p-2 text-stone-900">
          <Toggle
            label="Kontrast verbessern (Schwarz-Weiß)"
            checked={enhance}
            onChange={setEnhance}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => void save()} disabled={!crop || busy} className="flex-1">
            {busy ? 'Speichert …' : 'Übernehmen'}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  )
}
