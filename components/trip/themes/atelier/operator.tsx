'use client'

import { channelHref, hasAnyContact, type ResolvedOperatorContact } from '@/lib/operator-contact'

type AtelierOperatorProps = {
  contact: ResolvedOperatorContact
  brandLogoUrl?: string | null
  brandTagline?: string | null
  hostAvatarUrl?: string | null
}

/**
 * Atelier — Operator ("08 / Your host") contact.
 *
 * Two-column with portrait left (uses host.avatarUrl when available — the
 * canvas treats host and operator as overlapping people; for trips where
 * they're distinct, only the portrait differs and the rest of the contact
 * info still resolves through the operator chain).
 *
 * Contact tiles are paper-2 chips with coral/teal labels alternating. Only
 * channels with values render — empty rows skipped.
 */
export function AtelierOperator({
  contact,
  brandLogoUrl,
  brandTagline,
  hostAvatarUrl,
}: AtelierOperatorProps) {
  if (!hasAnyContact(contact)) return null

  type Row = {
    label: string
    value: string | null
    href: string | null
    color: string
  }
  const rows: Row[] = (
    [
      ['Email', contact.email, channelHref('email', contact.email), 'var(--a-teal)'],
      ['Phone', contact.phone, channelHref('phone', contact.phone), 'var(--a-coral)'],
      ['WhatsApp', contact.whatsapp, channelHref('whatsapp', contact.whatsapp), 'var(--a-coral)'],
      ['Telegram', contact.telegram, channelHref('telegram', contact.telegram), 'var(--a-teal)'],
      ['Website', contact.website, channelHref('website', contact.website), 'var(--a-teal)'],
    ] as Array<[string, string | null, string | null, string]>
  )
    .filter(([, v]) => v)
    .map(([label, value, href, color]) => ({ label, value, href, color }))

  return (
    <section
      id="contact"
      className="px-4 md:px-14 py-16 md:py-24"
    >
      <div className="grid md:grid-cols-[520px_1fr] gap-8 md:gap-20 items-center">
        {/* Portrait column */}
        <div className="relative">
          <div className="overflow-hidden" style={{ borderRadius: 16 }}>
            {hostAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hostAvatarUrl}
                alt=""
                className="w-full block object-cover"
                style={{ height: 'clamp(360px, 50vw, 600px)' }}
              />
            ) : (
              <div
                className="w-full"
                style={{
                  height: 'clamp(360px, 50vw, 600px)',
                  background: 'var(--a-paper-2)',
                }}
              />
            )}
          </div>
          {brandLogoUrl && (
            <div
              className="absolute left-4 bottom-4 px-4 py-3 rounded-xl"
              style={{ background: 'white' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brandLogoUrl}
                alt=""
                className="h-8 w-auto object-contain"
              />
            </div>
          )}
        </div>

        {/* Copy + contacts */}
        <div>
          <div className="a-eyebrow mb-5">08 / Your host</div>
          {contact.name && (
            <h2
              className="a-display"
              style={{
                fontSize: 'clamp(2.5rem, 6.5vw, 6.5rem)',
                lineHeight: 0.92,
                margin: '0 0 18px',
                letterSpacing: '-0.03em',
              }}
            >
              {contact.name}
            </h2>
          )}
          {brandTagline && (
            <p
              className="a-sans mb-8"
              style={{
                fontSize: 'clamp(1rem, 1.2vw, 1.125rem)',
                lineHeight: 1.65,
                color: 'var(--a-ink-2)',
                maxWidth: 520,
              }}
            >
              {brandTagline}
            </p>
          )}

          {rows.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 md:gap-3.5">
              {rows.map((r) => {
                const Tag = r.href ? 'a' : 'div'
                return (
                  <Tag
                    key={r.label}
                    {...(r.href
                      ? {
                          href: r.href,
                          target: r.label === 'Email' || r.label === 'Phone' ? undefined : '_blank',
                          rel: 'noopener noreferrer',
                        }
                      : {})}
                    className="block hover:opacity-80 transition-opacity"
                    style={{
                      padding: '14px 18px',
                      background: 'var(--a-paper-2)',
                      borderRadius: 12,
                      textDecoration: 'none',
                    }}
                  >
                    <div className="a-mono" style={{ color: r.color, marginBottom: 4 }}>
                      {r.label}
                    </div>
                    <div className="a-display" style={{ fontSize: 16, color: 'var(--a-ink)' }}>
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

