'use client'

/**
 * use-admin-photo-review — TZ Photo Bank Stage 10 Block D.
 *
 * Manages the admin review queue:
 *   - fetch unreviewed (or all) global rows.
 *   - approve / delete / patch metadata via /api/admin/global-bank/* endpoints.
 *   - keyboard navigation: Enter = Keep focused card, Backspace/Delete = Delete.
 *   - optimistic removal: clicked card disappears, next card slides into focus.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReviewPhoto, PhotoPatch } from '@/components/admin/photo-review-card'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

export type AuthedFetch = (path: string, init?: RequestInit) => Promise<Response>

export interface ReviewFilters {
  reviewed?: 'true' | 'false' | 'all'
  search?: string
  city?: string
  country?: string
  category?: string
  /** Stage 11 — restrict listing to specific photo IDs (used by the
   *  "Show photos from this crawl" link on /admin/photo-bank/crawl).
   *  When set, search/city/country/category still AND with it. */
  ids?: string[]
  /** Stage 11 — when explicitly false, the hook skips its fetch and
   *  returns an empty result. Used by the browse view so the photo
   *  grid doesn't load anything until a city is picked. Default true. */
  enabled?: boolean
  page?: number
  perPage?: number
}

export interface UseAdminReviewResult {
  photos: ReviewPhoto[]
  loading: boolean
  error: string | null
  totalCount: number
  totalPages: number
  page: number
  perPage: number
  focusedId: string | null
  setFocusedId: (id: string | null) => void
  approve: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  saveMeta: (id: string, patch: PhotoPatch) => Promise<void>
  refresh: () => void
  setPage: (n: number) => void
  setPerPage: (n: number) => void
}

export function useAdminPhotoReview(
  authedFetch: AuthedFetch,
  filters: ReviewFilters = {},
): UseAdminReviewResult {
  const [photos, setPhotos] = useState<ReviewPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(filters.page ?? 1)
  const [perPage, setPerPage] = useState(filters.perPage ?? 50)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const busyRef = useRef<Set<string>>(new Set())

  const idsKey = (filters.ids ?? []).join(',')
  const enabled = filters.enabled !== false
  const reload = useCallback(async () => {
    if (!enabled) {
      setPhotos([])
      setTotalCount(0)
      setTotalPages(1)
      setFocusedId(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const sp = new URLSearchParams()
      sp.set('reviewed', filters.reviewed ?? 'false')
      sp.set('page', String(page))
      sp.set('perPage', String(perPage))
      if (filters.search) sp.set('search', filters.search)
      if (filters.city) sp.set('city', filters.city)
      if (filters.country) sp.set('country', filters.country)
      if (filters.category) sp.set('category', filters.category)
      if (idsKey) sp.set('ids', idsKey)
      const res = await authedFetch(`${API_URL}/api/admin/global-bank/photos?${sp.toString()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j = (await res.json()) as {
        photos: ReviewPhoto[]
        totalCount: number
        totalPages: number
      }
      setPhotos(j.photos)
      setTotalCount(j.totalCount)
      setTotalPages(j.totalPages)
      if (j.photos.length > 0) setFocusedId((id) => id ?? j.photos[0].id)
      else setFocusedId(null)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [
    authedFetch,
    page,
    perPage,
    filters.reviewed,
    filters.search,
    filters.city,
    filters.country,
    filters.category,
    idsKey,
    enabled,
  ])

  useEffect(() => {
    reload()
  }, [reload])

  const optimisticRemove = useCallback((id: string) => {
    setPhotos((cur) => {
      const idx = cur.findIndex((p) => p.id === id)
      const next = cur.filter((p) => p.id !== id)
      // shift focus forward
      const nextFocus =
        idx >= 0 && idx < next.length
          ? next[idx]?.id
          : next[next.length - 1]?.id ?? null
      setFocusedId(nextFocus ?? null)
      return next
    })
  }, [])

  const approve = useCallback(
    async (id: string) => {
      if (busyRef.current.has(id)) return
      busyRef.current.add(id)
      try {
        const res = await authedFetch(
          `${API_URL}/api/admin/global-bank/photos/${id}/approve`,
          { method: 'POST' },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        optimisticRemove(id)
      } catch (e: any) {
        setError(e?.message ?? 'Approve failed')
      } finally {
        busyRef.current.delete(id)
      }
    },
    [authedFetch, optimisticRemove],
  )

  const remove = useCallback(
    async (id: string) => {
      if (busyRef.current.has(id)) return
      busyRef.current.add(id)
      try {
        const res = await authedFetch(
          `${API_URL}/api/admin/global-bank/photos/${id}`,
          { method: 'DELETE' },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        optimisticRemove(id)
      } catch (e: any) {
        setError(e?.message ?? 'Delete failed')
      } finally {
        busyRef.current.delete(id)
      }
    },
    [authedFetch, optimisticRemove],
  )

  const saveMeta = useCallback(
    async (id: string, patch: PhotoPatch) => {
      try {
        const res = await authedFetch(
          `${API_URL}/api/admin/global-bank/photos/${id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const j = (await res.json()) as { photo: ReviewPhoto }
        setPhotos((cur) => cur.map((p) => (p.id === id ? j.photo : p)))
      } catch (e: any) {
        setError(e?.message ?? 'Save failed')
      }
    },
    [authedFetch],
  )

  // Keyboard navigation: Enter = Keep focused, Delete/Backspace = Delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!focusedId) return
      const target = e.target as HTMLElement | null
      if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return
      if (e.key === 'Enter') {
        e.preventDefault()
        approve(focusedId)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        remove(focusedId)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [focusedId, approve, remove])

  return {
    photos,
    loading,
    error,
    totalCount,
    totalPages,
    page,
    perPage,
    focusedId,
    setFocusedId,
    approve,
    remove,
    saveMeta,
    refresh: reload,
    setPage,
    setPerPage,
  }
}
