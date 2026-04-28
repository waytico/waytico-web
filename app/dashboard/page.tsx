'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import BrandCard from '@/components/brand-card'
import ChatFlow from '@/components/chat-flow'
import Header from '@/components/header'
import TripRow from '@/components/trip-row'
import type { Project, ProjectStatus } from '@/components/project-card'
import { GROUP_TITLES, groupTrips, type GroupKey } from '@/lib/trip-grouping'
import { apiFetch } from '@/lib/api'

const VISIBLE_GROUPS: GroupKey[] = ['attention', 'active', 'completed']

type SortMode = 'state' | 'created'
type StatusFilter = 'all' | ProjectStatus
type PerPage = 10 | 25 | 50 | 100

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

function GroupSection({
  title,
  count,
  children,
  emptyHint,
}: {
  title: string
  count: number
  children: React.ReactNode
  emptyHint?: string
}) {
  if (count === 0 && !emptyHint) return null
  return (
    <section className="mb-7">
      <div className="flex items-baseline gap-2 px-4 mb-2">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span className="text-xs text-foreground/40 font-sans">{count}</span>
      </div>
      {count === 0 ? (
        <div className="px-4 py-3 border-t border-border/50">
          <p className="text-xs text-foreground/50 italic">{emptyHint}</p>
        </div>
      ) : (
        children
      )}
    </section>
  )
}

const EMPTY_HINTS: Partial<Record<GroupKey, string>> = {
  active: 'No active trips. Create a new quote to get started.',
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('state')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [perPage, setPerPage] = useState<PerPage>(25)
  const [page, setPage] = useState(1)

  // Reset to page 1 whenever the visible result set changes shape
  // (search, filter, sort, perPage). Without this, switching from
  // page 3 → a tighter filter could leave you on an empty page.
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

  // 1. Search filter
  const searched = useMemo(() => {
    if (!projects) return null
    if (!search.trim()) return projects
    const q = search.toLowerCase().trim()
    return projects.filter((p) => {
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
  }, [projects, search])

  // 2. Status filter
  const filtered = useMemo(() => {
    if (!searched) return null
    if (statusFilter === 'all') return searched
    return searched.filter((p) => p.status === statusFilter)
  }, [searched, statusFilter])

  // 3. Two render shapes: grouped (state mode + all statuses) vs flat
  // (any other combination — created mode, or a specific status pin
  // — both make the by-state grouping irrelevant).
  const isGrouped = sortMode === 'state' && statusFilter === 'all'

  const grouped = useMemo(
    () => (isGrouped && filtered ? groupTrips(filtered) : null),
    [isGrouped, filtered],
  )

  // Flat list — used in created-mode or when a status filter is on.
  // Archive is INCLUDED here (no separate collapsible) so the operator
  // sees what they asked for in one continuous list.
  const flatList = useMemo(() => {
    if (!filtered) return null
    if (isGrouped) return null
    const sorted = [...filtered].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
    )
    return sorted
  }, [filtered, isGrouped])

  // Pagination only applies in flat mode. Grouped mode keeps every
  // section in full because attention/recent are typically small and
  // chopping them mid-section confuses the grouping signal.
  const totalCount = flatList?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
  const currentPage = Math.min(page, totalPages)
  const pagedList = useMemo(() => {
    if (!flatList) return null
    const start = (currentPage - 1) * perPage
    return flatList.slice(start, start + perPage)
  }, [flatList, currentPage, perPage])

  const totalActive = grouped
    ? grouped.attention.length + grouped.active.length + grouped.completed.length
    : 0
  const archivedCount = grouped ? grouped.archive.length : 0
  const hasAnyTrip = projects !== null && projects.length > 0
  const noResults =
    (isGrouped && totalActive === 0 && archivedCount === 0) ||
    (!isGrouped && totalCount === 0)

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-73px)] bg-background text-foreground">
        <main className="max-w-4xl mx-auto px-4 py-8">
          {/* Brand strip — always at top */}
          {isLoaded && projects !== null && <BrandCard />}

          {/* Loading state */}
          {(!isLoaded || projects === null) && (
            <div className="space-y-2 px-4">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          )}

          {/* Empty state — first-time user */}
          {isLoaded && projects !== null && projects.length === 0 && (
            <div className="mt-8 px-4">
              <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6 text-center">
                Create your first quote
              </h2>
              <ChatFlow />
            </div>
          )}

          {/* Trips panel — wraps toolbar + list + pagination in a card
              that mirrors the BrandCard above so the dashboard reads as
              two stacked sections (profile, trips) instead of a strip-
              then-loose-list. Slightly cooler tone (card vs secondary)
              so it doesn't echo the brand panel exactly. */}
          {isLoaded && hasAnyTrip && (
            <div className="rounded-lg border border-border bg-card mt-4 mb-6">
              {/* Toolbar */}
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

                {/* Sort */}
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

                {/* Status filter */}
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

              {/* No-results placeholder inside the panel */}
              {noResults && (
                <div className="px-4 py-8 text-sm text-foreground/50 text-center">
                  {search.trim() ? `No matches for “${search}”.` : 'Nothing to show with these filters.'}
                </div>
              )}

              {/* Grouped render (state + all statuses) */}
              {isGrouped && grouped && !noResults && (
                <div className="py-2">
                  {VISIBLE_GROUPS.map((key) => {
                    const items = grouped[key]
                    const hint = EMPTY_HINTS[key]
                    if (items.length === 0 && !hint) return null
                    return (
                      <GroupSection
                        key={key}
                        title={GROUP_TITLES[key]}
                        count={items.length}
                        emptyHint={hint}
                      >
                        {items.map((p) => (
                          <TripRow
                            key={p.id}
                            project={p}
                            showAttention={key === 'attention'}
                            dimmed={key === 'completed'}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                          />
                        ))}
                      </GroupSection>
                    )
                  })}

                  {/* Archive — only in grouped mode (otherwise archived
                      trips already mix into the flat list). */}
                  {archivedCount > 0 && (
                    <section className="mt-2 border-t border-border/50">
                      <button
                        type="button"
                        onClick={() => setArchiveOpen((v) => !v)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-foreground/60 hover:text-foreground w-full transition-colors"
                        aria-expanded={archiveOpen}
                      >
                        {archiveOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="font-medium">Archive</span>
                        <span className="text-xs text-foreground/40 font-sans">{archivedCount}</span>
                      </button>
                      {archiveOpen && (
                        <div>
                          {grouped.archive.map((p) => (
                            <TripRow
                              key={p.id}
                              project={p}
                              dimmed
                              onUpdate={handleUpdate}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}

              {/* Flat render (created mode, or any specific status filter) */}
              {!isGrouped && pagedList && pagedList.length > 0 && (
                <div className="py-1">
                  {pagedList.map((p) => (
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

              {/* Pagination footer — only meaningful in flat mode. */}
              {!isGrouped && totalCount > 0 && (
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

