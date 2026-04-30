/**
 * Magazine theme — composition root.
 *
 * Renders the section sequence from MAGAZINE-SPEC §A:
 *   Hero → Overview → Itinerary → Accommodations → Included → Price →
 *   Terms → Contacts.
 *
 * Each section handles its own empty state internally (returns null
 * when its data is missing). The wrapper sets data-theme="magazine"
 * so tokens.css scopes apply, and uses CREAM as the page background.
 *
 * Stage 2 — public mode only. Owner overlays / EditableField / drag-drop
 * land in stage 3.
 */
import './tokens.css'
import type { ThemePropsV2 } from '@/types/theme-v2'

import { Hero } from './hero'
import { Overview } from './overview'
import { Itinerary } from './itinerary'
import { Accommodations } from './accommodations'
import { Included } from './included'
import { Price } from './price'
import { Terms } from './terms'
import { Contacts } from './contacts'

export default function MagazineTripPage(props: ThemePropsV2) {
  return (
    <div data-theme="magazine" className="mag-root">
      <Hero {...props} />
      <Overview {...props} />
      <Itinerary {...props} />
      <Accommodations {...props} />
      <Included {...props} />
      <Price {...props} />
      <Terms {...props} />
      <Contacts {...props} />
    </div>
  )
}
