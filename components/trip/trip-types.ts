/**
 * Shared trip-page domain types.
 *
 * The themed components (Hero / Itinerary / Overview / Included / Price /
 * Terms) consume the project payload as `Project` plus a `media[]` array.
 * Editable fields are passed through via the `Mutations` bag — owner mode
 * forwards real callbacks, public mode forwards no-ops (or `undefined`).
 */

export type ProjectStatus = 'draft' | 'quoted' | 'active' | 'completed' | 'archived'

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
  accommodation: { name: string } | string | null
  highlights?: string[] | null
  segments?: Segment[]
}

export type ProjectLite = {
  id: string
  slug: string
  status: ProjectStatus | string
  design_theme?: string | null
  language?: string | null
  title: string | null
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
  included: string | null
  not_included: string | null
  terms: string | null
  itinerary: Day[]
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
  saveSegmentPatch: (dayId: string, segmentId: string, patch: Record<string, unknown>) => Promise<boolean>
}

