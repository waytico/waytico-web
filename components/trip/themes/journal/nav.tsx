'use client'

/**
 * Journal — sticky section nav.
 *
 * Shown only on md+ viewports (mobile is thumb-navigated and shouldn't lose
 * vertical space to a nav strip). Scroll-spy / active-section highlighting is
 * intentionally out of scope for 3c; see TZ-5 step-7 polish list.
 */
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

export function JournalNav() {
  return (
    <nav
      className="hidden md:flex justify-center gap-9 px-[72px] py-7 border-b sticky top-0 z-10"
      style={{
        background: 'var(--j-cream)',
        borderColor: 'var(--j-rule)',
      }}
    >
      {ITEMS.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="j-mono"
          style={{
            color: 'var(--j-ink-soft)',
            textDecoration: 'none',
          }}
        >
          {item.label}
        </a>
      ))}
    </nav>
  )
}
