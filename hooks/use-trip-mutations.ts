'use client'

import { useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

/**
 * useTripMutations
 *
 * All inline-edit + delete helpers for the trip page, extracted from
 * trip-page-client.tsx. Each helper:
 *   - acquires a fresh Clerk token
 *   - fires the right endpoint
 *   - updates local React state optimistically on success
 *   - shows a toast on failure
 *
 * State is managed by the caller; this hook only mutates it via setters.
 */

type ProjectPayload = { project: any; tasks: any[]; media: any[] } | null

type Options = {
  projectId: string | undefined
  /** Setter for the top-level page payload (project + owner extras) */
  setData: (updater: (prev: ProjectPayload) => ProjectPayload) => void
  /** Setter for local tasks array (owner view) */
  setTasks: (updater: (cur: any[]) => any[]) => void
}

export function useTripMutations({ projectId, setData, setTasks }: Options) {
  const { getToken } = useAuth()
  const router = useRouter()

  const saveProjectPatch = useCallback(
    async (patch: Record<string, any>): Promise<boolean> => {
      if (!projectId) return false
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign in to edit')
          return false
        }
        const res = await apiFetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(patch),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err?.error || 'Save failed')
          return false
        }
        const payload = await res.json()
        if (payload?.project) {
          setData((prev) => (prev ? { ...prev, project: payload.project } : prev))
        }
        return true
      } catch {
        toast.error('Save failed')
        return false
      }
    },
    [projectId, getToken, setData],
  )

  const saveTaskPatch = useCallback(
    async (taskId: string, patch: Record<string, any>): Promise<boolean> => {
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign in to edit')
          return false
        }
        const res = await apiFetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(patch),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err?.error || 'Save failed')
          return false
        }
        const payload = await res.json()
        const updated = payload?.task
        if (updated) {
          setTasks((cur) => cur.map((t) => (t.id === taskId ? updated : t)))
        }
        return true
      } catch {
        toast.error('Save failed')
        return false
      }
    },
    [getToken, setTasks],
  )

  const saveDayPatch = useCallback(
    async (dayId: string, patch: Record<string, any>): Promise<boolean> => {
      if (!projectId) return false
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign in to edit')
          return false
        }
        const res = await apiFetch(`/api/projects/${projectId}/days/${dayId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(patch),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err?.error || 'Save failed')
          return false
        }
        const { day } = await res.json()
        setData((prev) => {
          if (!prev?.project) return prev
          const it = Array.isArray(prev.project.itinerary) ? prev.project.itinerary : []
          const newIt = it.map((d: any) => (d.id === dayId ? day : d))
          return { ...prev, project: { ...prev.project, itinerary: newIt } }
        })
        return true
      } catch {
        toast.error('Save failed')
        return false
      }
    },
    [projectId, getToken, setData],
  )

  const saveAccommodationCreate = useCallback(
    async (input: {
      name: string
      description?: string | null
      imageUrl?: string | null
    }): Promise<any> => {
      if (!projectId) return null
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign in to edit')
          return null
        }
        const res = await apiFetch(`/api/projects/${projectId}/accommodations`, {
          method: 'POST',
          token,
          body: JSON.stringify(input),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err?.error || 'Add failed')
          return null
        }
        const { accommodation } = await res.json()
        setData((prev) => {
          if (!prev) return prev
          const cur = Array.isArray((prev as any).accommodations)
            ? (prev as any).accommodations
            : []
          return { ...prev, accommodations: [...cur, accommodation] } as any
        })
        return accommodation
      } catch {
        toast.error('Add failed')
        return null
      }
    },
    [projectId, getToken, setData],
  )

  const saveAccommodationPatch = useCallback(
    async (id: string, patch: Record<string, any>): Promise<boolean> => {
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign in to edit')
          return false
        }
        const res = await apiFetch(`/api/accommodations/${id}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(patch),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err?.error || 'Save failed')
          return false
        }
        const { accommodation } = await res.json()
        setData((prev) => {
          if (!prev) return prev
          const cur = Array.isArray((prev as any).accommodations)
            ? (prev as any).accommodations
            : []
          return {
            ...prev,
            accommodations: cur.map((a: any) => (a.id === id ? accommodation : a)),
          } as any
        })
        return true
      } catch {
        toast.error('Save failed')
        return false
      }
    },
    [getToken, setData],
  )

  const saveAccommodationDelete = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign in to edit')
          return false
        }
        const res = await apiFetch(`/api/accommodations/${id}`, {
          method: 'DELETE',
          token,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err?.error || 'Delete failed')
          return false
        }
        setData((prev) => {
          if (!prev) return prev
          const cur = Array.isArray((prev as any).accommodations)
            ? (prev as any).accommodations
            : []
          return { ...prev, accommodations: cur.filter((a: any) => a.id !== id) } as any
        })
        return true
      } catch {
        toast.error('Delete failed')
        return false
      }
    },
    [getToken, setData],
  )

  const saveWhatToBring = useCallback(
    async (next: Array<{ category: string; items: string[] }>): Promise<boolean> => {
      if (!projectId) return false
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign in to edit')
          return false
        }
        const res = await apiFetch(`/api/projects/${projectId}/what-to-bring`, {
          method: 'PUT',
          token,
          body: JSON.stringify({ whatToBring: next }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err?.error || 'Save failed')
          return false
        }
        const { whatToBring } = await res.json()
        setData((prev) => {
          if (!prev?.project) return prev
          return { ...prev, project: { ...prev.project, what_to_bring: whatToBring } }
        })
        return true
      } catch {
        toast.error('Save failed')
        return false
      }
    },
    [projectId, getToken, setData],
  )

  const handleDeleteProject = useCallback(
    async (title: string) => {
      if (!projectId) return
      if (typeof window === 'undefined') return
      const ok = window.confirm(
        `Delete "${title}"? This cannot be undone. All photos, tasks, and documents will be removed.`,
      )
      if (!ok) return
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign in again')
          return
        }
        const res = await apiFetch(`/api/projects/${projectId}`, {
          method: 'DELETE',
          token,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err?.error || 'Could not delete')
          return
        }
        toast.success('Trip deleted')
        router.push('/dashboard')
      } catch {
        toast.error('Network error')
      }
    },
    [projectId, getToken, router],
  )

  return {
    saveProjectPatch,
    saveTaskPatch,
    saveDayPatch,
    saveAccommodationCreate,
    saveAccommodationPatch,
    saveAccommodationDelete,
    saveWhatToBring,
    handleDeleteProject,
  }
}
