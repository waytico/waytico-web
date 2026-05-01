'use client'

import type { ReactNode } from 'react'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { UI } from '@/lib/ui-strings'

type NavItem = { id: string; label: string; key: keyof ReturnType<typeof useVisibility> }

function useVisibility() {
  const ctx = useThemeCtxV2()
  return (
    ctx?.visibility ?? {
      overview: false,
      itinerary: false,
      accommodations: false,
      price: false,
      included: false,
      terms: false,
      contacts: false,
    }
  )
}

const ITEMS: NavItem[] = [
  { id: 'overview', label: UI.sectionLabels.overview, key: 'overview' },
  { id: 'itinerary', label: UI.sectionLabels.itinerary, key: 'itinerary' },
  { id: 'accommodations', label: UI.sectionLabels.accommodations, key: 'accommodations' },
  { id: 'price', label: UI.sectionLabels.price, key: 'price' },
  { id: 'included', label: UI.included, key: 'included' },
  { id: 'terms', label: UI.sectionLabels.terms, key: 'terms' },
  { id: 'contacts', label: UI.sectionLabels.contacts, key: 'contacts' },
]

const onNavClick = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * Magazine TripNav — anchor strip under the hero.
 *
 * Renders only sections that have content (or are forced visible in
 * owner mode by the same visibility flags TripNav uses). Self-hides
 * entirely when no section is visible.
 */
export function TripNav(): ReactNode {
  const visibility = useVisibility()
  const visibleItems = ITEMS.filter((item) => visibility[item.key])
  if (visibleItems.length === 0) return null

  return (
    <nav className="mag-nav" aria-label="Trip sections">
      <div className="mag-shell mag-nav__inner">
        {visibleItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={onNavClick(item.id)}
            className="mag-nav__link"
          >
            {item.label.toUpperCase()}
          </a>
        ))}
      </div>
    </nav>
  )
}
