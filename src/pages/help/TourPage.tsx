import { useState } from 'react'
import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { tourSlides } from '../../help/tour'

export const META_TOUR_SEEN = 'tourSeen'

/** Full-screen tour through the app, slide by slide. */
export function TourPage() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const slide = tourSlides[index]!
  const last = index === tourSlides.length - 1

  const finish = async () => {
    await db.meta.put({ key: META_TOUR_SEEN, value: new Date().toISOString() })
    navigate('/')
  }

  return (
    <div className="pt-safe pb-safe flex min-h-dvh flex-col bg-white dark:bg-stone-950">
      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">
          Rundgang · {index + 1} von {tourSlides.length}
        </p>
        <button
          type="button"
          onClick={() => void finish()}
          className="min-h-12 rounded-xl px-3 font-semibold text-brand-700 dark:text-brand-300"
        >
          Überspringen
        </button>
      </div>

      <section
        aria-live="polite"
        className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-6"
      >
        <div aria-hidden="true" className="text-center text-7xl">
          {slide.icon}
        </div>
        <h1 className="text-center text-2xl font-bold">{slide.title}</h1>
        <p className="text-lg leading-relaxed">{slide.text}</p>
        {slide.points && (
          <ul className="space-y-2">
            {slide.points.map((p) => (
              <li key={p} className="flex gap-2 text-lg leading-relaxed">
                <span aria-hidden="true" className="font-bold text-brand-700 dark:text-brand-300">
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mx-auto w-full max-w-lg space-y-4 px-4 pb-4">
        <div className="flex justify-center gap-2" aria-hidden="true">
          {tourSlides.map((_, i) => (
            <span
              key={i}
              className={`size-2.5 rounded-full ${i === index ? 'bg-brand-700 dark:bg-brand-300' : 'bg-stone-300 dark:bg-stone-700'}`}
            />
          ))}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            disabled={index === 0}
            className="min-h-14 flex-1 rounded-xl border-2 border-stone-300 font-semibold disabled:opacity-40 dark:border-stone-600"
          >
            ‹ Zurück
          </button>
          <button
            type="button"
            onClick={() => (last ? void finish() : setIndex(index + 1))}
            className="min-h-14 flex-[2] rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-500"
          >
            {last ? 'Los geht’s' : 'Weiter ›'}
          </button>
        </div>
      </div>
    </div>
  )
}
