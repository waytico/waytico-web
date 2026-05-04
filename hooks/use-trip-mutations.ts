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
  /**
   * Showcase / demo mode. When true, every mutation skips the network call
   * and only updates local React state. F5 resets everything (intentional —
   * this is a shared demo trip and changes should never persist back to the
   * system showcase user). The home-page CTA + the trip page detect the
   * showcase by slug and pass this flag in.
   */
  isShowcase?: boolean
}

export function useTripMutations({ projectId, setData, setTasks, isShowcase }: Options) {
  const { getToken } = useAuth()
  const router = useRouter()

  const saveProjectPatch = useCallback(
    async (patch: Record<string, any>): Promise<boolean> => {
      if (!projectId) return false
      // Showcase mode — pretend the PATCH succeeded, only mutate local state.
      // We translate camelCase patch keys to snake_case so the local project
      // shape matches what the backend would have returned.
      if (isShowcase) {
        setData((prev) => {
          if (!prev?.project) return prev
          const merged = { ...prev.project }
          for (const [k, v] of Object.entries(patch)) {
            const snake = k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
            merged[snake] = v
            merged[k] = v
          }
          // Pricing reconciliation. The backend's reconcilePricing keeps
          // price_per_person ↔ price_total ↔ group_size in sync via the
          // current pricing_mode; we do the same here so the demo behaves
          // the same way for the user.
          //   - per_traveler: total = pp × group
          //   - per_group:    pp = total / group
          //   - other:        total drives the headline; pp follows if group set
          const touched = Object.keys(patch)
          const pricingTouched = touched.some((k) =>
            ['pricePerPerson', 'priceTotal', 'groupSize', 'pricingMode'].includes(k),
          )
          if (pricingTouched) {
            const mode = (merged.pricing_mode as string) || 'per_group'
            const group = Number(merged.group_size) || 0
            const pp = merged.price_per_person == null ? null : Number(merged.price_per_person)
            const total = merged.price_total == null ? null : Number(merged.price_total)
            if (mode === 'per_traveler') {
              if (pp != null && group > 0) {
                merged.price_total = Math.round(pp * group)
              }
            } else {
              // per_group / other — total is canonical; derive pp when possible.
              if (total != null && group > 0) {
                merged.price_per_person = Math.round(total / group)
              } else if (pp != null && group > 0 && total == null) {
                merged.price_total = Math.round(pp * group)
              }
            }
          }
          return { ...prev, project: merged }
        })
        return true
      }
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign up to edit')
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
    [projectId, getToken, setData, isShowcase],
  )

  /**
   * Save a single hero highlight slot (Magazine theme).
   *
   * Replaces the legacy saveHighlight which read the array from a closure
   * and PATCHed the full array via saveProjectPatch — that path lost
   * writes when two slots were edited before the first PATCH response
   * returned (last-write-wins on a stale closure). The new path scopes
   * the write to a single slot via PATCH /api/projects/:id/highlights/:idx;
   * the backend wraps the read + patch + write in a single transaction
   * with SELECT FOR UPDATE so concurrent slot edits serialize on the row
   * lock.
   *
   * In showcase mode, the functional setData updater reads the latest
   * local highlights, places the trimmed value at idx, and compacts —
   * matching the backend's compaction rules (empties stripped, cap at 3).
   * Because the updater receives the latest state from React, there is
   * no closure race even though no network call happens.
   */
  const saveHighlightSlot = useCallback(
    async (idx: number, raw: string | null): Promise<boolean> => {
      if (!projectId) return false
      const trimmed = typeof raw === 'string' ? raw.trim() : ''

      if (isShowcase) {
        setData((prev) => {
          if (!prev?.project) return prev
          const cur: unknown = (prev.project as any).highlights
          const arr: string[] = Array.isArray(cur)
            ? cur.map((s) => (typeof s === 'string' ? s : ''))
            : []
          while (arr.length <= idx) arr.push('')
          arr[idx] = trimmed
          const cleaned = arr
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .slice(0, 3)
          return {
            ...prev,
            project: { ...prev.project, highlights: cleaned },
          }
        })
        return true
      }

      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign up to edit')
          return false
        }
        const res = await apiFetch(`/api/projects/${projectId}/highlights/${idx}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ value: trimmed.length === 0 ? null : trimmed }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err?.error || 'Save failed')
          return false
        }
        const payload = await res.json()
        if (Array.isArray(payload?.highlights)) {
          setData((prev) =>
            prev?.project
              ? { ...prev, project: { ...prev.project, highlights: payload.highlights } }
              : prev,
          )
        }
        return true
      } catch {
        toast.error('Save failed')
        return false
      }
    },
    [projectId, getToken, setData, isShowcase],
  )


  const saveTaskPatch = useCallback(
    async (taskId: string, patch: Record<string, any>): Promise<boolean> => {
      if (isShowcase) {
        setTasks((cur) =>
          cur.map((t) => {
            if (t.id !== taskId) return t
            const merged = { ...t }
            for (const [k, v] of Object.entries(patch)) {
              const snake = k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
              merged[snake] = v
              merged[k] = v
            }
            return merged
          }),
        )
        return true
      }
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign up to edit')
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
    [getToken, setTasks, isShowcase],
  )

  const saveDayPatch = useCallback(
    async (dayId: string, patch: Record<string, any>): Promise<boolean> => {
      if (!projectId) return false
      if (isShowcase) {
        setData((prev) => {
          if (!prev?.project) return prev
          const it = Array.isArray(prev.project.itinerary) ? prev.project.itinerary : []
          const newIt = it.map((d: any) => {
            if (d.id !== dayId) return d
            const merged = { ...d }
            for (const [k, v] of Object.entries(patch)) {
              const snake = k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
              merged[snake] = v
              merged[k] = v
            }
            return merged
          })
          return { ...prev, project: { ...prev.project, itinerary: newIt } }
        })
        return true
      }
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign up to edit')
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
    [projectId, getToken, setData, isShowcase],
  )

  const saveAccommodationCreate = useCallback(
    async (input: {
      name: string
      description?: string | null
      imageUrl?: string | null
      checkInDate?: string | null
      location?: string | null
      nights?: number | null
    }): Promise<any> => {
      if (!projectId) return null
      if (isShowcase) {
        const fake = {
          id: 'showcase-' + Math.random().toString(36).slice(2, 10),
          project_id: projectId,
          name: input.name,
          description: input.description ?? null,
          image_url: input.imageUrl ?? null,
          check_in_date: input.checkInDate ?? null,
          location: input.location ?? null,
          nights: input.nights ?? null,
          sort_order: 999,
        }
        setData((prev) => {
          if (!prev) return prev
          const cur = Array.isArray((prev as any).accommodations)
            ? (prev as any).accommodations
            : []
          return { ...prev, accommodations: [...cur, fake] } as any
        })
        return fake
      }
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign up to edit')
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
    [projectId, getToken, setData, isShowcase],
  )

  const saveAccommodationPatch = useCallback(
    async (id: string, patch: Record<string, any>): Promise<boolean> => {
      if (isShowcase) {
        setData((prev) => {
          if (!prev) return prev
          const cur = Array.isArray((prev as any).accommodations)
            ? (prev as any).accommodations
            : []
          return {
            ...prev,
            accommodations: cur.map((a: any) => {
              if (a.id !== id) return a
              const merged = { ...a }
              for (const [k, v] of Object.entries(patch)) {
                const snake = k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())
                merged[snake] = v
                merged[k] = v
              }
              return merged
            }),
          } as any
        })
        return true
      }
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign up to edit')
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
    [getToken, setData, isShowcase],
  )

  const saveAccommodationDelete = useCallback(
    async (id: string): Promise<boolean> => {
      if (isShowcase) {
        setData((prev) => {
          if (!prev) return prev
          const cur = Array.isArray((prev as any).accommodations)
            ? (prev as any).accommodations
            : []
          return { ...prev, accommodations: cur.filter((a: any) => a.id !== id) } as any
        })
        return true
      }
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign up to edit')
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
    [getToken, setData, isShowcase],
  )

  const saveWhatToBring = useCallback(
    async (next: Array<{ category: string; items: string[] }>): Promise<boolean> => {
      if (!projectId) return false
      if (isShowcase) {
        setData((prev) => {
          if (!prev?.project) return prev
          return { ...prev, project: { ...prev.project, what_to_bring: next } }
        })
        return true
      }
      try {
        const token = await getToken()
        if (!token) {
          toast.error('Sign up to edit')
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
    [projectId, getToken, setData, isShowcase],
  )

  const handleDeleteProject = useCallback(
    async (title: string) => {
      if (!projectId) return
      if (typeof window === 'undefined') return
      if (isShowcase) {
        toast.info("This is a demo trip — you can't delete it.")
        return
      }
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
    [projectId, getToken, router, isShowcase],
  )

  return {
    saveProjectPatch,
    saveHighlightSlot,
    saveTaskPatch,
    saveDayPatch,
    saveAccommodationCreate,
    saveAccommodationPatch,
    saveAccommodationDelete,
    saveWhatToBring,
    handleDeleteProject,
  }
}

