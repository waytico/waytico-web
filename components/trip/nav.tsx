import { UI } from '@/lib/ui-strings'

/**
 * Section anchor bar that sits inside <ThemeRoot>, between hero and the
 * first content section.
 *
 * Items mirror what's actually rendered on the page below: each section
 * is conditionally hidden (e.g. Accommodations only appears when there
 * are cards), so the nav has to take the same flags and skip the same
 * items. Otherwise we end up with an anchor that scrolls to a phantom
 * section. Order matches the on-page order:
 *
 *   Overview → Itinerary → Accommodations → Price → Included → Terms → Contacts
 *
 * Per TZ-6 §6.1: structure is identical across themes; per-theme tokens
 * (font-family, density, accent rule) come from styles/themes.css.
 * Hidden on mobile via the existing CSS in themes.css.
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

export function TripNav({ visibility }: { visibility?: Partial<Visibility> }) {
  // Default: all visible. Public viewers pass real flags; legacy callers
  // (unlikely after this change) keep the old behaviour.
  const v: Visibility = {
    overview: visibility?.overview ?? true,
    itinerary: visibility?.itinerary ?? true,
    accommodations: visibility?.accommodations ?? true,
    price: visibility?.price ?? true,
    included: visibility?.included ?? true,
    terms: visibility?.terms ?? true,
    contacts: visibility?.contacts ?? true,
  }

  const items: Array<{ key: keyof Visibility; href: string; label: string }> = [
    { key: 'overview', href: '#overview', label: UI.sectionLabels.overview },
    { key: 'itinerary', href: '#itinerary', label: UI.sectionLabels.itinerary },
    { key: 'accommodations', href: '#accommodations', label: UI.sectionLabels.accommodations },
    { key: 'price', href: '#price', label: UI.sectionLabels.price },
    { key: 'included', href: '#included', label: UI.sectionLabels.included },
    { key: 'terms', href: '#terms', label: UI.sectionLabels.terms },
    { key: 'contacts', href: '#contacts', label: UI.sectionLabels.contacts },
  ]

  const visible = items.filter((it) => v[it.key])
  if (visible.length === 0) return null

  return (
    <nav className="tp-nav">
      <div className="tp-nav-inner">
        <div className="tp-nav-links">
          {visible.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
