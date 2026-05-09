/**
 * Controlled vocabulary for `ai_categories` — frontend mirror of
 * `waytico-backend/src/lib/photo-categories.ts`.
 *
 * Used by the admin photo-bank edit form to render a multi-select. Kept
 * as a hand-mirrored copy rather than fetched at runtime so the edit
 * form has zero load latency. If the backend list grows, sync this
 * file — drift means new server-side categories won't be selectable in
 * the UI until ported here.
 */
export const PHOTO_CATEGORIES = [
  // Subject type
  'landmark',
  'architecture',
  'interior',
  'street_scene',
  'aerial',
  'landscape',
  'nature',
  'wildlife',
  'water_view',
  'mountain',
  'urban',
  'rural',
  'beach',
  'forest',
  'desert',
  // Activity
  'food',
  'drink',
  'restaurant_interior',
  'market',
  'transportation',
  'boat',
  'train',
  'aircraft',
  'people_activity',
  'sport',
  'wellness',
  // Composition
  'wide_shot',
  'closeup',
  'detail',
  'pattern',
  'sunrise',
  'sunset',
  'night',
  'aerial_drone',
  // Hospitality
  'hotel_exterior',
  'hotel_room',
  'lodge',
  'pool',
  'spa',
  // Cultural
  'religious_site',
  'museum',
  'historic_site',
  'art',
  'event',
  // Negative (cleanup signals)
  'screenshot',
  'document',
  'logo',
  'collage',
  'low_quality',
] as const

export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number]
