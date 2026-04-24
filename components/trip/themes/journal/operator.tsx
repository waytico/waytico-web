'use client'

import { channelHref, hasAnyContact, type ResolvedOperatorContact } from '@/lib/operator-contact'

type JournalOperatorProps = {
  contact: ResolvedOperatorContact
  brandLogoUrl?: string | null
  brandTagline?: string | null
}

/**
 * Journal — Operator contact block.
 *
 * Shown whenever the resolver produced at least one channel (including
 * owner.email fallback). If absolutely nothing resolves — e.g. anonymous
 * trip before claim — this block is hidden.
 *
 * Brand logo / tagline from the agent's account profile are surfaced here
 * (not in hero) to keep the hero brand strip focused on the proposal header.
 */
export function JournalOperator({
  contact,
  brandLogoUrl,
  brandTagline,
}: JournalOperatorProps) {
  if (!hasAnyContact(contact)) return null

  const rows: Array<{ label: string; value: string | null; href: string | null }> = [
    {
      label: 'Email',
      value: contact.email,
      href: channelHref('email', contact.email),
    },
    {
      label: 'Telephone',
      value: contact.phone,
      href: channelHref('phone', contact.phone),
    },
    {
      label: 'WhatsApp',
      value: contact.whatsapp,
      href: channelHref('whatsapp', contact.whatsapp),
    },
    {
      label: 'Telegram',
      value: contact.telegram,
      href: channelHref('telegram', contact.telegram),
    },
    {
      label: 'Website',
      value: contact.website,
      href: channelHref('website', contact.website),
    },
  ].filter((r) => r.value)

  return (
    <section
      id="contact"
      className="j-section px-6 md:px-[72px] py-20 md:py-[140px] border-t border-b"
      style={{
        background: 'var(--j-paper)',
        borderColor: 'var(--j-rule)',
      }}
    >
      <div className="grid md:grid-cols-[1fr_1.4fr] gap-10 md:gap-[100px] items-start">
        <div>
          <div className="j-eyebrow">Your operator</div>
          {contact.name && (
            <h2
              className="j-serif"
              style={{
                fontSize: 'clamp(2.25rem, 4vw, 3.5rem)',
                lineHeight: 0.95,
                margin: '24px 0 16px',
                letterSpacing: '-0.02em',
              }}
            >
              {contact.name}
            </h2>
          )}
          {brandLogoUrl && (
            <div className="mt-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brandLogoUrl}
                alt={contact.name || ''}
                className="h-12 w-auto object-contain"
              />
            </div>
          )}
          {brandTagline && (
            <p
              className="j-serif j-italic mt-5"
              style={{
                fontSize: 18,
                color: 'var(--j-ink-soft)',
                maxWidth: 340,
                fontWeight: 300,
              }}
            >
              {brandTagline}
            </p>
          )}
        </div>

        <div className="md:pt-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          {rows.map((r) => (
            <div key={r.label}>
              <div
                className="j-mono mb-1.5"
                style={{ color: 'var(--j-ink-mute)' }}
              >
                {r.label}
              </div>
              {r.href ? (
                <a
                  href={r.href}
                  target={r.label === 'Email' || r.label === 'Telephone' ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  className="j-serif hover:underline break-all"
                  style={{ fontSize: 20, color: 'var(--j-ink)' }}
                >
                  {r.value}
                </a>
              ) : (
                <div
                  className="j-serif"
                  style={{ fontSize: 20 }}
                >
                  {r.value}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
