'use client'

import { UI } from '@/lib/ui-strings'
import { ContactAgentMenu } from './contact-agent-menu'
import type { OperatorContact, OwnerBrand } from './trip-types'

/**
 * Magazine TopNav — desktop ≥1024px sticky navigation.
 *
 * Lives only inside `<ThemeRoot data-theme="magazine">` (rendered conditionally
 * from trip-page-client when resolvedTheme === 'magazine'). On <1024px the
 * whole bar is hidden via CSS — the mobile counterpart (StickyBar) is added
 * in pass B together with the rest of the themed sections.
 *
 * Three slots: brand wordmark on the left, visibility-aware nav links in
 * the centre, INQUIRE pill on the right (wraps the existing
 * `ContactAgentMenu` so the resolved-channels logic stays canonical — the
 * Magazine pass only restyles the trigger via CSS scope and overrides the
 * trigger label).
 */
type Visibility = {
  overview: boolean
  itinerary: boolean
  accommodations: boolean
  included: boolean
  price: boolean
  terms: boolean
  contacts: boolean
}

type Props = {
  owner: OwnerBrand
  operatorContact: OperatorContact
  visibility?: Partial<Visibility>
  /** Reserved for future i18n. Currently unused — section labels are
   *  sourced from `UI.sectionLabels` so they stay in sync with the rest
   *  of the trip page. */
  currentLanguage?: string | null
}

const ITEMS: Array<{ key: keyof Visibility; href: string; anchor: string; label: string }> = [
  { key: 'overview',       href: '#overview',       anchor: 'overview',       label: UI.sectionLabels.overview },
  { key: 'itinerary',      href: '#itinerary',      anchor: 'itinerary',      label: UI.sectionLabels.itinerary },
  { key: 'accommodations', href: '#accommodations', anchor: 'accommodations', label: UI.sectionLabels.accommodations },
  { key: 'included',       href: '#included',       anchor: 'included',       label: UI.sectionLabels.included },
  { key: 'price',          href: '#price',          anchor: 'price',          label: UI.sectionLabels.price },
  { key: 'terms',          href: '#terms',          anchor: 'terms',          label: UI.sectionLabels.terms },
  { key: 'contacts',       href: '#contacts',       anchor: 'contacts',       label: UI.sectionLabels.contacts },
]

export function MagazineTopNav({ owner, operatorContact, visibility }: Props) {
  // Default: all visible (legacy callers w/ no visibility prop see all 7).
  // Public viewers pass real flags; only true items render.
  const v: Visibility = {
    overview:       visibility?.overview       ?? true,
    itinerary:      visibility?.itinerary      ?? true,
    accommodations: visibility?.accommodations ?? true,
    included:       visibility?.included       ?? true,
    price:          visibility?.price          ?? true,
    terms:          visibility?.terms          ?? true,
    contacts:       visibility?.contacts       ?? true,
  }
  const visible = ITEMS.filter((it) => v[it.key])

  // Brand wordmark — falls back to "Waytico" when the operator hasn't
  // filled their brand profile yet, so the bar always has a left anchor.
  const wordmark = (owner?.brand_name as string | null) || 'Waytico'

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, anchor: string) {
    e.preventDefault()
    if (typeof document === 'undefined') return
    const el = document.getElementById(anchor)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="tp-mag-topnav" aria-label="Magazine sections">
      <div className="tp-mag-topnav__inner">
        <span className="tp-mag-topnav__brand">{wordmark}</span>
        {visible.length > 0 && (
          <div className="tp-mag-topnav__links">
            {visible.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.anchor)}
                className="tp-mag-topnav__link"
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
        <div className="tp-mag-topnav__inquire">
          <ContactAgentMenu
            owner={owner}
            operatorContact={operatorContact}
            onPhoto={false}
            label="Inquire"
          />
        </div>
      </div>
    </nav>
  )
}
