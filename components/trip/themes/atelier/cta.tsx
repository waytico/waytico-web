'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { channelHref, hasAnyContact, type ResolvedOperatorContact } from '@/lib/operator-contact'

type AtelierCTAProps = {
  tripTitle: string
  shareUrl: string
  contact: ResolvedOperatorContact
}

/**
 * Atelier — CTA ("09 / Next").
 *
 * Teal-block section with centered display heading, lede, primary "Write"
 * button, and a divided share row (translucent white badges) for the
 * proposal URL itself.
 */
export function AtelierCTA({ tripTitle, shareUrl, contact }: AtelierCTAProps) {
  const [copied, setCopied] = useState(false)

  const writeHref =
    channelHref('email', contact.email) ||
    channelHref('whatsapp', contact.whatsapp) ||
    channelHref('telegram', contact.telegram) ||
    channelHref('phone', contact.phone) ||
    channelHref('website', contact.website)

  const writeLabel = contact.name
    ? `Write to ${contact.name.split(/\s+/)[0]}`
    : 'Write to operator'

  const encoded = encodeURIComponent(shareUrl)
  const shareText = encodeURIComponent(`${tripTitle} — ${shareUrl}`)

  const shareLinks: Array<{ label: string; href: string | null; onClick?: () => void }> = [
    { label: 'Email', href: `mailto:?subject=${encodeURIComponent(tripTitle)}&body=${shareText}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${shareText}` },
    {
      label: 'Telegram',
      href: `https://t.me/share/url?url=${encoded}&text=${encodeURIComponent(tripTitle)}`,
    },
    {
      label: copied ? 'Copied' : 'Copy link',
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
      className="px-4 md:px-14 py-16 md:py-24 text-center"
      style={{ background: 'var(--a-teal)', color: 'white' }}
    >
      <div
        className="a-eyebrow mb-6 justify-center"
        style={{ color: 'var(--a-sage)' }}
      >
        09 / Next
      </div>
      <h2
        className="a-display mx-auto"
        style={{
          fontSize: 'clamp(2.75rem, 8vw, 8.5rem)',
          lineHeight: 0.92,
          margin: '0 auto 36px',
          letterSpacing: '-0.035em',
          maxWidth: 1200,
        }}
      >
        Shall we
        <br />
        <span className="a-italic" style={{ color: 'var(--a-coral)' }}>
          hold your dates?
        </span>
      </h2>
      <p
        className="a-sans mx-auto"
        style={{
          fontSize: 'clamp(1rem, 1.4vw, 1.1875rem)',
          opacity: 0.85,
          maxWidth: 640,
          margin: '0 auto 56px',
          lineHeight: 1.6,
        }}
      >
        A reply in any channel opens a conversation. No commitment, no card —
        seven-day hold on your rooms.
      </p>

      {writeHref && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16 md:mb-18">
          <a
            href={writeHref}
            target={writeHref.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="a-btn inline-flex justify-center"
          >
            {writeLabel} <span className="arrow">→</span>
          </a>
        </div>
      )}

      {/* Share strip */}
      {hasAnyContact(contact) && (
        <div
          className="mx-auto pt-9 flex flex-col md:flex-row gap-4 md:gap-3 justify-center items-center"
          style={{ maxWidth: 720, borderTop: '1px solid rgba(255,255,255,0.2)' }}
        >
          <span
            className="a-mono mr-2"
            style={{ color: 'var(--a-sage)', alignSelf: 'center' }}
          >
            Share
          </span>
          <div className="flex flex-wrap gap-2.5 justify-center">
            {shareLinks.map((s) =>
              s.onClick ? (
                <button
                  key={s.label}
                  type="button"
                  onClick={s.onClick}
                  className="a-badge"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    border: 0,
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
                  className="a-badge"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
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
