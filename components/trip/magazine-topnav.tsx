'use client'

import { getStrings } from '@/lib/i18n/strings'

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
 *
 * "What's included" was removed (2026-05-04): on Magazine the included /
 * not-included copy now lives inside the right column of the Price block,
 * so the Price anchor covers both. Other themes still surface "Included"
 * via the editorial TripNav.
 */
type Visibility = {
  overview: boolean
  itinerary: boolean
  accommodations: boolean
  price: boolean
  terms: boolean
  contacts: boolean
}

type Props = {
  visibility?: Partial<Visibility>
  /** ISO 639-1 language for nav-label translations. Resolved via the
   *  i18n dictionary; unknown values fall back to English. */
  currentLanguage?: string | null
}

export function MagazineTopNav({ visibility, currentLanguage }: Props) {
  const t = getStrings(currentLanguage)
  const items: Array<{ key: keyof Visibility; href: string; anchor: string; label: string }> = [
    { key: 'overview',       href: '#overview',       anchor: 'overview',       label: t.sectionLabels.overview },
    { key: 'itinerary',      href: '#itinerary',      anchor: 'itinerary',      label: t.sectionLabels.itinerary },
    { key: 'accommodations', href: '#accommodations', anchor: 'accommodations', label: t.sectionLabels.accommodations },
    { key: 'price',          href: '#price',          anchor: 'price',          label: t.sectionLabels.price },
    { key: 'terms',          href: '#terms',          anchor: 'terms',          label: t.sectionLabels.terms },
    { key: 'contacts',       href: '#contacts',       anchor: 'contacts',       label: t.sectionLabels.contacts },
  ]

  // Default: all visible (legacy callers w/ no visibility prop see them all).
  // Public viewers pass real flags; only true items render.
  const v: Visibility = {
    overview:       visibility?.overview       ?? true,
    itinerary:      visibility?.itinerary      ?? true,
    accommodations: visibility?.accommodations ?? true,
    price:          visibility?.price          ?? true,
    terms:          visibility?.terms          ?? true,
    contacts:       visibility?.contacts       ?? true,
  }
  const visible = items.filter((it) => v[it.key])
  if (visible.length === 0) return null

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, anchor: string) {
    e.preventDefault()
    if (typeof document === 'undefined') return
    const el = document.getElementById(anchor)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav className="tp-mag-topnav" aria-label={t.a11y.magazineSections}>
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
