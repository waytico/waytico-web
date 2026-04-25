'use client'

import { channelHref, hasAnyContact, type ResolvedOperatorContact } from '@/lib/operator-contact'

type ExpeditionOperatorProps = {
  contact: ResolvedOperatorContact
  brandLogoUrl?: string | null
  brandTagline?: string | null
  hostAvatarUrl?: string | null
}

/**
 * Expedition — Operator ("§ 08 — YOUR HOST").
 *
 * Two-column zero-padded layout. Left: full-bleed portrait (uses
 * host.avatarUrl as fallback because the canvas treats host and operator
 * as overlapping people). Right: dark padded box with eyebrow + uppercase
 * display name, role line, bio paragraph, and a 4-up uppercase contacts
 * grid bordered with thin rules.
 */
export function ExpeditionOperator({
  contact,
  brandLogoUrl,
  brandTagline,
  hostAvatarUrl,
}: ExpeditionOperatorProps) {
  if (!hasAnyContact(contact)) return null

  type Row = {
    label: string
    value: string | null
    href: string | null
  }
  const rows: Row[] = (
    [
      ['WHATSAPP', contact.whatsapp, channelHref('whatsapp', contact.whatsapp)],
      ['TELEGRAM', contact.telegram, channelHref('telegram', contact.telegram)],
      ['EMAIL', contact.email, channelHref('email', contact.email)],
      ['TELEPHONE', contact.phone, channelHref('phone', contact.phone)],
      ['WEBSITE', contact.website, channelHref('website', contact.website)],
    ] as Array<[string, string | null, string | null]>
  )
    .filter(([, v]) => v)
    .map(([label, value, href]) => ({ label, value, href }))

  return (
    <section
      id="contact"
      style={{
        background: 'var(--e-bg-deep)',
        borderTop: '1px solid var(--e-rule-2)',
        color: 'var(--e-cream)',
      }}
    >
      <div className="grid md:grid-cols-2">
        {/* Portrait column */}
        <div
          className="relative"
          style={{ minHeight: 'clamp(320px, 60vw, 760px)' }}
        >
          {hostAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hostAvatarUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'saturate(0.85) contrast(1.08) brightness(0.95)' }}
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: 'var(--e-panel)' }}
            />
          )}
          <div
            className="absolute left-5 top-5 md:left-10 md:top-10"
            style={{ color: 'var(--e-cream)' }}
          >
            <div className="e-mono" style={{ color: 'var(--e-ochre)' }}>
              EXPEDITION LEAD · PORTRAIT
            </div>
          </div>
          {brandLogoUrl && (
            <div
              className="absolute left-5 bottom-5 md:left-10 md:bottom-10 px-4 py-3"
              style={{ background: 'var(--e-bg-deep)', border: '1px solid var(--e-rule-2)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brandLogoUrl}
                alt=""
                className="h-8 w-auto object-contain"
                style={{ filter: 'brightness(1.6)' }}
              />
            </div>
          )}
        </div>

        {/* Copy column */}
        <div className="px-4 md:px-14 py-16 md:py-24">
          <div className="e-mono mb-6" style={{ color: 'var(--e-ochre)' }}>
            § 08 — YOUR HOST
          </div>
          {contact.name && (
            <h2
              className="e-display"
              style={{
                fontSize: 'clamp(2.5rem, 6vw, 6rem)',
                lineHeight: 0.88,
                margin: '0 0 24px',
                letterSpacing: '-0.03em',
              }}
            >
              {contact.name.toUpperCase()}
              <span style={{ color: 'var(--e-ochre)' }}>.</span>
            </h2>
          )}
          {brandTagline && (
            <div
              className="e-headline mb-10"
              style={{ fontSize: 16, color: 'var(--e-cream-mute)' }}
            >
              {brandTagline.toUpperCase()}
            </div>
          )}
          {rows.length > 0 && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-0">
              {rows.map((r, i) => {
                const Tag = r.href ? 'a' : 'div'
                return (
                  <Tag
                    key={r.label}
                    {...(r.href
                      ? {
                          href: r.href,
                          target:
                            r.label === 'EMAIL' || r.label === 'TELEPHONE'
                              ? undefined
                              : '_blank',
                          rel: 'noopener noreferrer',
                        }
                      : {})}
                    className="block hover:opacity-80 transition-opacity"
                    style={{
                      padding: '24px 0',
                      borderTop: '1px solid var(--e-rule-2)',
                      paddingRight: i % 2 === 0 ? 32 : 0,
                      paddingLeft: i % 2 === 1 ? 32 : 0,
                      textDecoration: 'none',
                    }}
                  >
                    <div
                      className="e-mono mb-2"
                      style={{ color: 'var(--e-ochre)' }}
                    >
                      {r.label}
                    </div>
                    <div
                      className="e-headline"
                      style={{ fontSize: 18, color: 'var(--e-cream)' }}
                    >
                      {r.value}
                    </div>
                  </Tag>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

