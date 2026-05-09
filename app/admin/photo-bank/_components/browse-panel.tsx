'use client'

/**
 * Browse panel — country → city → photos navigation for the global
 * photo bank. Sits inside /admin/photo-bank as the alternative view to
 * the unreviewed-first review queue.
 *
 * Flow:
 *   1. Mount fetches /admin/global-bank/countries-stats. The result is
 *      a flat list of {country, photo_count, city_count} sorted by
 *      photo count desc.
 *   2. Click a country → fetch /admin/global-bank/cities?country=X.
 *   3. Click a city → set the city filter on the underlying admin
 *      review hook so the photo grid below reflects the selection.
 *
 * The photo grid reuses the same `useAdminPhotoReview` hook + the same
 * PhotoReviewCard so edits / Keep / Delete behave identically across
 * the two views. The hook's `reviewed: 'all'` is hard-coded here —
 * browse mode shouldn't filter by review state.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2, ArrowLeft } from 'lucide-react'
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

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) {
    const hrs = Math.floor(ms / 3_600_000)
    if (hrs === 0) return 'just now'
    return `${hrs}h ago`
  }
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export function BrowsePanel() {
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

  // ── Country list ─────────────────────────────────────────────────
  const [countries, setCountries] = useState<CountryStats[] | null>(null)
  const [countriesError, setCountriesError] = useState<string | null>(null)
  useEffect(() => {
    listAdminCountryStats(authedFetch)
      .then((c) => setCountries(c))
      .catch((e) => setCountriesError(e?.message ?? 'Failed to load'))
  }, [authedFetch])

  // ── Selected country + its cities ───────────────────────────────
  const [country, setCountry] = useState<string>('')
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

  // ── Selected city → photo grid ──────────────────────────────────
  const [city, setCity] = useState<string>('')

  const review = useAdminPhotoReview(authedFetch, {
    reviewed: 'all',
    country: country || undefined,
    city: city || undefined,
    enabled: Boolean(city),
    perPage: 50,
  })

  const totalCountryPhotos = useMemo(
    () => (countries ?? []).reduce((acc, c) => acc + c.photo_count, 0),
    [countries],
  )

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Country picker */}
      <section className="rounded border border-zinc-200 bg-white p-3">
        <header className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-zinc-900">Countries</h2>
          {countries && (
            <span className="text-xs text-zinc-500">
              {countries.length} countries · {totalCountryPhotos} photos total
            </span>
          )}
        </header>
        {!countries && !countriesError && (
          <div className="flex items-center gap-2 py-2 text-sm text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading countries…
          </div>
        )}
        {countriesError && (
          <div className="text-sm text-rose-700">{countriesError}</div>
        )}
        {countries && countries.length === 0 && (
          <div className="py-2 text-sm text-zinc-500">No countries yet.</div>
        )}
        {countries && countries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {countries.map((c) => {
              const active = country === c.country
              return (
                <button
                  key={c.country}
                  type="button"
                  onClick={() => {
                    setCountry(active ? '' : c.country)
                    setCity('')
                  }}
                  className={
                    'rounded border px-2 py-1 text-xs transition-colors ' +
                    (active
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100')
                  }
                  title={`${c.photo_count} photos in ${c.city_count} cities`}
                >
                  {c.country}{' '}
                  <span
                    className={
                      'ml-1 rounded px-1 text-[10px] ' +
                      (active
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-100 text-zinc-600')
                    }
                  >
                    {c.photo_count}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* City picker (only when a country is selected) */}
      {country && (
        <section className="rounded border border-zinc-200 bg-white p-3">
          <header className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-zinc-900">
              Cities in {country}
            </h2>
            {cities && (
              <span className="text-xs text-zinc-500">
                {cities.length} cit{cities.length === 1 ? 'y' : 'ies'}
              </span>
            )}
          </header>
          {citiesLoading && !cities && (
            <div className="flex items-center gap-2 py-2 text-sm text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading cities…
            </div>
          )}
          {cities && cities.length === 0 && !citiesLoading && (
            <div className="py-2 text-sm text-zinc-500">
              No cities under this country.
            </div>
          )}
          {cities && cities.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 lg:grid-cols-4">
              {cities.map((c) => {
                const active = city === c.city
                return (
                  <button
                    key={c.city}
                    type="button"
                    onClick={() => setCity(active ? '' : c.city)}
                    className={
                      'flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-left text-xs transition-colors ' +
                      (active
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100')
                    }
                    title={`Last crawled ${formatRelative(c.last_crawled_at)}`}
                  >
                    <span className="truncate font-medium">{c.city}</span>
                    <span
                      className={
                        'shrink-0 rounded px-1.5 py-0.5 text-[10px] ' +
                        (active
                          ? 'bg-white/20 text-white'
                          : 'bg-zinc-100 text-zinc-600')
                      }
                    >
                      {c.photo_count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Photos of the selected city */}
      {city && (
        <section>
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCity('')}
                className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-100"
              >
                <ArrowLeft className="h-3 w-3" /> Back to cities
              </button>
              <h2 className="text-base font-medium text-zinc-900">
                {city}
                {country && (
                  <span className="ml-1 text-zinc-500">· {country}</span>
                )}
              </h2>
            </div>
            <div className="text-xs text-zinc-500">
              {review.totalCount} photos · page {review.page} of{' '}
              {review.totalPages}
            </div>
          </header>

          {review.loading && (
            <div className="flex items-center justify-center py-8 text-zinc-500">
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
            <div className="py-6 text-center text-sm text-zinc-500">
              No photos in this city.
            </div>
          )}

          {review.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-end gap-2 text-sm">
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
                onClick={() =>
                  review.setPage(Math.min(review.totalPages, review.page + 1))
                }
                className="rounded border border-zinc-300 bg-white px-2 py-1 disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
