'use client'

type Host = {
  name?: string | null
  title?: string | null
  bio?: string | null
  avatarUrl?: string | null
} | null | undefined

type AtelierHostProps = {
  host: Host
}

/**
 * Atelier — Host pull-quote.
 *
 * The Atelier canvas embeds host-name + avatar into the hero overlay and
 * the operator block, so it has no dedicated host section. We add a
 * lightweight pull-quote variant for trips where the agent has filled in
 * a substantial `host.bio` — surfacing it as editorial content distinct
 * from the operator-contact block.
 *
 * Rules:
 *   - Hidden entirely if no `host.name` (mirrors Journal).
 *   - Hidden if `host.bio` is empty (without a bio there's nothing to pull
 *     — the hero + operator coverage of host name/title is sufficient).
 *
 * No id="host" anchor mismatch with Atelier nav: the nav still scrolls to
 * `#host` if present; gracefully no-ops to operator section otherwise.
 */
export function AtelierHost({ host }: AtelierHostProps) {
  if (!host?.name || !host?.bio) return null

  return (
    <section id="host" className="px-4 md:px-14 py-16 md:py-24">
      <div className="grid md:grid-cols-[1fr_2fr] gap-8 md:gap-16 items-start">
        <div>
          <div className="a-eyebrow mb-5">In their words</div>
          {host.avatarUrl && (
            <div className="rounded-2xl overflow-hidden mb-5" style={{ maxWidth: 320 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={host.avatarUrl}
                alt={host.name || ''}
                className="w-full block object-cover"
                style={{ height: 'clamp(220px, 28vw, 360px)' }}
              />
            </div>
          )}
          <div
            className="a-display"
            style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.25rem)', letterSpacing: '-0.02em' }}
          >
            {host.name}
          </div>
          {host.title && (
            <div
              className="a-sans mt-1"
              style={{ fontSize: 14, color: 'var(--a-ink-2)' }}
            >
              {host.title}
            </div>
          )}
        </div>
        <blockquote
          className="a-display m-0"
          style={{
            fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            lineHeight: 1.25,
            color: 'var(--a-ink)',
            letterSpacing: '-0.02em',
          }}
        >
          <span
            className="a-italic mr-2"
            style={{ color: 'var(--a-coral)', fontSize: '1.4em', verticalAlign: '-0.15em' }}
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
