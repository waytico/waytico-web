'use client'

/**
 * use-photo-bank — Photo Bank list/mutate hook (TZ Photo Bank Stage 4).
 *
 * Stub-level. Paid path code-only (caller gates by `plan === 'paid'`),
 * free path uses `listGlobalPhotos` directly via the page client.
 *
 * Returns a minimal cursor-paginated list state. End-to-end mutations
 * (PATCH meta, DELETE, restore) are wired through `photo-bank-api.ts`
 * but not exercised by the free UI.
 */

import { useCallback, useEffect, useState } from 'react'
import { listUserPhotos, type UserPhotoItem } from '@/lib/photo-bank-api'

export interface UsePhotoBankOptions {
  authedFetch: (path: string, init?: RequestInit) => Promise<Response>
  enabled?: boolean
}

export interface UsePhotoBankResult {
  photos: UserPhotoItem[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function usePhotoBank(opts: UsePhotoBankOptions): UsePhotoBankResult {
  const { authedFetch, enabled = true } = opts
  const [photos, setPhotos] = useState<UserPhotoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    listUserPhotos(authedFetch, {})
      .then((r) => setPhotos(r.photos))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [authedFetch, enabled])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { photos, loading, error, refresh }
}
