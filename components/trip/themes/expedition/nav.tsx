'use client'

import type { SectionId } from '@/hooks/use-scroll-spy'

const ITEMS: Array<{ id: SectionId; label: string }> = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'itinerary', label: 'ITINERARY' },
  { id: 'included', label: 'INCLUDED' },
  { id: 'price', label: 'PRICE' },
]

type Props = {
  activeSection?: SectionId | null
}

/**
 * Expedition — sticky section nav.
 *
 * Dark bar with mono "0N / SECTION" pairs. Ochre on active item via
 * scroll-spy. Desktop only.
 */
export function ExpeditionNav({ activeSection }: Props) {
  return (
    <nav
      className="hidden md:flex sticky top-0 z-10 justify-center gap-9 px-14 py-5 border-b"
      style={{
        background: 'var(--e-bg-deep)',
        borderColor: 'var(--e-rule-2)',
      }}
    >
      {ITEMS.map((item, i) => {
        const active = activeSection === item.id
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="e-mono transition-colors"
            style={{
              color: active ? 'var(--e-ochre)' : 'var(--e-cream-mute)',
              textDecoration: 'none',
            }}
          >
            {String(i + 1).padStart(2, '0')} / {item.label}
          </a>
        )
      })}
    </nav>
  )
}

