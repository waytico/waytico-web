'use client'

import { EditableField } from '@/components/editable/editable-field'

type Host = {
  name?: string | null
  title?: string | null
  avatarUrl?: string | null
} | null | undefined

type ExpeditionOverviewProps = {
  description: string | null | undefined
  owner: boolean
  onSave: (value: string) => Promise<boolean>
  host: Host
}

/**
 * Expedition — Overview ("§ 01 — BRIEFING").
 *
 * Two-column dark section. Left: an oversized stacked headline finished
 * with a single outline-stroke word. Right: the editable description prose
 * + an "EXPEDITION LEAD" credits card showing host avatar + name.
 *
 * The host card is hidden when `host.name` is empty — clean for trips
 * where the operator hasn't set up a host yet.
 */
export function ExpeditionOverview({
  description,
  owner,
  onSave,
  host,
}: ExpeditionOverviewProps) {
  if (!description && !owner) return null

  return (
    <section
      id="overview"
      className="px-4 md:px-14 py-20 md:py-32"
      style={{ color: 'var(--e-cream)' }}
    >
      <div className="e-mono mb-10 md:mb-12" style={{ color: 'var(--e-ochre)' }}>
        § 01 — BRIEFING
      </div>
      <div className="grid md:grid-cols-2 gap-12 md:gap-24">
        <h2
          className="e-display"
          style={{
            fontSize: 'clamp(3rem, 7vw, 5.75rem)',
            lineHeight: 0.88,
            margin: 0,
            letterSpacing: '-0.03em',
          }}
        >
          SAME LAND.
          <br />
          DIFFERENT
          <br />
          <span
            className="e-day-outline"
            style={{ fontSize: 'clamp(3rem, 7vw, 5.75rem)' }}
          >
            APPROACH.
          </span>
        </h2>
        <div>
          <EditableField
            as="multiline"
            editable={owner}
            value={description}
            placeholder="Click to add briefing"
            rows={8}
            className="w-full"
            onSave={onSave}
            renderDisplay={(val) => (
              <div className="space-y-6">
                {val
                  .split(/\n\n+/)
                  .filter((p) => p.trim())
                  .map((p, i) => (
                    <p
                      key={i}
                      className="e-body"
                      style={{
                        fontSize: 'clamp(1rem, 1.2vw, 1.125rem)',
                        lineHeight: 1.65,
                        color: 'var(--e-cream-mute)',
                      }}
                    >
                      {p}
                    </p>
                  ))}
              </div>
            )}
          />

          {host?.name && (
            <div
              className="mt-10 pt-7 pb-7 flex gap-7 items-center"
              style={{
                borderTop: '1px solid var(--e-rule-2)',
                borderBottom: '1px solid var(--e-rule-2)',
              }}
            >
              {host.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={host.avatarUrl}
                  alt={host.name || ''}
                  className="object-cover flex-shrink-0"
                  style={{ width: 72, height: 72 }}
                />
              ) : (
                <div
                  className="flex-shrink-0"
                  style={{
                    width: 72,
                    height: 72,
                    background: 'var(--e-panel)',
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div
                  className="e-mono mb-1.5"
                  style={{ color: 'var(--e-ochre)' }}
                >
                  EXPEDITION LEAD
                </div>
                <div className="e-headline" style={{ fontSize: 22 }}>
                  {host.name.toUpperCase()}
                </div>
                {host.title && (
                  <div
                    className="e-body mt-1"
                    style={{ fontSize: 13, color: 'var(--e-ink-dim)' }}
                  >
                    {host.title}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
