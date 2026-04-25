'use client'

const ITEMS = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'itinerary', label: 'ITINERARY' },
  { id: 'included', label: 'INCLUDED' },
  { id: 'map', label: 'MAP' },
  { id: 'photos', label: 'PHOTOS' },
  { id: 'price', label: 'PRICE' },
  { id: 'ratings', label: 'RATINGS' },
  { id: 'host', label: 'HOST' },
  { id: 'contact', label: 'CONTACT' },
]

/**
 * Expedition — sticky section nav.
 *
 * Dark bar with mono "0N / SECTION" pairs, ochre accent on first item.
 * Desktop only (mobile relies on the sticky bottom bar for navigation).
 */
export function ExpeditionNav() {
  return (
    <nav
      className="hidden md:flex sticky top-0 z-10 justify-center gap-9 px-14 py-5 border-b"
      style={{
        background: 'var(--e-bg-deep)',
        borderColor: 'var(--e-rule-2)',
      }}
    >
      {ITEMS.map((item, i) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="e-mono"
          style={{
            color: i === 0 ? 'var(--e-ochre)' : 'var(--e-cream-mute)',
            textDecoration: 'none',
          }}
        >
          {String(i + 1).padStart(2, '0')} / {item.label}
        </a>
      ))}
    </nav>
  )
}
