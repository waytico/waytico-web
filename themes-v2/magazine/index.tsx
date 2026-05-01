import './tokens.css'
import type { ThemePropsV2 } from '@/types/theme-v2'

import { Hero } from './hero'
import { TripNav } from './nav'
import { Overview } from './overview'
import { Itinerary } from './itinerary'
import { Accommodations } from './accommodations'
import { Included } from './included'
import { Price } from './price'
import { Terms } from './terms'
import { Contacts } from './contacts'
import { ActiveSections } from './active-sections'
import { WhatToBring } from './what-to-bring'

export default function MagazineTripPage(props: ThemePropsV2) {
  const isActive = props.data.project.status === 'active'
  return (
    <div data-theme="magazine" className="mag-root">
      <Hero {...props} />
      <TripNav />
      <Overview {...props} />
      <Itinerary {...props} />
      <Accommodations {...props} />
      <Price {...props} />
      <Included {...props} />
      <Terms {...props} />
      <Contacts {...props} />
      {isActive && (
        <>
          <ActiveSections {...props} />
          <WhatToBring {...props} />
        </>
      )}
    </div>
  )
}
