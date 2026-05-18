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
import { Loader2, Trash2 } from 'lucide-react'
import {
  listAdminCountryStats,
  listAdminCitiesByCountry,
  bulkDeleteAdminPhotos,
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

  // ── Bulk delete ──────────────────────────────────────────────────
  //
  // Two-step confirmation for any operation that the operator might
  // regret. "Big" = no country picked (whole bank) OR no city/search
  // narrowing under a picked country (entire country sweep). The
  // visible matched count is the listing's totalCount, so the prompt
  // matches what the operator sees in the grid.
  //
  // Once the user confirms, we call the bulk-delete endpoint in a
  // loop until `remaining` reaches 0. The endpoint caps each batch at
  // 200–500 to stay under Render's request timeout; that's invisible
  // to the operator — they see a single progress count tick down.
  //
  // Disabled when: nothing matches the filter, status='archived' (the
  // backend hard-guards that anyway, but the button shouldn't tease
  // the operator), or a bulk run is already in flight.
  const [bulkRunning, setBulkRunning] = useState(false)
  const [bulkProgress, setBulkProgress] = useState<{
    deleted: number
    target: number
  } | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkConfirmStep, setBulkConfirmStep] = useState<0 | 1 | 2>(0)

  const isBigSweep = useMemo(() => {
    // No country = whole bank.
    if (!country) return true
    // Country picked but no further narrowing = whole country.
    if (!city && !debouncedSearch) return true
    return false
  }, [country, city, debouncedSearch])

  const bulkDisabled =
    bulkRunning ||
    review.loading ||
    review.totalCount === 0 ||
    status === 'archived' ||
    !!idsActive

  const openBulkConfirm = useCallback(() => {
    setBulkError(null)
    setBulkProgress(null)
    setBulkConfirmStep(1)
  }, [])

  const closeBulkConfirm = useCallback(() => {
    if (bulkRunning) return
    setBulkConfirmStep(0)
    setBulkError(null)
  }, [bulkRunning])

  const runBulkDelete = useCallback(async () => {
    setBulkRunning(true)
    setBulkError(null)
    setBulkProgress({ deleted: 0, target: review.totalCount })
    let totalDeleted = 0
    let totalSkippedAsProtected = 0
    let safety = 200 // upper bound on batch loop — totalCount/200 + buffer
    try {
      while (safety-- > 0) {
        const out = await bulkDeleteAdminPhotos(authedFetch, {
          search: debouncedSearch || undefined,
          city: city || undefined,
          country: country || undefined,
          reviewed,
          status,
        })
        totalDeleted += out.deletedNow
        totalSkippedAsProtected += out.protectedNow
        setBulkProgress({
          deleted: totalDeleted,
          target: out.totalMatched + totalDeleted, // initial total
        })
        // No more rows OR nothing was actually removed this batch
        // (would loop forever otherwise — e.g. all remaining rows
        // hit the protected branch).
        if (out.remaining <= 0) break
        if (out.deletedNow === 0 && out.protectedNow === 0) break
      }
    } catch (err) {
      setBulkError((err as Error)?.message || 'Bulk delete failed')
    } finally {
      setBulkRunning(false)
      setBulkConfirmStep(0)
      // Refresh the listing so the grid empties out / pages renumber.
      review.refresh()
    }
    if (totalSkippedAsProtected > 0) {
      // Soft warning: some rows became archived instead of deleted
      // because they were already published into trips. Surface so
      // the operator understands the gap between "matched" and
      // "actually removed from disk".
      setBulkError(
        `${totalDeleted} deleted, ${totalSkippedAsProtected} kept as archive ` +
          `(already used in published trips).`,
      )
    }
  }, [
    authedFetch,
    debouncedSearch,
    city,
    country,
    reviewed,
    status,
    review,
  ])

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

        {/* Bulk delete — applies the current filter. Two-step confirm
            for big sweeps (whole bank / whole country). */}
        <button
          type="button"
          onClick={openBulkConfirm}
          disabled={bulkDisabled}
          title={
            status === 'archived'
              ? 'Archived photos cannot be deleted'
              : idsActive
                ? 'Bulk delete is disabled in deeplink mode'
                : review.totalCount === 0
                  ? 'Nothing matches the current filter'
                  : `Delete ${review.totalCount} photo${review.totalCount === 1 ? '' : 's'} matching this filter`
          }
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded border border-rose-300 bg-rose-50 px-3 text-rose-800 hover:bg-rose-100 disabled:border-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete matching ({review.totalCount.toLocaleString()})
        </button>
      </div>

      {/* Bulk delete confirmation modal — single step for narrow
          filters, two-step for whole-bank / whole-country sweeps. */}
      {bulkConfirmStep > 0 && (
        <BulkDeleteConfirm
          step={bulkConfirmStep as 1 | 2}
          big={isBigSweep}
          country={country}
          city={city}
          search={debouncedSearch}
          totalCount={review.totalCount}
          running={bulkRunning}
          progress={bulkProgress}
          error={bulkError}
          onNextStep={() => setBulkConfirmStep(2)}
          onConfirm={() => void runBulkDelete()}
          onCancel={closeBulkConfirm}
        />
      )}

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

/**
 * Two-step confirmation overlay for bulk delete. The first step is a
 * straightforward "delete N photos?" prompt; for "big" sweeps (no
 * country picked, or a whole country with no further narrowing) the
 * caller passes step=1 then advances to step=2 with extra wording
 * before the destructive button activates.
 *
 * The modal is also the progress surface while `running` is true.
 */
function BulkDeleteConfirm({
  step,
  big,
  country,
  city,
  search,
  totalCount,
  running,
  progress,
  error,
  onNextStep,
  onConfirm,
  onCancel,
}: {
  step: 1 | 2
  big: boolean
  country: string
  city: string
  search: string
  totalCount: number
  running: boolean
  progress: { deleted: number; target: number } | null
  error: string | null
  onNextStep: () => void
  onConfirm: () => void
  onCancel: () => void
}) {
  // Human-readable scope: country/city/search → "in Canada · Banff · 'lake'"
  const scopeParts: string[] = []
  if (country) scopeParts.push(`country = ${country}`)
  if (city) scopeParts.push(`city = ${city}`)
  if (search) scopeParts.push(`search = "${search}"`)
  if (scopeParts.length === 0) scopeParts.push('the entire bank')
  const scope = scopeParts.join(' · ')

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-base font-semibold text-zinc-900">
          {running ? 'Deleting photos…' : 'Delete photos'}
        </h2>

        {running ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-700">
              Removing photos from the bank and S3. Please don't close this
              page until the process finishes.
            </p>
            {progress && (
              <div className="text-sm text-zinc-600">
                <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" />
                {progress.deleted.toLocaleString()} of about{' '}
                {progress.target.toLocaleString()} deleted
              </div>
            )}
          </div>
        ) : step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-700">
              About to delete{' '}
              <span className="font-semibold text-rose-700">
                {totalCount.toLocaleString()} photo
                {totalCount === 1 ? '' : 's'}
              </span>{' '}
              matching: <span className="text-zinc-900">{scope}</span>.
            </p>
            <p className="text-xs text-zinc-500">
              Photos already used in published trips will become read-only
              archive entries instead of being deleted.
            </p>
            {error && (
              <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Cancel
              </button>
              {big ? (
                <button
                  type="button"
                  onClick={onNextStep}
                  className="rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm text-rose-800 hover:bg-rose-100"
                >
                  Continue…
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onConfirm}
                  className="rounded border border-rose-600 bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
                >
                  Delete {totalCount.toLocaleString()}
                </button>
              )}
            </div>
          </div>
        ) : (
          // step === 2 — second confirm for big sweeps.
          <div className="space-y-3">
            <p className="text-sm text-zinc-900">
              This is a large deletion: <span className="font-semibold">{scope}</span>.
            </p>
            <p className="text-sm text-zinc-700">
              You are about to permanently remove{' '}
              <span className="font-semibold text-rose-700">
                {totalCount.toLocaleString()} photo
                {totalCount === 1 ? '' : 's'}
              </span>{' '}
              from the bank and S3. This cannot be undone.
            </p>
            <p className="text-xs text-zinc-500">
              Photos already used in published trips will become read-only
              archive entries instead of being deleted — the linked trip
              pages keep rendering.
            </p>
            {error && (
              <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="rounded border border-rose-600 bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
              >
                Yes, delete {totalCount.toLocaleString()}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}