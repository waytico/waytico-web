/**
 * Shared trip-page domain types.
 *
 * The themed components (Hero / Itinerary / Overview / Included / Price /
 * Terms) consume the project payload as `Project` plus a `media[]` array.
 * Editable fields are passed through via the `Mutations` bag — owner mode
 * forwards real callbacks, public mode forwards no-ops (or `undefined`).
 */

export type ProjectStatus = 'draft' | 'quoted' | 'active' | 'completed' | 'archived'

export type PricingMode = 'per_group' | 'per_traveler' | 'other'

export type Segment = {
  id: string
  sortOrder: number
  type: 'transport' | 'activity' | 'meal' | 'accommodation' | 'free_time' | 'other'
  title: string | null
  startTime: string | null
  endTime: string | null
  notes: string | null
  location: { name?: string | null; address?: string | null; latitude?: number | null; longitude?: number | null } | null
  contact: { name?: string | null; phone?: string | null; email?: string | null } | null
  reference: string | null
}

export type Day = {
  id: string
  dayNumber: number
  date?: string | null
  title: string | null
  description: string | null
}

export type Accommodation = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  sort_order: number
}

export type OperatorContact = {
  name?: string | null
  phone?: string | null
  email?: string | null
  whatsapp?: string | null
  telegram?: string | null
  website?: string | null
} | null

export type OwnerBrand = {
  brand_name?: string | null
  brand_email?: string | null
  brand_phone?: string | null
  brand_whatsapp?: string | null
  brand_telegram?: string | null
  brand_website?: string | null
  brand_logo_url?: string | null
  brand_tagline?: string | null
} | null

export type ProjectLite = {
  id: string
  slug: string
  status: ProjectStatus | string
  design_theme?: string | null
  language?: string | null
  title: string | null
  /** Short poetic subtitle in the hero (5-12 words). Replaces the long
   *  description on the rendered hero — description still feeds the Overview. */
  tagline: string | null
  description: string | null
  region: string | null
  country: string | null
  dates_start: string | null
  dates_end: string | null
  duration_days: number | null
  group_size: number | null
  activity_type: string | null
  price_per_person: number | null
  price_total: number | null
  currency: string | null
  /** Headline price render mode: per_group (default) shows total,
   *  per_traveler shows per-head, other uses pricing_label as the suffix.
   *  null = legacy row with no prices yet. */
  pricing_mode: PricingMode | null
  /** Custom suffix shown when pricing_mode='other'. */
  pricing_label: string | null
  included: string | null
  not_included: string | null
  terms: string | null
  itinerary: Day[]
  /** Per-trip override of the operator's contact channels. */
  operator_contact?: OperatorContact
  proposal_date?: string | null
  valid_until?: string | null
}

export type MediaLite = {
  id: string
  type?: 'photo' | 'document' | string
  url: string
  thumbnail_url?: string | null
  caption?: string | null
  placement?: string | null
  sort_order?: number | null
  day_id?: string | null
  visible_to_client?: boolean
}

/**
 * Owner-mode mutation handlers. Passed by `trip-page-client.tsx` (which owns
 * the data + auth). Themed components call them; they're undefined for
 * public viewers — themed components branch on `editable` to decide whether
 * to render an EditableField or static text.
 */
export type Mutations = {
  saveProjectPatch: (patch: Record<string, unknown>) => Promise<boolean>
  saveDayPatch: (dayId: string, patch: Record<string, unknown>) => Promise<boolean>
  /** Accommodations are a separate entity (not nested per-day). */
  saveAccommodationCreate: (input: { name: string; description?: string | null; imageUrl?: string | null }) => Promise<Accommodation | null>
  saveAccommodationPatch: (id: string, patch: Record<string, unknown>) => Promise<boolean>
  saveAccommodationDelete: (id: string) => Promise<boolean>
}

