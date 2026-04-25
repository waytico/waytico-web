'use client'

type Ratings = {
  difficulty?: number | null
  comfort?: number | null
  pace?: number | null
  cultural_immersion?: number | null
} | null | undefined

type AtelierRatingsProps = {
  ratings: Ratings
}

const METRICS: Array<{
  key: 'difficulty' | 'comfort' | 'pace' | 'cultural_immersion'
  label: string
  note: string
  color: string
}> = [
  { key: 'difficulty', label: 'Difficulty', note: 'Physical demand of the trip', color: 'var(--a-sage)' },
  { key: 'comfort', label: 'Comfort', note: 'Lodging and travel comfort', color: 'var(--a-coral)' },
  { key: 'pace', label: 'Pace', note: 'Unhurried to intense', color: 'var(--a-sage)' },
  { key: 'cultural_immersion', label: 'Immersion', note: 'Depth of local experience', color: 'var(--a-coral)' },
]

/**
 * Atelier — Ratings ("07 / In measure").
 *
 * Sage paper-2 background section with 4 white card metrics. Each card has
 * a 5-segment progress strip (filled segments take the metric colour) and a
 * coral/sage label. Hidden entirely if ratings is null or all metrics are
 * null (matches Journal rule).
 */
export function AtelierRatings({ ratings }: AtelierRatingsProps) {
  if (!ratings) return null
  const values = METRICS.map((m) => ({
    ...m,
    val: ratings[m.key] ?? null,
  })).filter((m) => m.val !== null && m.val !== undefined)
  if (values.length === 0) return null

  return (
    <section
      id="ratings"
      className="px-4 md:px-14 py-16 md:py-24"
      style={{ background: 'var(--a-paper-2)' }}
    >
      <div className="a-eyebrow mb-5">07 / In measure</div>
      <h2
        className="a-display"
        style={{
          fontSize: 'clamp(2.75rem, 7vw, 6rem)',
          lineHeight: 0.92,
          margin: '0 0 56px',
          letterSpacing: '-0.03em',
        }}
      >
        How it{' '}
        <span className="a-italic" style={{ color: 'var(--a-coral)' }}>
          feels
        </span>
        .
      </h2>
      <div className="grid md:grid-cols-2 gap-3 md:gap-6">
        {values.map((m) => (
          <div
            key={m.key}
            className="p-7 md:p-9"
            style={{ background: 'white', borderRadius: 16 }}
          >
            <div className="flex justify-between items-baseline mb-5">
              <div className="a-display" style={{ fontSize: 'clamp(1.25rem, 2vw, 2rem)' }}>
                {m.label}
              </div>
              <div
                className="a-display"
                style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.5rem)', color: m.color }}
              >
                {m.val}
                <span style={{ fontSize: 18, color: 'var(--a-mute)' }}>/5</span>
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className="flex-1 rounded-full"
                  style={{
                    height: 8,
                    background: n <= (m.val as number) ? m.color : 'var(--a-paper-2)',
                  }}
                />
              ))}
            </div>
            <div
              className="a-sans"
              style={{ fontSize: 13, color: 'var(--a-ink-2)' }}
            >
              {m.note}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
