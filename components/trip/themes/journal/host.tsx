'use client'

type Host = {
  name?: string | null
  title?: string | null
  bio?: string | null
  avatarUrl?: string | null
} | null | undefined

type JournalHostProps = {
  host: Host
  businessName?: string | null
}

/**
 * Journal — Host (Chapter VIII · "Your host").
 *
 * Canvas-style split: large portrait-format avatar on the left, big serif
 * name + title + bio on the right. Hidden entirely if `host.name` is empty
 * (per TZ-5 rule).
 */
export function JournalHost({ host, businessName }: JournalHostProps) {
  if (!host?.name) return null

  const subtitle = [host.title, businessName].filter(Boolean).join(' · ')

  return (
    <section
      id="host"
      className="j-section px-6 md:px-[72px] py-20 md:py-[140px]"
    >
      <div className="grid md:grid-cols-[480px_1fr] gap-10 md:gap-[100px] items-center">
        {host.avatarUrl ? (
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={host.avatarUrl}
              alt={host.name || ''}
              className="w-full object-cover"
              style={{ maxWidth: 480, height: 'clamp(360px, 55vw, 520px)' }}
            />
          </div>
        ) : (
          <div
            className="w-full flex items-center justify-center"
            style={{
              maxWidth: 480,
              height: 'clamp(360px, 55vw, 520px)',
              background: 'var(--j-cream-deep)',
              color: 'var(--j-ink-mute)',
            }}
          >
            <span className="j-mono">No portrait</span>
          </div>
        )}

        <div>
          <div className="j-eyebrow">Your host</div>
          <h2
            className="j-serif"
            style={{
              fontSize: 'clamp(3rem, 7vw, 5.5rem)',
              lineHeight: 0.95,
              margin: '24px 0 16px',
              letterSpacing: '-0.02em',
            }}
          >
            {host.name}
          </h2>
          {subtitle && (
            <div
              className="j-serif j-italic mb-9"
              style={{
                fontSize: 22,
                color: 'var(--j-ink-soft)',
                fontWeight: 300,
              }}
            >
              {subtitle}
            </div>
          )}
          {host.bio && (
            <p
              className="j-serif"
              style={{
                fontSize: 'clamp(1rem, 1.4vw, 1.1875rem)',
                lineHeight: 1.6,
                color: 'var(--j-ink-soft)',
                fontWeight: 300,
                maxWidth: 560,
              }}
            >
              {host.bio}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
