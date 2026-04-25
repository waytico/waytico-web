'use client'

type Host = {
  name?: string | null
  title?: string | null
  bio?: string | null
  avatarUrl?: string | null
} | null | undefined

type ExpeditionHostProps = {
  host: Host
}

/**
 * Expedition — Host pull-quote.
 *
 * The Expedition canvas embeds host into the overview credits card and the
 * operator portrait section, so it has no dedicated host block. We follow
 * Atelier's pattern: surface a quote-style bio block only when the agent
 * has filled in a substantial `host.bio`.
 *
 * Hidden when `host.name` or `host.bio` is empty.
 */
export function ExpeditionHost({ host }: ExpeditionHostProps) {
  if (!host?.name || !host?.bio) return null

  return (
    <section
      id="host"
      className="px-4 md:px-14 py-20 md:py-28"
      style={{
        borderTop: '1px solid var(--e-rule-2)',
        color: 'var(--e-cream)',
      }}
    >
      <div className="grid md:grid-cols-[1fr_2fr] gap-10 md:gap-20 items-start">
        <div>
          <div className="e-mono mb-5" style={{ color: 'var(--e-ochre)' }}>
            IN THEIR WORDS
          </div>
          <div className="e-headline" style={{ fontSize: 22 }}>
            {host.name.toUpperCase()}
          </div>
          {host.title && (
            <div
              className="e-mono mt-2"
              style={{ color: 'var(--e-ink-dim)' }}
            >
              {host.title.toUpperCase()}
            </div>
          )}
        </div>
        <blockquote
          className="e-display m-0"
          style={{
            fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            lineHeight: 1.2,
            color: 'var(--e-cream)',
            letterSpacing: '-0.02em',
          }}
        >
          <span
            className="mr-3"
            style={{
              color: 'var(--e-ochre)',
              fontSize: '1.4em',
              verticalAlign: '-0.15em',
            }}
            aria-hidden="true"
          >
            “
          </span>
          {host.bio}
        </blockquote>
      </div>
    </section>
  )
}
