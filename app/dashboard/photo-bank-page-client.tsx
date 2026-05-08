'use client'

/**
 * Photo Bank — dashboard page (TZ §7 + Stage 10 Block B).
 *
 * Tier-aware:
 *   - Free  → upgrade banner (paid uploads still gated) + global preview
 *             with offset pagination + filters (search / city / country
 *             dropdown / reviewed toggle).
 *   - Paid  → full management UI; reuses the same filter strip on top
 *             of user-bank list. Stub-grade: end-to-end paid run lands
 *             with the billing flow.
 *
 * Stage 10 Block B notes:
 *   - Offset pagination replaces the cursor pattern so the UI can show
 *     "Page X of Y" + per-page selector.
 *   - City filter is a debounced text input (ILIKE prefix on backend).
 *   - Country filter is a dropdown built from /api/global-bank/countries.
 *   - Search field is description/tags/landmarks-only — city/country
 *     are no longer in the search OR-pool, killing false positives like
 *     'Paris' returning Rome rows.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'

import { PhotoBankUpgradeBanner } from '@/components/photo-bank/upgrade-banner'
import { PhotoFilters } from '@/components/photo-bank/photo-filters'
import { GlobalPhotoCard } from '@/components/photo-bank/global-photo-card'
import { PhotoBankGrid } from '@/components/photo-bank/photo-bank-grid'
import { QuotaBar } from '@/components/photo-bank/quota-bar'
import { PhotoCard } from '@/components/photo-bank/photo-card'
import { PhotoDetailModal } from '@/components/photo-bank/photo-detail-modal'
import { PhotoUploadModal } from '@/components/photo-bank/photo-upload-modal'
import {
  listGlobalPhotos,
  listGlobalCountries,
  listUserPhotos,
  getQuota,
  type GlobalPhotoItem,
  type UserPhotoItem,
  type AuthedFetch,
} from '@/lib/photo-bank-api'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

const PER_PAGE_OPTIONS = [25, 50, 100] as const

interface PhotoBankPageClientProps {
  plan: 'free' | 'paid'
  needsAttestation?: boolean
}

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export default function PhotoBankPageClient(props: PhotoBankPageClientProps) {
  const { plan, needsAttestation = true } = props
  const isPaid = plan === 'paid'
  const { getToken } = useAuth()

  const authedFetch: AuthedFetch = useCallback(
    async (path, init) => {
      const token = await getToken().catch(() => null)
      const headers = new Headers(init?.headers)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return fetch(path, { ...init, headers })
    },
    [getToken],
  )

  // Filters (debounced for free-text fields).
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState<number>(50)

  const debouncedSearch = useDebounced(search, 300)
  const debouncedCity = useDebounced(city, 300)

  // Reset page on any filter change.
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, category, debouncedCity, country, perPage])

  // Country dropdown options.
  const [countries, setCountries] = useState<string[]>([])
  useEffect(() => {
    listGlobalCountries(authedFetch)
      .then(setCountries)
      .catch(() => setCountries([]))
  }, [authedFetch])

  // ── Free: global listing ─────────────────────────────────────────
  const [globalPhotos, setGlobalPhotos] = useState<GlobalPhotoItem[]>([])
  const [globalTotal, setGlobalTotal] = useState(0)
  const [globalTotalPages, setGlobalTotalPages] = useState(1)
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  useEffect(() => {
    if (isPaid) return
    setGlobalLoading(true)
    setGlobalError(null)
    listGlobalPhotos(authedFetch, {
      search: debouncedSearch,
      category,
      city: debouncedCity,
      country,
      page,
      perPage,
      reviewed: 'all',
    })
      .then((r) => {
        setGlobalPhotos(r.photos)
        setGlobalTotal(r.totalCount)
        setGlobalTotalPages(r.totalPages)
      })
      .catch((e: Error) => setGlobalError(e.message))
      .finally(() => setGlobalLoading(false))
  }, [
    isPaid,
    authedFetch,
    debouncedSearch,
    category,
    debouncedCity,
    country,
    page,
    perPage,
  ])

  // ── Paid: user-bank list + quota ─────────────────────────────────
  const [userPhotos, setUserPhotos] = useState<UserPhotoItem[]>([])
  const [userLoading, setUserLoading] = useState(false)
  const [userError, setUserError] = useState<string | null>(null)
  const [quota, setQuota] = useState<{ used: number; limit: number; count: number } | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [detailPhoto, setDetailPhoto] = useState<UserPhotoItem | null>(null)

  useEffect(() => {
    if (!isPaid) return
    setUserLoading(true)
    setUserError(null)
    Promise.all([
      listUserPhotos(authedFetch, {
        search: debouncedSearch,
        category,
        region: city || country,
        limit: perPage,
      } as any),
      getQuota(authedFetch),
    ])
      .then(([list, q]) => {
        setUserPhotos(list.photos)
        setQuota({ used: q.usedBytes, limit: q.limitBytes, count: q.photoCount })
      })
      .catch((e: Error) => setUserError(e.message))
      .finally(() => setUserLoading(false))
  }, [isPaid, authedFetch, debouncedSearch, category, city, country, perPage])

  const filtersBlock = (
    <PhotoFilters
      search={search}
      onSearchChange={setSearch}
      category={category}
      onCategoryChange={setCategory}
      city={city}
      onCityChange={setCity}
      country={country}
      onCountryChange={setCountry}
      countryOptions={countries}
    />
  )

  const paginationBar = useMemo(() => {
    if (isPaid) return null
    return (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div>
          {globalTotal > 0 ? (
            <>Showing page {page} of {globalTotalPages} · {globalTotal} photos</>
          ) : (
            <>0 photos</>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-zinc-600">Per page</label>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="h-8 rounded border border-zinc-300 bg-white px-2 text-sm"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-zinc-300 bg-white px-2 py-1 disabled:opacity-50"
          >
            ← Prev
          </button>
          <button
            type="button"
            disabled={page >= globalTotalPages}
            onClick={() => setPage((p) => Math.min(globalTotalPages, p + 1))}
            className="rounded border border-zinc-300 bg-white px-2 py-1 disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>
    )
  }, [isPaid, globalTotal, globalTotalPages, page, perPage])

  // ─────────────────────────────────────────────────────────────────
  // Free render
  // ─────────────────────────────────────────────────────────────────
  if (!isPaid) {
    return (
      <div>
        <PhotoBankUpgradeBanner />
        {filtersBlock}
        {globalLoading && (
          <div className="flex items-center justify-center py-12 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2">Loading global photos…</span>
          </div>
        )}
        {globalError && (
          <div className="rounded bg-amber-50 p-3 text-sm text-amber-800">
            {globalError}
          </div>
        )}
        {!globalLoading && !globalError && (
          <PhotoBankGrid>
            {globalPhotos.map((p) => (
              <GlobalPhotoCard key={p.id} photo={p} />
            ))}
          </PhotoBankGrid>
        )}
        {!globalLoading && !globalError && globalPhotos.length === 0 && (
          <div className="py-8 text-center text-sm text-zinc-500">
            No photos match your filters yet. Try a broader search.
          </div>
        )}
        {paginationBar}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // Paid render — Stage 4 stub-grade
  // ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {quota && (
        <QuotaBar
          usedBytes={quota.used}
          limitBytes={quota.limit}
          photoCount={quota.count}
        />
      )}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-medium">Your Photo Bank</h2>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white"
        >
          Upload
        </button>
      </div>
      {filtersBlock}
      {userLoading && (
        <div className="flex items-center justify-center py-12 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2">Loading your photos…</span>
        </div>
      )}
      {userError && (
        <div className="rounded bg-amber-50 p-3 text-sm text-amber-800">{userError}</div>
      )}
      {!userLoading && !userError && (
        <PhotoBankGrid>
          {userPhotos.map((p) => (
            <PhotoCard key={p.id} photo={p} onEdit={(ph) => setDetailPhoto(ph)} />
          ))}
        </PhotoBankGrid>
      )}
      <PhotoUploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        needsAttestation={needsAttestation}
        authedFetch={authedFetch}
      />
      <PhotoDetailModal
        photo={detailPhoto}
        onClose={() => setDetailPhoto(null)}
      />
    </div>
  )
}
