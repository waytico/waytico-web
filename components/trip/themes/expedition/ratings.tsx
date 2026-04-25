'use client'

import { padTwo } from '@/lib/trip-format'

type Ratings = {
  difficulty?: number | null
  comfort?: number | null
  pace?: number | null
  cultural_immersion?: number | null
} | null | undefined

type ExpeditionRatingsProps = {
  ratings: Ratings
}

const METRICS: Array<{
  key: 'difficulty' | 'comfort' | 'pace' | 'cultural_immersion'
  label: string
  note: string
}> = [
  { key: 'difficulty', label: 'DIFFICULTY', note: 'PHYSICAL DEMAND OF THE TRIP' },
  { key: 'comfort', label: 'COMFORT', note: 'LODGING AND TRAVEL COMFORT' },
  { key: 'pace', label: 'PACE', note: 'UNHURRIED TO INTENSE' },
  { key: 'cultural_immersion', label: 'CULTURAL IMMERSION', note: 'DEPTH OF LOCAL EXPERIENCE' },
]

function Star({ filled, size = 28 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
    >
      <path
        d="M12 2.5l2.95 6.5 7.05.8-5.25 4.85L18.2 21.5 12 17.85 5.8 21.5l1.45-6.85L2 9.8l7.05-.8L12 2.5z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </svg>
  )
}

/**
 * Expedition — Ratings ("§ 07 — CONDITIONS / FIELD RATINGS").
 *
 * Outlined panel cards with a labelled metric, ochre N/5 display number,
 * and 5 SVG stars (filled or hollow). Differs from Journal/Atelier which
 * use progress bars — Expedition uses stars to match its field-guide
 * aesthetic.
 *
 * Hidden if ratings is null or all 4 metrics are null.
 */
export function ExpeditionRatings({ ratings }: ExpeditionRatingsProps) {
  if (!ratings) return null
  const values = METRICS.map((m, i) => ({
    ...m,
    val: ratings[m.key] ?? null,
    idx: i,
  })).filter((m) => m.val !== null && m.val !== undefined)
  if (values.length === 0) return null

  return (
    <section
      id="ratings"
      className="px-4 md:px-14 py-20 md:py-32"
      style={{
        borderTop: '1px solid var(--e-rule-2)',
        color: 'var(--e-cream)',
      }}
    >
      <div className="e-mono mb-6" style={{ color: 'var(--e-ochre)' }}>
        § 07 — CONDITIONS
      </div>
      <h2
        className="e-display"
        style={{
          fontSize: 'clamp(3rem, 8vw, 7rem)',
          lineHeight: 0.88,
          margin: '0 0 60px',
          letterSpacing: '-0.03em',
        }}
      >
        FIELD <span style={{ color: 'var(--e-ochre)' }}>RATINGS.</span>
      </h2>
      <div className="grid md:grid-cols-2 gap-8 md:gap-x-20 md:gap-y-12">
        {values.map((m) => (
          <div
            key={m.key}
            className="p-7 md:p-9"
            style={{
              border: '1px solid var(--e-rule-2)',
              background: 'var(--e-panel)',
            }}
          >
            <div className="flex justify-between items-start mb-7">
              <div>
                <div
                  className="e-mono mb-2"
                  style={{ color: 'var(--e-ink-dim)' }}
                >
                  METRIC {padTwo(m.idx + 1)}
                </div>
                <div
                  className="e-headline"
                  style={{ fontSize: 'clamp(1.125rem, 1.6vw, 1.5rem)' }}
                >
                  {m.label}
                </div>
              </div>
              <div
                className="e-display"
                style={{
                  fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                  color: 'var(--e-ochre)',
                }}
              >
                {m.val}
                <span style={{ fontSize: 18, color: 'var(--e-ink-dim)' }}>
                  /5
                </span>
              </div>
            </div>
            <div
              className="flex gap-3 mb-5"
              style={{ color: 'var(--e-ochre)' }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} filled={n <= (m.val as number)} />
              ))}
            </div>
            <div className="e-mono" style={{ color: 'var(--e-cream-mute)' }}>
              {m.note}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
