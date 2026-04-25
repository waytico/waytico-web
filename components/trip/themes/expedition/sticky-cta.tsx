'use client'

import { MessageCircle } from 'lucide-react'
import ActivateButton from '@/components/activate-button'
import { formatPriceShort } from '@/lib/trip-format'
import {
  channelHref,
  hasAnyContact,
  type ResolvedOperatorContact,
} from '@/lib/operator-contact'

type ExpeditionStickyCTAProps = {
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
 * Expedition — mobile sticky bottom CTA bar.
 *
 * Two-state, dark, mobile only:
 *   - quoted → FROM / Activate (ochre)
 *   - active → CONTACT HOST (ochre fill)
 *   - other → hidden
 */
export function ExpeditionStickyCTA({
  projectId,
  status,
  pricePerPerson,
  currency,
  contact,
}: ExpeditionStickyCTAProps) {
  if (!projectId) return null

  if (status === 'quoted') {
    const priceText = formatPriceShort(pricePerPerson, currency)
    return (
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-3 py-2.5 flex items-center gap-3"
        style={{
          background: 'var(--e-bg-deep)',
          borderTop: '1px solid var(--e-rule-2)',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
        }}
      >
        {priceText && (
          <div className="flex-1">
            <div
              className="e-mono"
              style={{ color: 'var(--e-ink-dim)', fontSize: 8 }}
            >
              FROM
            </div>
            <div
              className="e-display"
              style={{
                fontSize: 22,
                lineHeight: 1,
                color: 'var(--e-ochre)',
              }}
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
      ? `WRITE TO ${contact.name.split(/\s+/)[0].toUpperCase()}`
      : 'CONTACT HOST'
    return (
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-3 py-2.5 flex items-center gap-3"
        style={{
          background: 'var(--e-bg-deep)',
          borderTop: '1px solid var(--e-rule-2)',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
        }}
      >
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="e-btn flex-1 justify-center"
        >
          <MessageCircle className="w-4 h-4" />
          {label}
        </a>
      </div>
    )
  }

  return null
}
