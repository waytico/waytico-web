'use client'

const ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'included', label: 'Included' },
  { id: 'map', label: 'Map' },
  { id: 'photos', label: 'Photos' },
  { id: 'price', label: 'Price' },
  { id: 'ratings', label: 'Ratings' },
  { id: 'host', label: 'Host' },
  { id: 'contact', label: 'Contact' },
]

/**
 * Atelier — sticky pill nav.
 *
 * Floats inside the page (mx-14, top-3) rather than spanning full width like
 * Journal's straight strip. Desktop only — mobile loses too much vertical
 * real estate to a fixed pill.
 */
export function AtelierNav() {
  return (
    <nav
      className="hidden md:flex sticky top-3 z-10 mx-14 mb-10 rounded-full px-5 py-2.5 justify-center gap-7"
      style={{
        background: 'white',
        boxShadow: '0 4px 24px rgba(20,20,20,0.08)',
        border: '1px solid var(--a-rule)',
      }}
    >
      {ITEMS.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="a-sans text-[13px] font-medium px-1 py-2"
          style={{ color: 'var(--a-ink-2)', textDecoration: 'none' }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}
