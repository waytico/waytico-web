'use client'

import type { SectionId } from '@/hooks/use-scroll-spy'

/**
 * Journal — sticky section nav.
 *
 * Shown only on md+ viewports (mobile is thumb-navigated and shouldn't lose
 * vertical space to a nav strip). Active item driven by `activeSection`
 * (scroll-spy, computed in trip-page-client and passed in).
 */
const ITEMS: Array<{ id: SectionId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'included', label: 'Included' },
  { id: 'price', label: 'Price' },
]

type Props = {
  activeSection?: SectionId | null
}

export function JournalNav({ activeSection }: Props) {
  return (
    <nav
      className="hidden md:flex justify-center gap-9 px-[72px] py-7 border-b sticky top-0 z-10"
      style={{
        background: 'var(--j-cream)',
        borderColor: 'var(--j-rule)',
      }}
    >
      {ITEMS.map((item) => {
        const active = activeSection === item.id
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="j-mono transition-colors"
            style={{
              color: active ? 'var(--j-accent)' : 'var(--j-ink-soft)',
              textDecoration: 'none',
              fontWeight: active ? 600 : undefined,
            }}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}

