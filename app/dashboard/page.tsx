'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Header from '@/components/header'
import SettingsStrip, { type StripExpanded } from '@/components/dashboard/settings-strip'
import WorkspaceTabs, { type WorkspaceView } from '@/components/dashboard/workspace-tabs'
import TripsTab from '@/components/dashboard/trips-tab'
import ClientsTab from '@/components/dashboard/clients-tab'
import type { Project } from '@/components/project-card'
import { apiFetch } from '@/lib/api'

function SkeletonRow() {
  return <div className="animate-pulse bg-secondary/50 rounded-md h-14 mb-2" />
}

function parseView(raw: string | null): WorkspaceView {
  return raw === 'clients' ? 'clients' : 'trips'
}

/**
 * /dashboard — operator workspace shell.
 *
 *   Header
 *   SettingsStrip (Profile / Preferences pills)
 *   WorkspaceTabs (Trips / Clients)
 *   TripsTab | ClientsTab
 *
 * Top-level URL state: ?view=trips|clients (default trips).
 * Trips-internal URL params live under t-prefixed keys (tq, ttab,
 * tsort, tdir, tpage, tper). Legacy unprefixed keys (q, tab, sort,
 * dir, page, per) are migrated once on first mount to keep shared
 * links from the pre-refactor era working.
 */
export default function DashboardPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [projects, setProjects] = useState<Project[] | null>(null)
  const [view, setView] = useState<WorkspaceView>(() => parseView(searchParams.get('view')))
  const [stripExpanded, setStripExpanded] = useState<StripExpanded>(null)

  // One-shot legacy URL migration. Old dashboard kept trips state on
  // unprefixed keys (?q=&tab=&sort=…). Map them to t-prefixed keys so
  // pre-refactor bookmarks land on the right rows. Idempotent: the
  // run-once guard prevents loops with the URL-sync effect inside
  // TripsTab.
  const [legacyMapped, setLegacyMapped] = useState(false)
  useEffect(() => {
    if (legacyMapped) return
    const sp = new URLSearchParams(searchParams.toString())
    let dirty = false
    const remap = (oldKey: string, newKey: string) => {
      if (sp.has(oldKey) && !sp.has(newKey)) {
        const v = sp.get(oldKey)
        if (v !== null) sp.set(newKey, v)
        sp.delete(oldKey)
        dirty = true
      } else if (sp.has(oldKey)) {
        sp.delete(oldKey)
        dirty = true
      }
    }
    remap('q', 'tq')
    remap('tab', 'ttab')
    remap('sort', 'tsort')
    remap('dir', 'tdir')
    remap('page', 'tpage')
    remap('per', 'tper')
    if (dirty) {
      const qs = sp.toString()
      router.replace(qs ? `/dashboard?${qs}` : '/dashboard', { scroll: false })
    }
    setLegacyMapped(true)
    // Run once on first mount; subsequent searchParams changes are
    // managed by tab-internal effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Push view changes into URL.
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString())
    if (view === 'trips') sp.delete('view')
    else sp.set('view', view)
    const qs = sp.toString()
    router.replace(qs ? `/dashboard?${qs}` : '/dashboard', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/sign-in')
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiFetch('/api/projects', { token, cache: 'no-store' })
        if (!res.ok) {
          if (active) setProjects([])
          return
        }
        const data = await res.json()
        const list: Project[] = data.projects ?? data ?? []
        if (active) setProjects(list)
      } catch {
        if (active) setProjects([])
      }
    })()
    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, getToken])

  function handleUpdate(updated: Project) {
    setProjects((prev) =>
      prev ? prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)) : prev,
    )
  }
  function handleDelete(id: string) {
    setProjects((prev) => (prev ? prev.filter((p) => p.id !== id) : prev))
  }

  const tripsCount = useMemo(() => projects?.length ?? 0, [projects])

  const loading = !isLoaded || projects === null

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-73px)] bg-background text-foreground">
        <main className="max-w-4xl mx-auto px-4 py-8">
          {loading ? (
            <div className="space-y-2 px-4">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : (
            <>
              <SettingsStrip
                expanded={stripExpanded}
                onToggle={setStripExpanded}
              />
              <WorkspaceTabs
                view={view}
                onChange={setView}
                tripsCount={tripsCount}
                clientsCount={null}
              />
              {view === 'trips' ? (
                <TripsTab
                  projects={projects}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ) : (
                <ClientsTab projects={projects} />
              )}
            </>
          )}
        </main>
      </div>
    </>
  )
}
