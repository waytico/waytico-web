'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { channelHref, hasAnyContact, type ResolvedOperatorContact } from '@/lib/operator-contact'

type JournalCTAProps = {
  tripTitle: string
  shareUrl: string
  contact: ResolvedOperatorContact
  /** When true, the "Write" button links to the primary contact channel. */
  status: string
}

/**
 * Journal — CTA / Share block (Chapter IX · "Your move").
 *
 * Bottom funnel: large "Shall we…" heading, primary "Write to operator"
 * button that opens the best available contact channel (email → whatsapp →
 * telegram → phone → website), and a share row with Email / WhatsApp /
 * Telegram / Copy-link.
 *
 * Share targets point at the *proposal URL*, not at the operator. "Write"
 * targets the operator; "Share" forwards the page to someone else.
 */
export function JournalCTA({ tripTitle, shareUrl, contact }: JournalCTAProps) {
  const [copied, setCopied] = useState(false)

  const writeHref =
    channelHref('email', contact.email) ||
    channelHref('whatsapp', contact.whatsapp) ||
    channelHref('telegram', contact.telegram) ||
    channelHref('phone', contact.phone) ||
    channelHref('website', contact.website)

  const writeLabel = contact.name ? `Write to ${contact.name.split(/\s+/)[0]}` : 'Write to operator'

  const encoded = encodeURIComponent(shareUrl)
  const shareText = encodeURIComponent(`${tripTitle} — ${shareUrl}`)

  const shareLinks: Array<{ label: string; href: string | null; onClick?: () => void }> = [
    {
      label: 'Email',
      href: `mailto:?subject=${encodeURIComponent(tripTitle)}&body=${shareText}`,
    },
    {
      label: 'WhatsApp',
      href: `https://wa.me/?text=${shareText}`,
    },
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
      className="j-section px-6 md:px-[72px] py-20 md:py-[140px] text-center"
    >
      <div className="j-mono mb-7" style={{ color: 'var(--j-terra)' }}>
        ◆ &nbsp; Your move
      </div>
      <h2
        className="j-serif mx-auto"
        style={{
          fontSize: 'clamp(2.5rem, 7vw, 6.5rem)',
          lineHeight: 0.95,
          margin: '0 auto 48px',
          letterSpacing: '-0.02em',
          maxWidth: 1100,
        }}
      >
        Shall we <em>reserve your rooms?</em>
      </h2>
      <p
        className="j-serif mx-auto"
        style={{
          fontSize: 'clamp(1.05rem, 1.6vw, 1.375rem)',
          color: 'var(--j-ink-soft)',
          maxWidth: 680,
          margin: '0 auto 56px',
          fontWeight: 300,
          lineHeight: 1.5,
        }}
      >
        A reply in any channel opens a conversation — no commitment, no card.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-20">
        {writeHref && (
          <a
            href={writeHref}
            target={writeHref.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="j-btn-primary inline-flex justify-center"
          >
            {writeLabel} <span className="arrow">→</span>
          </a>
        )}
      </div>

      {/* Share row */}
      {hasAnyContact(contact) && (
        <div
          className="mx-auto pt-12 border-t flex flex-col md:flex-row gap-5 md:gap-10 justify-center items-center"
          style={{ maxWidth: 800, borderColor: 'var(--j-rule)' }}
        >
          <div
            className="j-mono"
            style={{ color: 'var(--j-ink-mute)' }}
          >
            Share this proposal
          </div>
          <div className="flex flex-wrap gap-5 md:gap-10 justify-center">
            {shareLinks.map((s) =>
              s.onClick ? (
                <button
                  key={s.label}
                  type="button"
                  onClick={s.onClick}
                  className="j-mono bg-transparent border-0 cursor-pointer hover:underline"
                  style={{
                    color: 'var(--j-ink)',
                    borderBottom: '1px solid var(--j-terra)',
                    paddingBottom: 2,
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
                  className="j-mono hover:underline"
                  style={{
                    color: 'var(--j-ink)',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--j-terra)',
                    paddingBottom: 2,
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
