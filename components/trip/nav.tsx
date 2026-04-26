import { UI } from '@/lib/ui-strings'

/**
 * Sticky brand + section anchor bar that sits inside <ThemeRoot>.
 *
 * Per TZ-6 §6.1: structure is identical across themes; per-theme tokens
 * (font-family, density, accent rule) come from styles/themes.css.
 * Hidden on mobile via the existing CSS in themes.css.
 */
export function TripNav() {
  const items: Array<{ href: string; label: string }> = [
    { href: '#overview', label: UI.sectionLabels.overview },
    { href: '#itinerary', label: UI.sectionLabels.itinerary },
    { href: '#included', label: UI.sectionLabels.included },
    { href: '#price', label: UI.sectionLabels.price },
  ]

  return (
    <nav className="tp-nav">
      <div className="tp-nav-inner">
        <span className="tp-nav-brand">Waytico</span>
        <div className="tp-nav-links">
          {items.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}
