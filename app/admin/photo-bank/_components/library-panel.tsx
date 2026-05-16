'use client'

/**
 * Library panel — single combined view of the global photo bank.
 *
 * Replaces the old Review queue + Browse library split. Top strip has
 * four fields, in fixed order:
 *
 *   1. Country  — dropdown listing every country with at least one
 *                 photo, plus its total photo count (independent of
 *                 the reviewed filter below; this is the bank-wide
 *                 number, not the filtered number).
 *   2. City     — dropdown of cities under the selected country with
 *                 each city's total photo count. Disabled until a
 *                 country is picked.
 *   3. Search   — free-text search over description / tags / landmarks.
 *                 Debounced 300ms.
 *   4. Reviewed — Unreviewed / Reviewed / All. Default Unreviewed —
 *                 mirrors the old Review queue's default so a fresh
 *                 admin landing still highlights what still needs a
 *                 human pass.
 *
 * Underneath: the same PhotoReviewCard grid with Keep / Delete /
 * inline metadata edits as before — there is no separate read-only
 * Browse mode any more.
 *
 * Optional `ids` prop: when the parent passes a UUID list (used by
 * the "Show photos from this crawl" deeplink), the listing restricts
 * to those rows and defaults `reviewed` to 'all' so a freshly-crawled
 * batch shows even though it hasn't been reviewed yet.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  listAdminCountryStats,
  listAdminCitiesByCountry,
  type CountryStats,
  type CityStats,
} from '@/lib/photo-bank-api'
import {
  useAdminPhotoReview,
  type AuthedFetch,
} from '@/hooks/use-admin-photo-review'
import { PhotoReviewCard } from '@/components/admin/photo-review-card'

const PER_PAGE_OPTIONS = [25, 50, 100] as const

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export interface LibraryPanelProps {
  authedFetch: AuthedFetch
  /** When provided, listing is restricted to these row IDs (deeplink from crawl). */
  ids?: string[]
  /** When ids are active the parent typically wants 'all' as the reviewed default. */
  initialReviewed?: 'true' | 'false' | 'all'
}

export function LibraryPanel({
  authedFetch,
  ids,
  initialReviewed,
}: LibraryPanelProps) {
  const idsActive = !!ids && ids.length > 0

  // ── Top-strip state ──────────────────────────────────────────────
  const [country, setCountry] = useState<string>('')
  const [city, setCity] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [reviewed, setReviewed] = useState<'true' | 'false' | 'all'>(
    initialReviewed ?? (idsActive ? 'all' : 'false'),
  )
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>(
    idsActive ? 'all' : 'active',
  )
  const debouncedSearch = useDebounced(search, 300)

  // ── Countries — load once on mount ──────────────────────────────
  const [countries, setCountries] = useState<CountryStats[] | null>(null)
  const [countriesError, setCountriesError] = useState<string | null>(null)
  useEffect(() => {
    listAdminCountryStats(authedFetch)
      .then((c) => setCountries(c))
      .catch((e) => setCountriesError(e?.message ?? 'Failed to load countries'))
  }, [authedFetch])

  // ── Cities — load on country change ─────────────────────────────
  const [cities, setCities] = useState<CityStats[] | null>(null)
  const [citiesLoading, setCitiesLoading] = useState(false)
  useEffect(() => {
    if (!country) {
      setCities(null)
      return
    }
    let cancelled = false
    setCitiesLoading(true)
    listAdminCitiesByCountry(authedFetch, country)
      .then((c) => {
        if (!cancelled) setCities(c)
      })
      .catch(() => {
        if (!cancelled) setCities([])
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authedFetch, country])

  // Reset city when country changes — keeps the city filter
  // consistent with the cities list.
  useEffect(() => {
    setCity('')
  }, [country])

  // ── Photo listing ───────────────────────────────────────────────
  const review = useAdminPhotoReview(authedFetch, {
    reviewed,
    status,
    search: debouncedSearch,
    city: city || undefined,
    country: country || undefined,
    ids: idsActive ? ids : undefined,
    perPage: idsActive ? 100 : 50,
  })

  const totalCountryPhotos = useMemo(
    () => (countries ?? []).reduce((acc, c) => acc + c.photo_count, 0),
    [countries],
  )

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-medium">Photo bank — library</h1>
        <div className="text-sm text-zinc-500">
          {review.totalCount} photos · page {review.page} of {review.totalPages}
          {countries && (
            <span className="ml-2 text-xs text-zinc-400">
              ({totalCountryPhotos} total in bank)
            </span>
          )}
        </div>
      </header>

      {countriesError && (
        <div className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {countriesError}
        </div>
      )}

      {/* Top filter strip — fixed 4-field order */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {/* 1. Country */}
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="h-9 min-w-[180px] rounded border border-zinc-300 bg-white px-2"
          disabled={!countries}
        >
          <option value="">All countries</option>
          {(countries ?? []).map((c) => (
            <option key={c.country} value={c.country}>
              {c.country} ({c.photo_count})
            </option>
          ))}
        </select>

        {/* 2. City — depends on country */}
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="h-9 min-w-[180px] rounded border border-zinc-300 bg-white px-2 disabled:bg-zinc-50 disabled:text-zinc-400"
          disabled={!country || citiesLoading || !cities}
        >
          <option value="">{country ? 'All cities' : 'Pick a country first'}</option>
          {(cities ?? []).map((c) => (
            <option key={c.city} value={c.city}>
              {c.city} ({c.photo_count})
            </option>
          ))}
        </select>

        {/* 3. Search */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search description, tags, landmarks…"
          className="h-9 flex-1 min-w-[200px] rounded border border-zinc-300 bg-white px-3"
        />

        {/* 4. Reviewed state */}
        <select
          value={reviewed}
          onChange={(e) => setReviewed(e.target.value as 'true' | 'false' | 'all')}
          className="h-9 rounded border border-zinc-300 bg-white px-2"
        >
          <option value="false">Unreviewed only</option>
          <option value="true">Reviewed only</option>
          <option value="all">All</option>
        </select>

        {/* 5. Archive status — Active hides already-archived (used-in-trips,
            read-only) rows from the queue. Archived isolates them for audit. */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'active' | 'archived' | 'all')}
          className="h-9 rounded border border-zinc-300 bg-white px-2"
          title="Archived = used in published trips, read-only"
        >
          <option value="active">Active</option>
          <option value="archived">Archive</option>
          <option value="all">Active + archive</option>
        </select>
      </div>

      {/* Keyboard shortcuts hint — surfaced above the grid where the
          operator actually needs it. */}
      <p className="mb-3 text-xs text-zinc-500">
        Keyboard shortcuts on the focused card: Enter = Keep, Delete/Backspace = Delete.
      </p>

      {review.loading && (
        <div className="flex items-center justify-center py-12 text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2">Loading…</span>
        </div>
      )}
      {review.error && (
        <div className="rounded bg-amber-50 p-3 text-sm text-amber-800">
          {review.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {review.photos.map((p) => (
          <div
            key={p.id}
            tabIndex={0}
            onFocus={() => review.setFocusedId(p.id)}
            onClick={() => review.setFocusedId(p.id)}
            className="outline-none"
          >
            <PhotoReviewCard
              photo={p}
              focused={review.focusedId === p.id}
              onApprove={(id) => review.approve(id)}
              onDelete={(id) => review.remove(id)}
              onSave={(id, patch) => review.saveMeta(id, patch)}
            />
          </div>
        ))}
      </div>

      {!review.loading && review.photos.length === 0 && !review.error && (
        <div className="py-8 text-center text-sm text-zinc-500">
          No photos in this filter.
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 text-sm">
        <span className="mr-auto text-zinc-600">
          {review.totalCount.toLocaleString()} photo{review.totalCount === 1 ? '' : 's'}
          {' · '}
          Page {review.page} of {review.totalPages}
        </span>
        <label className="text-zinc-600">Per page</label>
        <select
          value={review.perPage}
          onChange={(e) => review.setPerPage(Number(e.target.value))}
          className="h-8 rounded border border-zinc-300 bg-white px-2"
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={review.page <= 1}
          onClick={() => review.setPage(Math.max(1, review.page - 1))}
          className="rounded border border-zinc-300 bg-white px-2 py-1 disabled:opacity-50"
        >
          ← Prev
        </button>
        <button
          type="button"
          disabled={review.page >= review.totalPages}
          onClick={() => review.setPage(Math.min(review.totalPages, review.page + 1))}
          className="rounded border border-zinc-300 bg-white px-2 py-1 disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </div>
  )
}