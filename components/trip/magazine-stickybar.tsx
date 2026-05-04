'use client'

import { useEffect, useState } from 'react'
import { UI } from '@/lib/ui-strings'
import { fmtPrice } from '@/lib/trip-format'
import { ContactAgentMenu } from './contact-agent-menu'
import type {
  PricingMode,
  OperatorContact,
  OwnerBrand,
} from './trip-types'

/**
 * Magazine mobile StickyBar — fixed bottom row that surfaces the FROM
 * price + INQUIRE call-to-action when the desktop TopNav INQUIRE pill
 * is hidden (≤1023px). Mounts in `<ThemeRoot data-theme="magazine">`'s
 * page output but is positioned fixed, so it works the same regardless
 * of which themed section the viewer is currently looking at.
 *
 * Render contract:
 *   - Mobile only (display:none on ≥1024px) — desktop has the TopNav.
 *   - Renders nothing when both prices are null (no headline = no bar).
 *   - Suppressed entirely on owner pages where TripCommandBar already
 *     occupies the same sticky-bottom region (collision avoidance).
 *     trip-page-client gates this via `visible` — see wire-in.
 *
 * Pricing mode handling mirrors price.tsx so the bar's headline always
 * matches the Price block:
 *   per_group     → priceTotal,        suffix 'for the group'
 *   per_traveler  → pricePerPerson,    suffix 'per traveler'
 *   other         → priceTotal,        suffix pricingLabel || 'for the group'
 *
 * INQUIRE wraps the canonical ContactAgentMenu (channel resolution and
 * dropdown behaviour shared with TopNav and Price's CTA pill); the
 * trigger is restyled via CSS scope under [data-theme='magazine'].
 */
type Props = {
  pricingMode: PricingMode | null
  pricingLabel: string | null
  pricePerPerson: number | null
  priceTotal: number | null
  currency: string | null
  owner: OwnerBrand
  operatorContact: OperatorContact
  /** Outer gate — false suppresses the bar entirely (e.g. on owner
   *  pages where TripCommandBar takes the sticky-bottom slot). */
  visible: boolean
}

export function MagazineStickyBar({
  pricingMode,
  pricingLabel,
  pricePerPerson,
  priceTotal,
  currency,
  owner,
  operatorContact,
  visible,
}: Props) {
  // IntersectionObserver gate: when the page footer is even partially
  // in view, the sticky bar slides off-screen so it doesn't sit on
  // top of the footer's product nav / minimal strip and create the
  // visual artefact of a cream cap above the dark slab. Mirrors the
  // pattern TripCommandBar uses against the same #site-footer target.
  const [footerVisible, setFooterVisible] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const target = document.getElementById('site-footer')
    if (!target) return

    const io = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: '0px 0px 0px 0px', threshold: 0 },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [])

  if (!visible) return null

  const mode: PricingMode = pricingMode ?? 'per_group'
  const headline = mode === 'per_traveler' ? pricePerPerson : priceTotal
  const headlineFormatted = fmtPrice(headline, currency || 'USD')

  // Render-condition: a StickyBar with no price is just chrome.
  if (!headlineFormatted) return null

  const suffix =
    mode === 'per_traveler'
      ? UI.perTraveler
      : mode === 'other'
        ? pricingLabel || UI.forTheGroup
        : UI.forTheGroup

  return (
    <div
      className={
        'tp-mag-stickybar' +
        (footerVisible ? ' tp-mag-stickybar--hidden' : '')
      }
      role="region"
      aria-label="Pricing and inquiry"
      aria-hidden={footerVisible || undefined}
    >
      <div className="tp-mag-stickybar__inner">
        <div className="tp-mag-stickybar__price">
          <span className="tp-mag-stickybar__from">FROM</span>
          <span className="tp-mag-stickybar__amount">{headlineFormatted}</span>
          <span className="tp-mag-stickybar__suffix">{suffix.toUpperCase()}</span>
        </div>
        <div className="tp-mag-stickybar__inquire">
          <ContactAgentMenu
            owner={owner}
            operatorContact={operatorContact}
            onPhoto={false}
            label="Inquire"
          />
        </div>
      </div>
    </div>
  )
}
