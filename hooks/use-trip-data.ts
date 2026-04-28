'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiFetch } from '@/lib/api'
import type { MediaRecord } from '@/hooks/use-photo-upload'

/**
 * useTripData
 *
 * Encapsulates the three trip-level data flows:
 *   1. polling during AI generation (status='generating' → 'quoted')
 *   2. owner-detect + full payload fetch (GET /:id/full)
 *   3. refresh after agent tool-call edits (handleTripUpdated)
 *
 * Caller owns the top-level payload state and setters.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

type Payload = {
  project: any
  tasks: any[]
  media: any[]
  accommodations?: any[]
  owner?: any
  client?: any
} | null

type Options = {
  slug: string
  initialData: Payload
  setData: React.Dispatch<React.SetStateAction<Payload>>
  setTasks: React.Dispatch<React.SetStateAction<any[]>>
  setMedia: React.Dispatch<React.SetStateAction<MediaRecord[]>>
  isOwner: boolean
  setIsOwner: (v: boolean) => void
  // Current projectId — needed so owner-detect re-fires once polling
  // populates the trip (initial SSR returns 404 for status='generating',
  // so projectId is only known after the first successful poll tick).
  projectId: string | undefined
  // bumping this from the outside forces a re-fetch of /full
  ownerRefreshKey: number
}

export function useTripData({
  slug,
  initialData,
  setData,
  setTasks,
  setMedia,
  isOwner,
  setIsOwner,
  projectId,
  ownerRefreshKey,
}: Options) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const needsPolling =
    !initialData || initialData.project?.status === 'generating'
  const [polling, setPolling] = useState(needsPolling)

  // 1. Polling while AI generation is still running.
  useEffect(() => {
    if (!polling) return
    let active = true
    const poll = async () => {
      while (active) {
        try {
          const res = await fetch(`${API_URL}/api/public/projects/${slug}`)
          if (res.ok) {
            const d = await res.json()
            if (d.project?.status !== 'generating') {
              setData(d)
              setPolling(false)
              return
            }
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 3000))
      }
    }
    poll()
    const timeout = setTimeout(() => {
      active = false
      setPolling(false)
    }, 120_000)
    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [polling, slug, setData])

  // 2. Owner-detect + full payload fetch. /:id/full returns 200 only if the
  // caller owns the project. Uses the projectId prop directly so a just-
  // bumped ownerRefreshKey (e.g. after the claim flow attaches user_id)
  // immediately re-queries ownership without relying on setData-callback
  // timing, which is not synchronous in async contexts in React 18.
  const refreshOwnerData = useCallback(async () => {
    if (!projectId) return false
    try {
      const token = await getToken()
      if (!token) return false
      const ownRes = await apiFetch(`/api/projects/${projectId}/full`, { token })
      if (!ownRes.ok) return false
      const payload = await ownRes.json()
      setIsOwner(true)
      if (Array.isArray(payload.tasks)) setTasks(payload.tasks)
      if (Array.isArray(payload.media)) setMedia(payload.media as MediaRecord[])
      // Overlay owner brand + linked client onto the payload so themed
      // components and the operator service block can read them.
      setData((prev) =>
        prev
          ? {
              ...prev,
              owner: payload.owner ?? prev.owner ?? null,
              client: payload.client ?? null,
            }
          : prev
      )
      return true
    } catch {
      return false
    }
  }, [projectId, getToken, setIsOwner, setTasks, setMedia])

  // Fire owner-detect once we have an authed user + a projectId, and
  // re-fire whenever the caller bumps ownerRefreshKey or the projectId
  // becomes known (polling completes → SSR-null → populated).
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    ;(async () => {
      const ok = await refreshOwnerData()
      if (cancelled) return
      void ok
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, refreshOwnerData, ownerRefreshKey, projectId])

  // 3. Refresh after agent tool-call edits. Re-fetch public data (fresh
  // itinerary / hero / sections) and, if owner, overlay the richer /full
  // payload on top.
  const handleTripUpdated = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/public/projects/${slug}`, { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setData(d)
        const refreshed = isOwner ? await refreshOwnerData() : false
        if (!refreshed) {
          if (Array.isArray(d.media)) setMedia(d.media as MediaRecord[])
          if (Array.isArray(d.tasks)) setTasks(d.tasks)
        }
      }
    } catch {
      /* ignore */
    }
  }, [slug, isOwner, refreshOwnerData, setData, setMedia, setTasks])

  return {
    polling,
    refreshOwnerData,
    handleTripUpdated,
  }
}
