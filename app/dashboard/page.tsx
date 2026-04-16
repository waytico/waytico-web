'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { ChevronDown, ChevronRight } from 'lucide-react'
import ChatFlow from '@/components/chat-flow'
import ProjectCard, { type Project, type ProjectStatus } from '@/components/project-card'
import { apiFetch } from '@/lib/api'

type SortOption =
  | 'updated_desc'
  | 'updated_asc'
  | 'title_asc'
  | 'title_desc'
  | 'region_asc'

const ACTIVE_GROUP_ORDER: ProjectStatus[] = ['draft', 'quoted', 'active', 'completed']
const GROUP_LABEL: Record<ProjectStatus, string> = {
  draft: 'Draft',
  quoted: 'Quoted',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-[#E8DFD5] rounded-lg h-20"
        />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="w-full max-w-2xl mx-auto text-center space-y-6">
      <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-foreground">
        Create your first trip
      </h2>
      <ChatFlow />
    </div>
  )
}

function sortProjects(list: Project[], sort: SortOption): Project[] {
  const arr = [...list]
  const cmpStr = (a: string | null, b: string | null) =>
    (a ?? '').localeCompare(b ?? '', 'en', { sensitivity: 'base' })
  switch (sort) {
    case 'updated_desc':
      arr.sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at))
      break
    case 'updated_asc':
      arr.sort((a, b) => +new Date(a.updated_at) - +new Date(b.updated_at))
      break
    case 'title_asc':
      arr.sort((a, b) => cmpStr(a.title, b.title))
      break
    case 'title_desc':
      arr.sort((a, b) => cmpStr(b.title, a.title))
      break
    case 'region_asc':
      arr.sort((a, b) => cmpStr(a.region, b.region))
      break
  }
  return arr
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [sort, setSort] = useState<SortOption>('updated_desc')
  const [archivedOpen, setArchivedOpen] = useState(false)

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/sign-in')
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiFetch('/api/projects', { token })
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

  const groups = useMemo(() => {
    if (!projects) return null
    const sorted = sortProjects(projects, sort)
    const g: Record<ProjectStatus, Project[]> = {
      draft: [],
      quoted: [],
      active: [],
      completed: [],
      archived: [],
    }
    for (const p of sorted) {
      if (g[p.status]) g[p.status].push(p)
    }
    return g
  }, [projects, sort])

  const hasAnyActive = groups
    ? ACTIVE_GROUP_ORDER.some((s) => groups[s].length > 0)
    : false
  const archivedCount = groups ? groups.archived.length : 0

  return (
    <div className="min-h-[calc(100vh-73px)] bg-background text-foreground">
      <main className="max-w-4xl mx-auto px-4 py-10">
        {(!isLoaded || projects === null) && <SkeletonList />}

        {isLoaded && projects !== null && projects.length === 0 && <EmptyState />}

        {isLoaded && projects !== null && projects.length > 0 && groups && (
          <>
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
                Your trips
              </h1>
              <label className="flex items-center gap-2 text-sm text-foreground/70">
                <span className="sr-only sm:not-sr-only">Sort:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOption)}
                  className="bg-card border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  aria-label="Sort projects"
                >
                  <option value="updated_desc">Newest updated</option>
                  <option value="updated_asc">Oldest updated</option>
                  <option value="title_asc">Title A–Z</option>
                  <option value="title_desc">Title Z–A</option>
                  <option value="region_asc">Region A–Z</option>
                </select>
              </label>
            </div>

            {!hasAnyActive && archivedCount === 0 && (
              <p className="text-foreground/60 text-sm">
                No trips yet.
              </p>
            )}

            {!hasAnyActive && archivedCount > 0 && (
              <p className="text-foreground/60 text-sm mb-4">
                No active trips. Only archived below.
              </p>
            )}

            <div className="space-y-10">
              {ACTIVE_GROUP_ORDER.map((status) => {
                const items = groups[status]
                if (items.length === 0) return null
                return (
                  <section key={status}>
                    <h2 className="font-serif text-2xl tracking-tight mb-3">
                      {GROUP_LABEL[status]}
                      <span className="text-foreground/50 text-base font-sans ml-2">
                        {items.length}
                      </span>
                    </h2>
                    <div className="space-y-3">
                      {items.map((p) => (
                        <ProjectCard
                          key={p.id}
                          project={p}
                          onUpdate={handleUpdate}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>

            {archivedCount > 0 && (
              <section className="mt-10 pt-6 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setArchivedOpen((v) => !v)}
                  className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors group"
                  aria-expanded={archivedOpen}
                  aria-controls="archived-list"
                >
                  {archivedOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span className="font-serif text-xl tracking-tight">
                    Archived
                  </span>
                  <span className="text-foreground/40 text-sm font-sans">
                    {archivedCount}
                  </span>
                </button>

                {archivedOpen && (
                  <div id="archived-list" className="space-y-3 mt-4">
                    {groups.archived.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
