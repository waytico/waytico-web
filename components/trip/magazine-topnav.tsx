'use client'

import { UI } from '@/lib/ui-strings'

/**
 * Magazine TopNav — desktop ≥1024px sticky navigation.
 *
 * Lives only inside `<ThemeRoot data-theme="magazine">` (rendered conditionally
 * from trip-page-client when resolvedTheme === 'magazine'). On <1024px the
 * whole bar is hidden via CSS — mobile uses MagazineStickyBar (FROM-price +
 * INQUIRE pill at the bottom) instead.
 *
 * Single slot: visibility-aware nav links centred across the bar. The brand
 * wordmark and INQUIRE pill that used to sit on the left and right were
 * removed — brand identity is already carried by the page chrome (Header /
 * footer / hero), and a contact CTA in the topnav duplicates the one in the
 * Contacts section + the StickyBar on mobile + the in-hero ContactAgentMenu.
 *
 * Order matches the on-page render order in trip-page-client.tsx so anchor
 * scrolling moves the viewport in the natural reading direction.
 */
type Visibility = {
  overview: boolean
  itinerary: boolean
  accommodations: boolean
  price: boolean
  included: boolean
  terms: boolean
  contacts: boolean
}

type Props = {
  visibility?: Partial<Visibility>
  /** Reserved for future i18n. Currently unused — section labels come from
   *  `UI.sectionLabels` so they stay in sync with the rest of the trip page. */
  currentLanguage?: string | null
}

const ITEMS: Array<{ key: keyof Visibility; href: string; anchor: string; label: string }> = [
  { key: 'overview',       href: '#overview',       anchor: 'overview',       label: UI.sectionLabels.overview },
  { key: 'itinerary',      href: '#itinerary',      anchor: 'itinerary',      label: UI.sectionLabels.itinerary },
  { key: 'accommodations', href: '#accommodations', anchor: 'accommodations', label: UI.sectionLabels.accommodations },
  { key: 'price',          href: '#price',          anchor: 'price',          label: UI.sectionLabels.price },
  { key: 'included',       href: '#included',       anchor: 'included',       label: UI.sectionLabels.included },
  { key: 'terms',          href: '#terms',          anchor: 'terms',          label: UI.sectionLabels.terms },
  { key: 'contacts',       href: '#contacts',       anchor: 'contacts',       label: UI.sectionLabels.contacts },
]

export function MagazineTopNav({ visibility }: Props) {
  // Default: all visible (legacy callers w/ no visibility prop see them all).
  // Public viewers pass real flags; only true items render.
  const v: Visibility = {
    overview:       visibility?.overview       ?? true,
    itinerary:      visibility?.itinerary      ?? true,
    accommodations: visibility?.accommodations ?? true,
    price:          visibility?.price          ?? true,
    included:       visibility?.included       ?? true,
    terms:          visibility?.terms          ?? true,
    contacts:       visibility?.contacts       ?? true,
  }
  const visible = ITEMS.filter((it) => v[it.key])
  if (visible.length === 0) return null

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, anchor: string) {
    e.preventDefault()
    if (typeof document === 'undefined') return
    const el = document.getElementById(anchor)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="tp-mag-topnav" aria-label="Magazine sections">
      <div className="tp-mag-topnav__inner">
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
      </div>
    </nav>
  )
}
