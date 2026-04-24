'use client'

import { EditableField } from '@/components/editable/editable-field'

type JournalOverviewProps = {
  description: string | null | undefined
  owner: boolean
  onSave: (value: string) => Promise<boolean>
  host?: {
    name?: string | null
    title?: string | null
    avatarUrl?: string | null
  } | null
}

/**
 * Journal — overview (Chapter I).
 *
 * Two-column editorial spread: left rail with eyebrow / h2 / "Hosted by"
 * strip, right column with the actual overview text and a dropcap on its
 * first character.
 *
 * Mobile: single column, dropcap still applied.
 *
 * EditableField is used for the description; we render paragraphs inside
 * `renderDisplay` so the dropcap and per-paragraph spacing work. When the
 * description is empty and the user is owner, the inline editor placeholder
 * shows — no separate owner prompt box.
 */
export function JournalOverview({ description, owner, onSave, host }: JournalOverviewProps) {
  if (!description && !owner) return null

  const hasHost = !!host?.name

  return (
    <section
      id="overview"
      className="j-section px-6 md:px-[72px] py-20 md:py-[140px]"
    >
      <div className="md:grid md:grid-cols-[320px_1fr] md:gap-[120px]">
        {/* Left rail */}
        <div>
          <div className="j-eyebrow">Chapter I</div>
          <h2
            className="j-serif"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              lineHeight: 0.95,
              margin: '20px 0 0',
              letterSpacing: '-0.02em',
            }}
          >
            An <em>unhurried</em> passage.
          </h2>
          {hasHost && (
            <div
              className="mt-10 md:mt-12 pt-7 border-t"
              style={{ borderColor: 'var(--j-rule)' }}
            >
              <div
                className="j-mono mb-2"
                style={{ color: 'var(--j-ink-mute)' }}
              >
                Hosted by
              </div>
              <div className="j-serif" style={{ fontSize: 22 }}>
                {host?.name}
              </div>
              {host?.title && (
                <div
                  className="mt-1"
                  style={{ fontSize: 13, color: 'var(--j-ink-mute)' }}
                >
                  {host.title}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column — overview prose */}
        <div
          className="mt-10 md:mt-0 md:pt-9"
          style={{ maxWidth: 760 }}
        >
          <EditableField
            as="multiline"
            editable={owner}
            value={description}
            placeholder="Click to add overview"
            rows={8}
            className="w-full"
            onSave={onSave}
            renderDisplay={(val) => (
              <div className="space-y-6 md:space-y-7">
                {val
                  .split(/\n\n+/)
                  .filter((p) => p.trim().length > 0)
                  .map((p, i) => {
                    const trimmed = p.trim()
                    const firstChar = trimmed.charAt(0)
                    const rest = trimmed.slice(1)
                    return (
                      <p
                        key={i}
                        className="j-serif"
                        style={{
                          fontSize: 'clamp(1rem, 1.6vw, 1.375rem)',
                          lineHeight: 1.55,
                          color: 'var(--j-ink)',
                          fontWeight: 300,
                        }}
                      >
                        {i === 0 ? (
                          <>
                            <span
                              className="j-serif j-italic float-left"
                              style={{
                                fontSize: 'clamp(3rem, 6vw, 5.5rem)',
                                lineHeight: 0.8,
                                marginRight: 10,
                                marginTop: 6,
                                color: 'var(--j-terra)',
                                fontWeight: 300,
                              }}
                            >
                              {firstChar}
                            </span>
                            {rest}
                          </>
                        ) : (
                          p
                        )}
                      </p>
                    )
                  })}
              </div>
            )}
          />
        </div>
      </div>
    </section>
  )
}
