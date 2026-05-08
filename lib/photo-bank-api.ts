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
  reviewed_at?: string | null
  created_at: string
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

export async function listUserPhotos(
  authedFetch: AuthedFetch,
  filters: ListGlobalFilters & { processing?: boolean; pinned?: boolean } = {},
): Promise<UserListResponse> {
  const sp = new URLSearchParams()
  if (filters.search) sp.set('search', filters.search)
  if (filters.category) sp.set('category', filters.category)
  if (filters.region) sp.set('region', filters.region)
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
