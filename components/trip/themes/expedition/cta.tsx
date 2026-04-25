'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  channelHref,
  hasAnyContact,
  type ResolvedOperatorContact,
} from '@/lib/operator-contact'

type ExpeditionCTAProps = {
  tripTitle: string
  shareUrl: string
  contact: ResolvedOperatorContact
}

/**
 * Expedition — CTA ("§ 09 — NEXT MOVE").
 *
 * Centered. Outline-stroke "MOVE OUT?" finishes the headline. Primary
 * "WRITE TO …" button (e-btn ochre fill) + secondary "BOOK A CALL" ghost
 * button. Below: a thin-rule strip with "SHARE PROPOSAL" mono label and
 * outlined uppercase share pills.
 */
export function ExpeditionCTA({
  tripTitle,
  shareUrl,
  contact,
}: ExpeditionCTAProps) {
  const [copied, setCopied] = useState(false)

  const writeHref =
    channelHref('email', contact.email) ||
    channelHref('whatsapp', contact.whatsapp) ||
    channelHref('telegram', contact.telegram) ||
    channelHref('phone', contact.phone) ||
    channelHref('website', contact.website)

  const writeLabel = contact.name
    ? `WRITE TO ${contact.name.split(/\s+/)[0].toUpperCase()}`
    : 'WRITE TO OPERATOR'

  const callHref = channelHref('phone', contact.phone)

  const encoded = encodeURIComponent(shareUrl)
  const shareText = encodeURIComponent(`${tripTitle} — ${shareUrl}`)
  const shareLinks: Array<{
    label: string
    href: string | null
    onClick?: () => void
  }> = [
    {
      label: 'EMAIL',
      href: `mailto:?subject=${encodeURIComponent(tripTitle)}&body=${shareText}`,
    },
    { label: 'WHATSAPP', href: `https://wa.me/?text=${shareText}` },
    {
      label: 'TELEGRAM',
      href: `https://t.me/share/url?url=${encoded}&text=${encodeURIComponent(tripTitle)}`,
    },
    {
      label: copied ? 'COPIED' : 'COPY LINK',
      href: null,
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(shareUrl)
          setCopied(true)
          toast.success('Link copied')
          setTimeout(() => setCopied(false), 2000)
        } catch {
          toast.error('Could not copy link')
        }
      },
    },
  ]

  return (
    <section
      className="px-4 md:px-14 py-20 md:py-32 text-center"
      style={{
        borderTop: '1px solid var(--e-rule-2)',
        color: 'var(--e-cream)',
      }}
    >
      <div className="e-mono mb-8" style={{ color: 'var(--e-ochre)' }}>
        § 09 — NEXT MOVE
      </div>
      <h2
        className="e-display mx-auto"
        style={{
          fontSize: 'clamp(3.5rem, 11vw, 10rem)',
          lineHeight: 0.82,
          margin: '0 auto 48px',
          letterSpacing: '-0.035em',
          maxWidth: 1200,
        }}
      >
        READY TO
        <br />
        <span
          className="e-day-outline"
          style={{ fontSize: 'clamp(3.5rem, 11vw, 10rem)' }}
        >
          MOVE OUT?
        </span>
      </h2>
      <p
        className="e-body mx-auto"
        style={{
          fontSize: 'clamp(1rem, 1.4vw, 1.25rem)',
          color: 'var(--e-cream-mute)',
          maxWidth: 640,
          margin: '0 auto 60px',
          lineHeight: 1.5,
        }}
      >
        Seven-day hold on your dates. No commitment, no card. Reply on the
        channel that suits you.
      </p>

      {writeHref && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16 md:mb-20">
          <a
            href={writeHref}
            target={writeHref.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="e-btn inline-flex justify-center"
          >
            {writeLabel} <span className="arrow">→</span>
          </a>
          {callHref && (
            <a href={callHref} className="e-btn-ghost inline-flex justify-center">
              BOOK A CALL
            </a>
          )}
        </div>
      )}

      {hasAnyContact(contact) && (
        <div
          className="mx-auto pt-12 flex flex-col md:flex-row gap-5 md:gap-3 justify-between items-center"
          style={{ maxWidth: 880, borderTop: '1px solid var(--e-rule-2)' }}
        >
          <span className="e-mono" style={{ color: 'var(--e-ink-dim)' }}>
            SHARE PROPOSAL
          </span>
          <div className="flex flex-wrap gap-3 justify-center">
            {shareLinks.map((s) =>
              s.onClick ? (
                <button
                  key={s.label}
                  type="button"
                  onClick={s.onClick}
                  className="e-mono"
                  style={{
                    padding: '14px 20px',
                    border: '1px solid var(--e-rule-2)',
                    color: 'var(--e-cream)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {s.label}
                </button>
              ) : (
                <a
                  key={s.label}
                  href={s.href!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="e-mono"
                  style={{
                    padding: '14px 20px',
                    border: '1px solid var(--e-rule-2)',
                    color: 'var(--e-cream)',
                    textDecoration: 'none',
                  }}
                >
                  {s.label}
                </a>
              ),
            )}
          </div>
        </div>
      )}
    </section>
  )
}
