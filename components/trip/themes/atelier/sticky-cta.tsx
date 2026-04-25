'use client'

import { MessageCircle } from 'lucide-react'
import ActivateButton from '@/components/activate-button'
import { formatPriceShort } from '@/lib/trip-format'
import {
  channelHref,
  hasAnyContact,
  type ResolvedOperatorContact,
} from '@/lib/operator-contact'

type AtelierStickyCTAProps = {
  projectId: string
  status: string
  pricePerPerson: number | null | undefined
  currency: string | null | undefined
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
 * Atelier — mobile sticky bottom CTA bar.
 *
 * Same two-state behaviour as Journal:
 *   - quoted → From / Activate
 *   - active → Contact host (when at least one channel resolves)
 *   - other → hidden
 */
export function AtelierStickyCTA({
  projectId,
  status,
  pricePerPerson,
  currency,
  contact,
}: AtelierStickyCTAProps) {
  if (!projectId) return null

  if (status === 'quoted') {
    const priceText = formatPriceShort(pricePerPerson, currency)
    return (
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-3 py-2.5 flex items-center gap-2.5 border-t"
        style={{
          background: 'white',
          borderColor: 'var(--a-rule)',
          boxShadow: '0 -8px 24px rgba(20,20,20,0.06)',
        }}
      >
        {priceText && (
          <div className="flex-1">
            <div className="a-mono" style={{ color: 'var(--a-mute)', fontSize: 8 }}>
              From
            </div>
            <div
              className="a-display"
              style={{ fontSize: 22, lineHeight: 1, color: 'var(--a-teal)' }}
            >
              {priceText}
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
      ? `Write to ${contact.name.split(/\s+/)[0]}`
      : 'Contact host'
    return (
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-3 py-2.5 flex items-center gap-2.5 border-t"
        style={{
          background: 'white',
          borderColor: 'var(--a-rule)',
          boxShadow: '0 -8px 24px rgba(20,20,20,0.06)',
        }}
      >
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="a-btn flex-1 justify-center"
        >
          <MessageCircle className="w-4 h-4" />
          {label}
        </a>
      </div>
    )
  }

  return null
}
