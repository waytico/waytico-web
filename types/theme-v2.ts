/**
 * Trip page v2 — theme contract and duplicated domain types.
 *
 * Все типы trip data собраны здесь, чтобы быть независимыми от
 * `components/trip/trip-types.ts` (это код старой ветки). Поля и формы
 * такие же — это контракт публичного API, он одинаковый, описан дважды.
 *
 * После Этапа 7 (cleanup) старая ветка удаляется и этот файл становится
 * `types/theme.ts`.
 */

import type { ComponentType } from 'react'

// ─── Domain types (duplicates of components/trip/trip-types.ts) ────────────

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
  address?: string | null
  instagram?: string | null
  facebook?: string | null
  youtube?: string | null
  tiktok?: string | null
  hidden_channels?: string[] | null
} | null

export type OwnerBrand = {
  brand_name?: string | null
  brand_email?: string | null
  brand_phone?: string | null
  brand_whatsapp?: string | null
  brand_telegram?: string | null
  brand_website?: string | null
  brand_address?: string | null
  brand_instagram?: string | null
  brand_facebook?: string | null
  brand_youtube?: string | null
  brand_tiktok?: string | null
  brand_logo_url?: string | null
  brand_tagline?: string | null
  brand_terms?: string | null
} | null

export type ProjectLite = {
  id: string
  slug: string
  status: ProjectStatus | string
  design_theme?: string | null
  language?: string | null
  title: string | null
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
  pricing_mode: PricingMode | null
  pricing_label: string | null
  included: string | null
  not_included: string | null
  terms: string | null
  itinerary: Day[]
  operator_contact?: OperatorContact
  proposal_date?: string | null
  valid_until?: string | null
  client_id?: string | null
  booking_ref?: string | null
  internal_notes?: string | null
  special_requests?: string | null
  cover_image_url?: string | null
  images?: unknown
  what_to_bring?: unknown
}

export type Client = {
  id: string
  agent_id: string
  nickname: string | null
  name: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  telegram: string | null
  instagram: string | null
  facebook: string | null
  youtube: string | null
  tiktok: string | null
  source: string | null
  notes: string | null
  created_at: string
  updated_at: string
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

export type TripTask = {
  id: string
  project_id: string
  type?: string
  title: string | null
  description: string | null
  assigned_to?: string | null
  deadline: string | null
  sort_order?: number
  status: string
  completed_at?: string | null
  visible_to_client: boolean
}

/**
 * Owner-mode mutation handlers. Passed by `trip-page-client-v2.tsx`.
 */
export type Mutations = {
  saveProjectPatch: (patch: Record<string, unknown>) => Promise<boolean>
  saveDayPatch: (dayId: string, patch: Record<string, unknown>) => Promise<boolean>
  saveAccommodationCreate: (input: { name: string; description?: string | null; imageUrl?: string | null }) => Promise<Accommodation | null>
  saveAccommodationPatch: (id: string, patch: Record<string, unknown>) => Promise<boolean>
  saveAccommodationDelete: (id: string) => Promise<boolean>
}

// ─── Theme contract ────────────────────────────────────────────────────────

/**
 * Render mode passed from `trip-page-client-v2.tsx` to the active theme.
 * - `public`   — anonymous viewer (read-only)
 * - `owner`    — authenticated trip owner (editable)
 * - `anon`     — creator of an anonymous trip before sign-up
 *                (UI looks like owner; mutations short-circuit to a toast)
 * - `showcase` — interactive demo trip (mutations short-circuit to local state)
 */
export type TripMode = 'public' | 'owner' | 'anon' | 'showcase'

/**
 * Aggregate trip page payload, identical in shape to what the public
 * `/api/public/projects/:slug` and owner `/api/projects/:id/full`
 * endpoints return.
 */
export type TripDataV2 = {
  project: ProjectLite
  tasks: TripTask[]
  media: MediaLite[]
  accommodations: Accommodation[]
  owner: OwnerBrand
  client?: Client | null
}

export type ThemePropsV2 = {
  data: TripDataV2
  mode: TripMode
}

export type ThemeComponentV2 = ComponentType<ThemePropsV2>
