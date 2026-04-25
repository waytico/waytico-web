'use client'

import { Star, X } from 'lucide-react'

export type Ratings = {
  difficulty?: number | null
  comfort?: number | null
  pace?: number | null
  cultural_immersion?: number | null
} | null | undefined

export type RatingsPatch = {
  difficulty: number | null
  comfort: number | null
  pace: number | null
  cultural_immersion: number | null
}

type Props = {
  value: Ratings
  onChange: (next: RatingsPatch | null) => void
}

const METRICS: Array<{
  key: keyof RatingsPatch
  label: string
  hint: string
}> = [
  { key: 'difficulty', label: 'Difficulty', hint: 'Physical demand of the trip' },
  { key: 'comfort', label: 'Comfort', hint: 'Lodging and travel comfort' },
  { key: 'pace', label: 'Pace', hint: 'Unhurried to intense' },
  { key: 'cultural_immersion', label: 'Cultural immersion', hint: 'Depth of local experience' },
]

/**
 * Inline ratings editor.
 *
 * Renders 4 rows × 5 star buttons. Click a star to set; click the same
 * star again to clear that single metric. The "Clear all" link wipes
 * everything to null (which makes the Ratings block hide on the trip
 * page — same visibility rule as the renderers).
 *
 * Stateless: receives `value`, calls `onChange` with the full next
 * ratings object. The drawer batches the actual save.
 */
export function RatingsEditor({ value, onChange }: Props) {
  const current: RatingsPatch = {
    difficulty: value?.difficulty ?? null,
    comfort: value?.comfort ?? null,
    pace: value?.pace ?? null,
    cultural_immersion: value?.cultural_immersion ?? null,
  }

  const setMetric = (key: keyof RatingsPatch, n: number | null) => {
    onChange({ ...current, [key]: n })
  }

  const allNull = Object.values(current).every((v) => v === null)

  return (
    <div className="space-y-5">
      {METRICS.map((m) => {
        const v = current[m.key]
        return (
          <div key={m.key}>
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="text-sm font-semibold text-foreground">{m.label}</div>
              {v !== null && (
                <button
                  type="button"
                  onClick={() => setMetric(m.key, null)}
                  className="text-[11px] text-foreground/50 hover:text-foreground inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMetric(m.key, n === v ? null : n)}
                  aria-label={`${m.label} ${n} of 5`}
                  className="p-1 rounded hover:bg-secondary transition-colors"
                >
                  <Star
                    className={`w-5 h-5 ${
                      v !== null && n <= v
                        ? 'fill-accent text-accent'
                        : 'text-foreground/30'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs text-foreground/50 tabular-nums">
                {v !== null ? `${v}/5` : '—'}
              </span>
            </div>
            <p className="text-xs text-foreground/50 mt-1">{m.hint}</p>
          </div>
        )
      })}

      {!allNull && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-foreground/60 hover:text-foreground hover:underline"
        >
          Clear all ratings (hide block)
        </button>
      )}
    </div>
  )
}
