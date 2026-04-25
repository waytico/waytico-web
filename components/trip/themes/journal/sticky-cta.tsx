'use client'

import { MessageCircle } from 'lucide-react'
import ActivateButton from '@/components/activate-button'
import { formatPriceShort } from '@/lib/trip-format'
import {
  channelHref,
  hasAnyContact,
  type ResolvedOperatorContact,
} from '@/lib/operator-contact'

type JournalStickyCTAProps = {
  projectId: string
  status: string
  pricePerPerson: number | null | undefined
  currency: string | null | undefined
  /**
   * Resolved operator contact — used to drive the "Contact host" button
   * on active-status trips. Falls through email → whatsapp → telegram
   * → phone → website.
   */
  contact?: ResolvedOperatorContact
}

function pickContactHref(contact: ResolvedOperatorContact | undefined): string | null {
  if (!contact) return null
  return (
    channelHref('email', contact.email) ||
    channelHref('whatsapp', contact.whatsapp) ||
    channelHref('telegram', contact.telegram) ||
    channelHref('phone', contact.phone) ||
    channelHref('website', contact.website)
  )
}

/**
 * Journal — mobile sticky bottom CTA bar.
 *
 * Two states (mobile only):
 *   - status='quoted'  → "From X / Activate" (drives the Stripe flow)
 *   - status='active'  → "Contact host" (mailto/wa.me/tg/phone) when at
 *     least one channel resolves; hidden when no contact at all
 *   - other statuses (draft / completed / archived) → hidden
 */
export function JournalStickyCTA({
  projectId,
  status,
  pricePerPerson,
  currency,
  contact,
}: JournalStickyCTAProps) {
  if (!projectId) return null

  if (status === 'quoted') {
    const priceText = formatPriceShort(pricePerPerson, currency)
    return (
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-4 py-3 flex items-center gap-3 border-t"
        style={{
          background: 'var(--j-cream)',
          borderColor: 'var(--j-rule)',
          boxShadow: '0 -8px 24px rgba(28,24,19,0.06)',
        }}
      >
        {priceText && (
          <div className="flex-1">
            <div
              className="j-mono"
              style={{ color: 'var(--j-ink-mute)', fontSize: 9 }}
            >
              From
            </div>
            <div
              className="j-serif"
              style={{ fontSize: 22, lineHeight: 1, color: 'var(--j-ink)' }}
            >
              {priceText}{' '}
              <span
                className="j-serif j-italic"
                style={{ fontSize: 12, color: 'var(--j-ink-mute)' }}
              >
                / person
              </span>
            </div>
          </div>
        )}
        <ActivateButton projectId={projectId} publicStatus={status} variant="compact" />
      </div>
    )
  }

  if (status === 'active') {
    if (!contact || !hasAnyContact(contact)) return null
    const href = pickContactHref(contact)
    if (!href) return null
    const label = contact?.name
      ? `Contact ${contact.name.split(/\s+/)[0]}`
      : 'Contact host'
    return (
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-4 py-3 flex items-center gap-3 border-t"
        style={{
          background: 'var(--j-cream)',
          borderColor: 'var(--j-rule)',
          boxShadow: '0 -8px 24px rgba(28,24,19,0.06)',
        }}
      >
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
          style={{
            background: 'var(--j-accent)',
            color: 'var(--j-cream)',
          }}
        >
          <MessageCircle className="w-4 h-4" />
          {label}
        </a>
      </div>
    )
  }

  return null
}
