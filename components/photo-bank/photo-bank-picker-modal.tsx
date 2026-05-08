'use client'

/**
 * Photo Bank picker modal — TZ Photo Bank Stage 10 Block C.
 *
 * Inline picker triggered from trip-page hero / day photo overlay.
 *
 * Modes:
 *   - free: lists global bank only.
 *   - paid: tabs «My photos | Global library» (default My; global as fallback).
 *
 * tripContext (city / country / region) pre-fills filters so the
 * default pool is travel-relevant.
 *
 * onSelect(photo) supplies the cdn_url + source ids; caller writes
 * trip_media via PATCH /api/media/:id (manual override sets
 * autoMatched=false and lowConfidence=false).
 */

import { useEffect, useMemo, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import {
  listGlobalPhotos,
  listGlobalCountries,
  listUserPhotos,
  type AuthedFetch,
  type GlobalPhotoItem,
  type UserPhotoItem,
} from '@/lib/photo-bank-api'

export type PickerMode = 'free' | 'paid'

export interface TripContextHint {
  city?: string | null
  country?: string | null
  region?: string | null
}

export interface PickerSelection {
  cdnUrl: string
  source: 'global' | 'user'
  sourceId: string
  caption?: string | null
}

export interface PhotoBankPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (selection: PickerSelection) => void
  mode: PickerMode
  tripContext?: TripContextHint
  authedFetch: AuthedFetch
}

const PER_PAGE = 25

type Tab = 'my' | 'global'

export function PhotoBankPickerModal(props: PhotoBankPickerModalProps) {
  const { open, onClose, onSelect, mode, tripContext, authedFetch } = props

  const [tab, setTab] = useState<Tab>(mode === 'paid' ? 'my' : 'global')
  const [search, setSearch] = useState('')
  const [city, setCity] = useState(tripContext?.city ?? '')
  const [country, setCountry] = useState(tripContext?.country ?? '')
  const [page, setPage] = useState(1)
  const [countries, setCountries] = useState<string[]>([])

  const [globalPhotos, setGlobalPhotos] = useState<GlobalPhotoItem[]>([])
  const [userPhotos, setUserPhotos] = useState<UserPhotoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [globalTotalPages, setGlobalTotalPages] = useState(1)

  // Reset filters/tab when modal re-opens
  useEffect(() => {
    if (!open) return
    setTab(mode === 'paid' ? 'my' : 'global')
    setCity(tripContext?.city ?? '')
    setCountry(tripContext?.country ?? '')
    setSearch('')
    setPage(1)
    setError(null)
  }, [open, mode, tripContext])

  // Country dropdown options (lazy on first open)
  useEffect(() => {
    if (!open) return
    listGlobalCountries(authedFetch)
      .then(setCountries)
      .catch(() => setCountries([]))
  }, [open, authedFetch])

  // Reset page on filter changes
  useEffect(() => {
    setPage(1)
  }, [tab, search, city, country])

  // Fetch (debounced via React render cycle — modal is light)
  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    if (tab === 'global') {
      listGlobalPhotos(authedFetch, {
        search: search || undefined,
        city: city || undefined,
        country: country || undefined,
        page,
        perPage: PER_PAGE,
        reviewed: 'all',
      })
        .then((r) => {
          setGlobalPhotos(r.photos)
          setGlobalTotalPages(r.totalPages)
        })
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false))
    } else {
      // 'my' tab — paid only
      listUserPhotos(authedFetch, {
        search: search || undefined,
        city: city || undefined,
        country: country || undefined,
        limit: PER_PAGE,
      })
        .then((r) => setUserPhotos(r.photos))
        .catch((e: Error) => setError(e.message))
        .finally(() => setLoading(false))
    }
  }, [open, tab, authedFetch, search, city, country, page])

  const showTabs = mode === 'paid'
  const items = tab === 'global' ? globalPhotos : userPhotos
  const isEmpty = !loading && !error && items.length === 0

  const triggerSelect = (
    cdnUrl: string,
    source: 'global' | 'user',
    sourceId: string,
    caption: string | null,
  ) => {
    onSelect({ cdnUrl, source, sourceId, caption })
    onClose()
  }

  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="mt-12 max-h-[80vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Choose from Photo Bank</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {showTabs && (
          <div className="mb-3 flex gap-1 rounded border border-zinc-200 p-1 text-sm">
            {(['my', 'global'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={
                  'flex-1 rounded px-3 py-1.5 ' +
                  (tab === t ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100')
                }
              >
                {t === 'my' ? 'My photos' : 'Global library'}
              </button>
            ))}
          </div>
        )}

        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, tags, landmarks…"
            className="h-8 flex-1 min-w-[160px] rounded border border-zinc-300 bg-white px-2"
          />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="h-8 w-[120px] rounded border border-zinc-300 bg-white px-2"
          />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="h-8 rounded border border-zinc-300 bg-white px-2"
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2">Loading…</span>
          </div>
        )}
        {error && (
          <div className="rounded bg-amber-50 p-3 text-sm text-amber-800">{error}</div>
        )}
        {isEmpty && (
          <div className="py-8 text-center text-sm text-zinc-500">
            {tab === 'my'
              ? 'Your Photo Bank is empty. Upload photos from /dashboard?view=photos.'
              : 'No photos match your filters yet. Try a broader search.'}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {tab === 'global'
            ? globalPhotos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    triggerSelect(p.cdn_url, 'global', p.id, p.ai_description ?? null)
                  }
                  className="group relative aspect-square overflow-hidden rounded border border-zinc-200 hover:border-zinc-400"
                >
                  <img
                    src={p.cdn_url}
                    alt={p.ai_description || ''}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    draggable={false}
                    loading="lazy"
                  />
                  {p.city && (
                    <span className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-zinc-700">
                      {p.city}
                    </span>
                  )}
                </button>
              ))
            : userPhotos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    triggerSelect(
                      p.cdn_url,
                      'user',
                      p.id,
                      p.manual_caption ?? p.ai_description ?? null,
                    )
                  }
                  className="group relative aspect-square overflow-hidden rounded border border-zinc-200 hover:border-zinc-400"
                >
                  <img
                    src={p.cdn_url}
                    alt={p.manual_caption || p.ai_description || ''}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                    draggable={false}
                    loading="lazy"
                  />
                  {(p.pin_region || p.pin_landmark) && (
                    <span className="absolute left-1 top-1 rounded bg-blue-600/90 px-1 text-[10px] uppercase text-white">
                      Pinned
                    </span>
                  )}
                </button>
              ))}
        </div>

        {tab === 'global' && globalTotalPages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2 text-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-zinc-300 bg-white px-2 py-1 disabled:opacity-50"
            >
              ← Prev
            </button>
            <span className="text-zinc-600">{page} / {globalTotalPages}</span>
            <button
              type="button"
              disabled={page >= globalTotalPages}
              onClick={() => setPage((p) => Math.min(globalTotalPages, p + 1))}
              className="rounded border border-zinc-300 bg-white px-2 py-1 disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
