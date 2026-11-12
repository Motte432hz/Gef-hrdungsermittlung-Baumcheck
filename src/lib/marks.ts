/** Marks drawn on photos (in image pixels): free line, arrow and circle/ellipse. */
export interface Point {
  x: number
  y: number
}
export type Mark =
  | { kind: 'free'; points: Point[] }
  | { kind: 'arrow'; from: Point; to: Point }
  | { kind: 'circle'; from: Point; to: Point }
export type Tool = Mark['kind']

export const MARK_COLOR = '#e00000'

/** Line width relative to the photo, so marks look the same on any resolution. */
export const lineWidth = (imageWidth: number) => Math.max(4, Math.round(imageWidth / 160))

/** The two short lines of an arrow head at `to`. */
export function arrowHead(from: Point, to: Point, size: number): [Point, Point] {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  const spread = Math.PI / 7
  return [
    { x: to.x - size * Math.cos(angle - spread), y: to.y - size * Math.sin(angle - spread) },
    { x: to.x - size * Math.cos(angle + spread), y: to.y - size * Math.sin(angle + spread) },
  ]
}

/** Ignore taps: a mark needs some length. */
export function isVisible(m: Mark, min = 6): boolean {
  if (m.kind === 'free') return m.points.length > 1
  return Math.hypot(m.to.x - m.from.x, m.to.y - m.from.y) >= min
}

/** Client (screen) coordinates → image pixels of a canvas shown scaled. */
export function toImage(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  canvas: { width: number; height: number },
): Point {
  return {
    x: ((clientX - rect.left) * canvas.width) / rect.width,
    y: ((clientY - rect.top) * canvas.height) / rect.height,
  }
}

export function drawMarks(ctx: CanvasRenderingContext2D, marks: Mark[], width: number) {
  const w = lineWidth(width)
  ctx.save()
  ctx.strokeStyle = MARK_COLOR
  ctx.lineWidth = w
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const m of marks) {
    ctx.beginPath()
    if (m.kind === 'free') {
      m.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    } else if (m.kind === 'arrow') {
      ctx.moveTo(m.from.x, m.from.y)
      ctx.lineTo(m.to.x, m.to.y)
      for (const h of arrowHead(m.from, m.to, w * 5)) {
        ctx.moveTo(m.to.x, m.to.y)
        ctx.lineTo(h.x, h.y)
      }
    } else {
      const cx = (m.from.x + m.to.x) / 2
      const cy = (m.from.y + m.to.y) / 2
      ctx.ellipse(
        cx,
        cy,
        Math.abs(m.to.x - m.from.x) / 2,
        Math.abs(m.to.y - m.from.y) / 2,
        0,
        0,
        Math.PI * 2,
      )
    }
    ctx.stroke()
  }
  ctx.restore()
}
