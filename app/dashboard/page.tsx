'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Search } from 'lucide-react'
import BrandCard from '@/components/brand-card'
import ChatFlow from '@/components/chat-flow'
import Header from '@/components/header'
import TripRow from '@/components/trip-row'
import type { Project, ProjectStatus } from '@/components/project-card'
import { apiFetch } from '@/lib/api'

type SortMode = 'state' | 'created'
type StatusFilter = 'all' | ProjectStatus
type PerPage = 10 | 25 | 50 | 100

const STATUS_ORDER: Record<ProjectStatus, number> = {
  draft: 0,
  quoted: 1,
  active: 2,
  completed: 3,
  archived: 4,
}

const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All trips' },
  { key: 'draft', label: 'Drafts' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
]

const PER_PAGE_OPTIONS: PerPage[] = [10, 25, 50, 100]

function SkeletonRow() {
  return <div className="animate-pulse bg-secondary/50 rounded-md h-14 mb-2" />
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('state')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [perPage, setPerPage] = useState<PerPage>(25)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [search, sortMode, statusFilter, perPage])

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
    setProjects((prev) => (prev ? prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)) : prev))
  }

  function handleDelete(id: string) {
    setProjects((prev) => (prev ? prev.filter((p) => p.id !== id) : prev))
  }

  // Search → filter → sort.
  const visible = useMemo(() => {
    if (!projects) return null
    let list = projects

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter((p) => {
        const hay = [
          p.title,
          p.region,
          p.country,
          p.client?.nickname,
          p.client?.name,
          p.client?.email,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q)
      })
    }

    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter)
    }

    const sorted = [...list]
    if (sortMode === 'state') {
      sorted.sort((a, b) => {
        const sa = STATUS_ORDER[a.status as ProjectStatus] ?? 99
        const sb = STATUS_ORDER[b.status as ProjectStatus] ?? 99
        if (sa !== sb) return sa - sb
        return +new Date(b.created_at) - +new Date(a.created_at)
      })
    } else {
      sorted.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    }

    return sorted
  }, [projects, search, statusFilter, sortMode])

  const totalCount = visible?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
  const currentPage = Math.min(page, totalPages)
  const pagedList = useMemo(() => {
    if (!visible) return null
    const start = (currentPage - 1) * perPage
    return visible.slice(start, start + perPage)
  }, [visible, currentPage, perPage])

  const hasAnyTrip = projects !== null && projects.length > 0

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-73px)] bg-background text-foreground">
        <main className="max-w-4xl mx-auto px-4 py-8">
          {isLoaded && projects !== null && <BrandCard />}

          {(!isLoaded || projects === null) && (
            <div className="space-y-2 px-4">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {isLoaded && projects !== null && projects.length === 0 && (
            <div className="mt-8 px-4">
              <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6 text-center">
                Create your first quote
              </h2>
              <ChatFlow />
            </div>
          )}

          {isLoaded && hasAnyTrip && (
            <div className="rounded-lg border border-border bg-card mt-4 mb-6">
              <div className="border-b border-border/70 px-4 py-3 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                  <input
                    type="search"
                    placeholder="Search trips, clients…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 h-8 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <label className="flex items-center gap-1.5 text-xs text-foreground/60">
                  Sort
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="h-8 px-2 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="state">By state</option>
                    <option value="created">By date created</option>
                  </select>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-foreground/60">
                  Show
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="h-8 px-2 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {STATUS_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {totalCount === 0 ? (
                <div className="px-4 py-8 text-sm text-foreground/50 text-center">
                  {search.trim() ? `No matches for “${search}”.` : 'Nothing to show with these filters.'}
                </div>
              ) : (
                <div className="py-1">
                  {pagedList?.map((p) => (
                    <TripRow
                      key={p.id}
                      project={p}
                      dimmed={p.status === 'completed' || p.status === 'archived'}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}

              {totalCount > 0 && (
                <div className="border-t border-border/70 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-foreground/60">
                  <div>
                    {((currentPage - 1) * perPage + 1).toLocaleString()}–
                    {Math.min(currentPage * perPage, totalCount).toLocaleString()}{' '}
                    of {totalCount.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5">
                      Per page
                      <select
                        value={perPage}
                        onChange={(e) => setPerPage(Number(e.target.value) as PerPage)}
                        className="h-7 px-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {PER_PAGE_OPTIONS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setPage((n) => Math.max(1, n - 1))}
                        className="px-2 py-1 rounded hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous page"
                      >
                        ‹
                      </button>
                      <span className="px-1">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
                        className="px-2 py-1 rounded hover:bg-secondary/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next page"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
