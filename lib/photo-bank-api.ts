'use client'

/**
 * Photo Bank — typed API wrappers (TZ Photo Bank Stage 4).
 *
 * Used by the dashboard `/dashboard?view=photos` page. All paid-bound
 * endpoints sit behind `requirePaid` on the backend; the wrappers
 * surface a 403 + `code: "upgrade_required"` for the free upgrade
 * banner without throwing.
 *
 * `listGlobalPhotos` is the only call free users actually make — it
 * targets the new `/api/global-bank` endpoint (Stage 4 backend), which
 * sits behind plain `requireAuth` (no paid gate).
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

export interface GlobalPhotoItem {
  id: string
  cdn_url: string
  /** Stage 11 — pre-resized 400px JPEG. NULL until crawler ran with
   *  thumbnail support OR until backfill CLI processed the row. */
  thumbnail_url?: string | null
  ai_categories: string[]
  ai_tags: string[]
  ai_landmarks: string[]
  ai_description: string | null
  city: string | null
  country: string | null
  region?: string | null
  license: string
  license_url?: string | null
  attribution_html: string | null
  ai_quality_score: number | null
  is_hero_candidate: boolean
  ai_processed?: boolean
  cleanup_processed?: boolean
  /** L1 — single dominant scene_type from the v4 classifier vocabulary
   *  (mountain_landscape, cityscape, restaurant_interior, …). NULL on
   *  rows classified before the L1/L2 split — UI renders no L1 badge. */
  scene_type?: string | null
  /** L1 — season as a first-class column ("winter" | "summer" |
   *  "spring" | "fall" | "any"). NULL on legacy rows. */
  season?: string | null
  width?: number | null
  height?: number | null
  file_size?: number | null
  mime_type?: string | null
  reviewed_at?: string | null
  created_at: string
  /** Stage 11 — number of times this row was used in trip_media. */
  usage_count?: number
}

export interface GlobalListResponse {
  photos: GlobalPhotoItem[]
  page: number
  perPage: number
  totalCount: number
  totalPages: number
}

export interface ListGlobalFilters {
  search?: string
  category?: string
  city?: string
  country?: string
  reviewed?: 'true' | 'false' | 'all'
  /** Stage 11 — restrict listing to specific photo IDs. CSV-encoded
   *  on the wire; the listing endpoint filters via `id = ANY(...)`. */
  ids?: string[]
  page?: number
  perPage?: number
}

export type AuthedFetch = (path: string, init?: RequestInit) => Promise<Response>

export async function listGlobalPhotos(
  authedFetch: AuthedFetch,
  filters: ListGlobalFilters = {},
): Promise<GlobalListResponse> {
  const sp = new URLSearchParams()
  if (filters.search) sp.set('search', filters.search)
  if (filters.category) sp.set('category', filters.category)
  if (filters.city) sp.set('city', filters.city)
  if (filters.country) sp.set('country', filters.country)
  if (filters.reviewed) sp.set('reviewed', filters.reviewed)
  if (filters.ids && filters.ids.length > 0) sp.set('ids', filters.ids.join(','))
  sp.set('page', String(filters.page ?? 1))
  sp.set('perPage', String(filters.perPage ?? 50))
  const url = `${API_URL}/api/global-bank?${sp.toString()}`
  const res = await authedFetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as GlobalListResponse
}

export async function listGlobalCountries(
  authedFetch: AuthedFetch,
): Promise<string[]> {
  const res = await authedFetch(`${API_URL}/api/global-bank/countries`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = (await res.json()) as { countries: string[] }
  return Array.isArray(j.countries) ? j.countries : []
}

// ─────────────────────────────────────────────────────────────────────
// Stage 11 — admin browse view: country / city aggregates.
// Both endpoints are gated by ADMIN_EMAILS on the backend.
// ─────────────────────────────────────────────────────────────────────

export interface CountryStats {
  country: string
  photo_count: number
  city_count: number
}

export async function listAdminCountryStats(
  authedFetch: AuthedFetch,
): Promise<CountryStats[]> {
  const res = await authedFetch(
    `${API_URL}/api/admin/global-bank/countries-stats`,
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = (await res.json()) as { countries: CountryStats[] }
  return Array.isArray(j.countries) ? j.countries : []
}

export interface CityStats {
  city: string
  photo_count: number
  last_crawled_at: string | null
}

export async function listAdminCitiesByCountry(
  authedFetch: AuthedFetch,
  country: string,
): Promise<CityStats[]> {
  const sp = new URLSearchParams({ country })
  const res = await authedFetch(
    `${API_URL}/api/admin/global-bank/cities?${sp.toString()}`,
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = (await res.json()) as { cities: CityStats[] }
  return Array.isArray(j.cities) ? j.cities : []
}

// ─────────────────────────────────────────────────────────────────────
// Paid-bound user-bank wrappers (TZ Photo Bank Stage 2 endpoints).
// Free users never call these; the dashboard gates by `plan === 'paid'`.
// Stubs surface 403 cleanly so the upgrade-banner stays visible.
// ─────────────────────────────────────────────────────────────────────

export interface UserPhotoItem {
  id: string
  cdn_url: string
  manual_caption: string | null
  manual_tags: string[]
  ai_description: string | null
  ai_categories: string[]
  ai_tags: string[]
  ai_landmarks: string[]
  ai_processed: boolean
  ai_failed: boolean
  is_hero_candidate: boolean
  hero_override: boolean | null
  pin_region: string | null
  pin_landmark: string | null
  region: string | null
  country: string | null
  city: string | null
  created_at: string
}

export interface UserListResponse {
  photos: UserPhotoItem[]
  nextCursor: string | null
  totalCount: number
  quotaUsedBytes: number
  quotaLimitBytes: number
}

// Paid user-bank list filters — independent shape from the (Stage 10
// Block B) global ListGlobalFilters. Keeps `region` + `cursor` + `limit`
// because the user-bank endpoint (Stage 2) still uses cursor pagination
// and a single region filter; refactor когда billing flow ships.
export interface UserListFilters {
  search?: string
  category?: string
  region?: string
  city?: string
  country?: string
  cursor?: string
  limit?: number
  processing?: boolean
  pinned?: boolean
}

export async function listUserPhotos(
  authedFetch: AuthedFetch,
  filters: UserListFilters = {},
): Promise<UserListResponse> {
  const sp = new URLSearchParams()
  if (filters.search) sp.set('search', filters.search)
  if (filters.category) sp.set('category', filters.category)
  if (filters.region) sp.set('region', filters.region)
  // city/country are accepted for consistency with the page client's
  // shared filter strip; the user-bank endpoint maps both to the
  // legacy `region` query param.
  if (filters.city) sp.set('region', filters.city)
  else if (filters.country) sp.set('region', filters.country)
  if (filters.processing) sp.set('processing', 'true')
  if (filters.pinned) sp.set('pinned', 'true')
  if (filters.cursor) sp.set('cursor', filters.cursor)
  sp.set('limit', String(filters.limit ?? 50))
  const url = `${API_URL}/api/photo-bank?${sp.toString()}`
  const res = await authedFetch(url)
  if (res.status === 403) {
    throw new Error('Upgrade required')
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as UserListResponse
}

export interface QuotaResponse {
  usedBytes: number
  limitBytes: number
  photoCount: number
}

export async function getQuota(authedFetch: AuthedFetch): Promise<QuotaResponse> {
  const res = await authedFetch(`${API_URL}/api/photo-bank/quota`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as QuotaResponse
}

export async function getAttestationText(
  authedFetch: AuthedFetch,
): Promise<{ text: string }> {
  const res = await authedFetch(`${API_URL}/api/photo-bank/attestation-text`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as { text: string }
}

export async function postAttestation(
  authedFetch: AuthedFetch,
  photoCount: number,
): Promise<void> {
  const res = await authedFetch(`${API_URL}/api/photo-bank/attest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoCount }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}
