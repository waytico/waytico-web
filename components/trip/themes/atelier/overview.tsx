'use client'

import { EditableField } from '@/components/editable/editable-field'

type AtelierOverviewProps = {
  description: string | null | undefined
  owner: boolean
  onSave: (value: string) => Promise<boolean>
}

/**
 * Atelier — Overview ("01 / The idea").
 *
 * Asymmetric two-column: left has eyebrow + outsized h2 with mid-line italic
 * coral accent; right column carries the actual editable description prose.
 * Mobile collapses to single column with smaller h2.
 */
export function AtelierOverview({ description, owner, onSave }: AtelierOverviewProps) {
  if (!description && !owner) return null

  return (
    <section
      id="overview"
      className="px-4 md:px-14 py-16 md:py-24"
    >
      <div className="a-eyebrow mb-5">01 / The idea</div>
      <div className="grid md:grid-cols-[1.3fr_1fr] gap-10 md:gap-20 items-start">
        <h2
          className="a-display"
          style={{
            fontSize: 'clamp(2.5rem, 6vw, 5.5rem)',
            lineHeight: 0.95,
            margin: 0,
            letterSpacing: '-0.03em',
          }}
        >
          Not a tour.
          <br />
          <span className="a-italic" style={{ color: 'var(--a-coral)' }}>
            A composition
          </span>{' '}
          of unhurried days.
        </h2>
        <div className="md:pt-4">
          <EditableField
            as="multiline"
            editable={owner}
            value={description}
            placeholder="Click to add overview"
            rows={8}
            className="w-full"
            onSave={onSave}
            renderDisplay={(val) => (
              <div className="space-y-5">
                {val
                  .split(/\n\n+/)
                  .filter((p) => p.trim())
                  .map((p, i) => (
                    <p
                      key={i}
                      className="a-sans"
                      style={{
                        fontSize: 'clamp(0.95rem, 1.2vw, 1.0625rem)',
                        lineHeight: 1.7,
                        color: 'var(--a-ink-2)',
                      }}
                    >
                      {p}
                    </p>
                  ))}
              </div>
            )}
          />
        </div>
      </div>
    </section>
  )
}
