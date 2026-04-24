'use client'

type Ratings = {
  difficulty?: number | null
  comfort?: number | null
  pace?: number | null
  cultural_immersion?: number | null
} | null | undefined

type JournalRatingsProps = {
  ratings: Ratings
}

const METRICS: Array<{
  key: 'difficulty' | 'comfort' | 'pace' | 'cultural_immersion'
  label: string
  note: string
}> = [
  { key: 'difficulty', label: 'Difficulty', note: 'Physical demand of the trip' },
  { key: 'comfort', label: 'Comfort', note: 'Lodging and travel comfort' },
  { key: 'pace', label: 'Pace', note: 'Unhurried to intense' },
  { key: 'cultural_immersion', label: 'Cultural immersion', note: 'Depth of local experience' },
]

/**
 * Journal — Ratings (Chapter VII · "In measure").
 *
 * Four 1–5 metrics shown as horizontal bars. Hidden entirely if all four
 * values are null (matches TZ-5 rule). Each bar that has no value is
 * skipped — rendering only the metrics the agent actually rated.
 */
export function JournalRatings({ ratings }: JournalRatingsProps) {
  if (!ratings) return null

  const values = METRICS.map((m) => ({
    ...m,
    val: ratings[m.key] ?? null,
  })).filter((m) => m.val !== null && m.val !== undefined)

  if (values.length === 0) return null

  return (
    <section
      id="ratings"
      className="j-section px-6 md:px-[72px] py-20 md:py-[140px]"
    >
      <div className="j-eyebrow">Chapter VII</div>
      <h2
        className="j-serif mb-16 md:mb-20"
        style={{
          fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
          lineHeight: 0.95,
          margin: '20px 0 60px',
          letterSpacing: '-0.02em',
        }}
      >
        In <em>measure.</em>
      </h2>

      <div className="grid md:grid-cols-2 gap-10 md:gap-y-[60px] md:gap-x-[120px]">
        {values.map((m) => {
          const pct = Math.max(0, Math.min(100, ((m.val as number) / 5) * 100))
          return (
            <div key={m.key}>
              <div className="flex justify-between items-baseline mb-4">
                <div
                  className="j-serif"
                  style={{ fontSize: 'clamp(1.25rem, 2.2vw, 1.875rem)' }}
                >
                  {m.label}
                </div>
                <div
                  className="j-serif j-italic"
                  style={{ fontSize: 22, color: 'var(--j-terra)' }}
                >
                  {m.val}{' '}
                  <span style={{ color: 'var(--j-ink-mute)', fontSize: 16 }}>/ 5</span>
                </div>
              </div>
              <div className="j-rating-track">
                <div className="j-rating-fill" style={{ width: `${pct}%` }} />
                <div className="j-rating-dot" style={{ left: `${pct}%` }} />
              </div>
              <div
                className="j-mono mt-3"
                style={{ color: 'var(--j-ink-mute)' }}
              >
                {m.note}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
