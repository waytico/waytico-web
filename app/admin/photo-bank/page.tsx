'use client'

/**
 * Admin photo bank review queue — TZ Photo Bank Stage 10 Block D.
 *
 * Grid of unreviewed (default) global rows + Keep/Delete actions per
 * card + keyboard (Enter/Delete) on the focused card. Filter strip
 * drives the listing service (admin endpoint shares the same
 * listing.service.listGlobalPhotos).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'
import { useAdminPhotoReview, type AuthedFetch } from '@/hooks/use-admin-photo-review'
import { PhotoReviewCard } from '@/components/admin/photo-review-card'
import { listGlobalCountries } from '@/lib/photo-bank-api'
import { BrowsePanel } from './_components/browse-panel'
import { TargetsPanel } from './_components/targets-panel'
import { WorkersPanel } from './_components/workers-panel'
import { ModelTestPanel } from './_components/model-test-panel'

const PER_PAGE_OPTIONS = [25, 50, 100] as const

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export default function AdminPhotoBankPage() {
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

  const searchParams = useSearchParams()
  const router = useRouter()

  // Stage 11 — when navigated here from /admin/photo-bank/crawl with
  // a list of UUIDs ("Show photos from this crawl"), restrict the
  // listing to those IDs and default `reviewed` to 'all' so newly-
  // crawled-but-unreviewed rows show up alongside any already-reviewed.
  const idsCsv = searchParams.get('ids') ?? ''
  const ids = useMemo(
    () =>
      idsCsv
        ? idsCsv
            .split(',')
            .map((s) => s.trim())
            .filter((s) => /^[0-9a-fA-F-]{36}$/.test(s))
        : [],
    [idsCsv],
  )
  const idsActive = ids.length > 0

  const reviewedQuery = searchParams.get('reviewed') as
    | 'true'
    | 'false'
    | 'all'
    | null
  const [reviewed, setReviewed] = useState<'true' | 'false' | 'all'>(
    reviewedQuery ?? (idsActive ? 'all' : 'false'),
  )
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const debouncedSearch = useDebounced(search, 300)
  const debouncedCity = useDebounced(city, 300)

  const [countries, setCountries] = useState<string[]>([])
  useEffect(() => {
    listGlobalCountries(authedFetch).then(setCountries).catch(() => setCountries([]))
  }, [authedFetch])

  const review = useAdminPhotoReview(authedFetch, {
    reviewed,
    search: debouncedSearch,
    city: debouncedCity,
    country,
    ids: idsActive ? ids : undefined,
    perPage: idsActive ? 100 : 50,
  })

  const clearIdsFilter = () => router.push('/admin/photo-bank')

  // Stage 11 — view mode. Browse mode hides the review queue UI and
  // renders the country/city navigator instead. URL-controlled so a
  // bookmark like ?view=browse keeps you in the right tab on reload.
  const viewQuery = searchParams.get('view') as 'review' | 'browse' | 'targets' | 'workers' | 'model-test' | null
  const view: 'review' | 'browse' | 'targets' | 'workers' | 'model-test' =
    viewQuery === 'browse' || viewQuery === 'targets' || viewQuery === 'workers' || viewQuery === 'model-test' ? viewQuery : 'review'
  const setView = (next: 'review' | 'browse' | 'targets' | 'workers' | 'model-test') => {
    const sp = new URLSearchParams(searchParams.toString())
    if (next === 'review') sp.delete('view')
    else sp.set('view', next)
    const qs = sp.toString()
    router.push(qs ? `/admin/photo-bank?${qs}` : '/admin/photo-bank')
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-zinc-200">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setView('review')}
            className={
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
              (view === 'review'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700')
            }
          >
            Review queue
          </button>
          <button
            type="button"
            onClick={() => setView('browse')}
            className={
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
              (view === 'browse'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700')
            }
          >
            Browse library
          </button>
          <button
            type="button"
            onClick={() => setView('targets')}
            className={
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
              (view === 'targets'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700')
            }
          >
            Targets
          </button>
          <button
            type="button"
            onClick={() => setView('workers')}
            className={
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
              (view === 'workers'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700')
            }
          >
            Workers
          </button>
          <button
            type="button"
            onClick={() => setView('model-test')}
            className={
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors ' +
              (view === 'model-test'
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700')
            }
          >
            Model test
          </button>
        </div>
      </div>

      {view === 'browse' && <BrowsePanel />}
      {view === 'targets' && <TargetsPanel authedFetch={authedFetch} />}
      {view === 'workers' && <WorkersPanel authedFetch={authedFetch} />}
      {view === 'model-test' && <ModelTestPanel authedFetch={authedFetch} />}

      {view === 'review' && (
        <>
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-medium">Photo bank — admin review</h1>
            <div className="text-sm text-zinc-500">
              {review.totalCount} photos · page {review.page} of {review.totalPages}
            </div>
          </header>

          {idsActive && (
            <div className="mb-3 flex items-center justify-between rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <span>
                Showing <strong>{ids.length}</strong> photo{ids.length === 1 ? '' : 's'} from one
                crawl run.
              </span>
              <button
                type="button"
                onClick={clearIdsFilter}
                className="inline-flex items-center gap-1 rounded border border-amber-400 bg-white px-2 py-0.5 text-xs hover:bg-amber-100"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <select
              value={reviewed}
              onChange={(e) => setReviewed(e.target.value as 'true' | 'false' | 'all')}
              className="h-9 rounded border border-zinc-300 bg-white px-2"
            >
              <option value="false">Unreviewed only</option>
              <option value="true">Reviewed only</option>
              <option value="all">All</option>
            </select>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, tags, landmarks…"
              className="h-9 flex-1 min-w-[200px] rounded border border-zinc-300 bg-white px-3"
            />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="h-9 w-[140px] rounded border border-zinc-300 bg-white px-3"
            />
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-9 rounded border border-zinc-300 bg-white px-2"
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {review.loading && (
            <div className="flex items-center justify-center py-12 text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2">Loading…</span>
            </div>
          )}
          {review.error && (
            <div className="rounded bg-amber-50 p-3 text-sm text-amber-800">{review.error}</div>
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

          <div className="mt-4 flex items-center justify-end gap-2 text-sm">
            <label className="text-zinc-600">Per page</label>
            <select
              value={review.perPage}
              onChange={(e) => review.setPerPage(Number(e.target.value))}
              className="h-8 rounded border border-zinc-300 bg-white px-2"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
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

          <p className="mt-3 text-xs text-zinc-500">
            Keyboard shortcuts on the focused card: Enter = Keep, Delete/Backspace = Delete.
          </p>
        </>
      )}
    </div>
  )
}
