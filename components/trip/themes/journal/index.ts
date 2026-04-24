// Journal theme — per-theme blocks.
//
// Ordered top-to-bottom matching how they render on the trip page.
// Shared blocks (tasks, documents) are imported from ../shared and composed
// by trip-page-client.tsx around these per-theme components.

export { JournalNav } from './nav'
export { JournalHero } from './hero'
export { JournalOverview } from './overview'
export { JournalItinerary } from './itinerary'
export { JournalIncluded } from './included'
export { JournalMap } from './map'
export { JournalGallery } from './gallery'
export { JournalPrice } from './price'
export { JournalRatings } from './ratings'
export { JournalHost } from './host'
export { JournalOperator } from './operator'
export { JournalCTA } from './cta'
export { JournalTerms } from './terms'
export { JournalStickyCTA } from './sticky-cta'
