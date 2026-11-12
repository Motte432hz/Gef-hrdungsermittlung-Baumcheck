import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { Attachment } from '../../domain/types'
import { db } from '../../db/db'
import { markPhoto, restoreOriginalPhoto } from '../../db/repo'
import { toStoredFile } from '../../lib/storedFile'
import { useObjectUrl } from '../../lib/useObjectUrl'
import { drawMarks, isVisible, toImage, type Mark, type Tool } from '../../lib/marks'
import { Button } from '../../components/Button'

const TOOLS: { tool: Tool; label: string; icon: string }[] = [
  { tool: 'arrow', label: 'Pfeil', icon: '↗' },
  { tool: 'circle', label: 'Kreis', icon: '◯' },
  { tool: 'free', label: 'Freihand', icon: '✎' },
]

/** Full-screen editor: draw red arrows, circles and lines on a tree photo. */
export function PhotoEditor({
  photo,
  n,
  onClose,
}: {
  photo: Attachment
  n: number
  onClose: () => void
}) {
  const url = useObjectUrl(photo.file)
  const canvas = useRef<HTMLCanvasElement>(null)
  const image = useRef<HTMLImageElement | null>(null)
  const [tool, setTool] = useState<Tool>('arrow')
  const [marks, setMarks] = useState<Mark[]>([])
  const drawing = useRef<Mark | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  const render = (extra?: Mark | null) => {
    const c = canvas.current
    const img = image.current
    if (!c || !img) return
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0, c.width, c.height)
    drawMarks(ctx, extra ? [...marks, extra] : marks, c.width)
  }

  useEffect(() => {
    if (!url) return
    const img = new Image()
    img.onload = () => {
      image.current = img
      const c = canvas.current
      if (!c) return
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      setReady(true)
    }
    img.src = url
  }, [url])

  useEffect(() => {
    if (ready) render()
  })

  const point = (e: PointerEvent<HTMLCanvasElement>) =>
    toImage(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect(), e.currentTarget)

  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = point(e)
    drawing.current =
      tool === 'free' ? { kind: 'free', points: [p] } : { kind: tool, from: p, to: p }
  }
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const m = drawing.current
    if (!m) return
    const p = point(e)
    drawing.current = m.kind === 'free' ? { ...m, points: [...m.points, p] } : { ...m, to: p }
    render(drawing.current)
  }
  const up = () => {
    const m = drawing.current
    drawing.current = null
    if (m && isVisible(m)) setMarks((list) => [...list, m])
    else render()
  }

  const save = async () => {
    const c = canvas.current
    if (!c || marks.length === 0) return onClose()
    setBusy(true)
    render()
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.88))
    if (blob) await markPhoto(db, photo.id, await toStoredFile(blob, 'image/jpeg'))
    setBusy(false)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${n} markieren`}
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
    >
      <div className="pt-safe flex flex-wrap items-center gap-2 p-2">
        <div role="group" aria-label="Werkzeug" className="flex gap-2">
          {TOOLS.map((t) => (
            <button
              key={t.tool}
              type="button"
              aria-pressed={tool === t.tool}
              onClick={() => setTool(t.tool)}
              className={`flex min-h-12 items-center gap-1 rounded-xl border-2 px-3 font-semibold ${
                tool === t.tool ? 'border-red-500 bg-red-600' : 'border-white/40'
              }`}
            >
              <span aria-hidden="true">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setMarks((l) => l.slice(0, -1))}
          disabled={marks.length === 0}
          className="min-h-12 rounded-xl border-2 border-white/40 px-3 font-semibold disabled:opacity-40"
        >
          ↶ Rückgängig
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-2">
        <canvas
          ref={canvas}
          aria-label="Foto zum Markieren"
          role="img"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          className="max-h-full max-w-full touch-none object-contain"
        />
      </div>
      <div className="pb-safe flex flex-wrap gap-2 p-2">
        <Button onClick={() => void save()} disabled={busy || !ready} className="flex-1">
          {busy ? 'Speichert …' : marks.length ? 'Markierungen speichern' : 'Fertig'}
        </Button>
        {photo.original && (
          <Button
            variant="secondary"
            onClick={() => void restoreOriginalPhoto(db, photo.id).then(onClose)}
          >
            Original wiederherstellen
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}
