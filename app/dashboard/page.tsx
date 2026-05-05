'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { ArrowDown, ArrowUp, Search } from 'lucide-react'
import BrandCard from '@/components/brand-card'
import PreferencesCard from '@/components/preferences-card'
import ChatFlow from '@/components/chat-flow'
import Header from '@/components/header'
import TripRow from '@/components/trip-row'
import type { Project, ProjectStatus } from '@/components/project-card'
import { apiFetch } from '@/lib/api'

type SortMode = 'state' | 'client' | 'issued' | 'expires'
type SortDir = 'asc' | 'desc'
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

/** Sortable column-header button. Renders the column label with an arrow
 *  that's only visible when the column is the active sort target. The
 *  arrow direction reflects sortDir; clicking the active column toggles
 *  it, and picking a different column resets to 'asc' so each column's
 *  natural ordering (encoded in the comparator) shows first. */
function SortHeader({
  label,
  mode,
  active,
  dir,
  align = 'left',
  onPick,
}: {
  label: string
  mode: SortMode
  active: boolean
  dir: SortDir
  align?: 'left' | 'right'
  onPick: (next: SortMode) => void
}) {
  const Arrow = dir === 'asc' ? ArrowDown : ArrowUp
  return (
    <button
      type="button"
      onClick={() => onPick(mode)}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold transition-colors ${
        align === 'right' ? 'flex-row-reverse' : ''
      } ${active ? 'text-foreground/80' : 'text-foreground/40 hover:text-foreground/70'}`}
    >
      <span>{label}</span>
      <Arrow className={`w-3 h-3 ${active ? 'opacity-100' : 'opacity-0'}`} />
    </button>
  )
}

export default function DashboardPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('state')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [perPage, setPerPage] = useState<PerPage>(25)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [search, sortMode, sortDir, statusFilter, perPage])

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

  function pickSort(next: SortMode) {
    if (next === sortMode) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortMode(next)
      setSortDir('asc')
    }
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
    } else if (sortMode === 'client') {
      // Alphabetical by the dashboard's primary heading: nickname →
      // title fallback. Empty values sink to the bottom regardless of dir.
      sorted.sort((a, b) => {
        const ka = (a.client?.nickname || a.title || '').toLowerCase().trim()
        const kb = (b.client?.nickname || b.title || '').toLowerCase().trim()
        if (!ka && !kb) return 0
        if (!ka) return 1
        if (!kb) return -1
        return ka.localeCompare(kb)
      })
    } else if (sortMode === 'issued') {
      // Sort by proposal_date (when the quote was issued). Trips
      // without a proposal_date sink to the bottom regardless of dir.
      sorted.sort((a, b) => {
        const ad = (a as any).proposal_date as string | null
        const bd = (b as any).proposal_date as string | null
        if (ad && bd) return +new Date(bd) - +new Date(ad) // newest first
        if (ad) return -1
        if (bd) return 1
        return 0
      })
    } else if (sortMode === 'expires') {
      // Sort by valid_until (when the quote expires). Soonest-expiring
      // first by default; trips without a valid_until sink to bottom.
      sorted.sort((a, b) => {
        const ad = (a as any).valid_until as string | null
        const bd = (b as any).valid_until as string | null
        if (ad && bd) return +new Date(ad) - +new Date(bd) // soonest first
        if (ad) return -1
        if (bd) return 1
        return 0
      })
    }

    if (sortDir === 'desc') sorted.reverse()

    return sorted
  }, [projects, search, statusFilter, sortMode, sortDir])

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
          {isLoaded && projects !== null && (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/55 mb-2 px-1">
                Profile
              </h3>
              <BrandCard />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/55 mb-2 mt-6 px-1">
                Preferences
              </h3>
              <PreferencesCard />
            </>
          )}

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
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/55 mb-2 mt-6 px-1">
                Trips
              </h3>
              <div className="rounded-lg border border-border bg-card mb-6">
                {/* Toolbar: search + status filter. Sorting moved to
                    column headers below — there is no separate Sort
                    control. */}
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

                {/* Column headers — desktop. Widths mirror trip-row.tsx
                    exactly: 12 (avatar) / flex-1 (client) / 20 (issued) /
                    20 (expires) / 24 (state pill). Click a header to
                    sort by that column; click again to flip direction.
                    Headers only render when there are rows to sort. */}
                {totalCount > 0 && (
                  <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-border/70">
                    <div className="w-12 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <SortHeader
                        label="Client"
                        mode="client"
                        active={sortMode === 'client'}
                        dir={sortDir}
                        onPick={pickSort}
                      />
                    </div>
                    <div className="w-20 flex-shrink-0 flex justify-end">
                      <SortHeader
                        label="Issued"
                        mode="issued"
                        active={sortMode === 'issued'}
                        dir={sortDir}
                        align="right"
                        onPick={pickSort}
                      />
                    </div>
                    <div className="w-20 flex-shrink-0 flex justify-end">
                      <SortHeader
                        label="Expires"
                        mode="expires"
                        active={sortMode === 'expires'}
                        dir={sortDir}
                        align="right"
                        onPick={pickSort}
                      />
                    </div>
                    <div className="w-24 flex-shrink-0 flex justify-end">
                      <SortHeader
                        label="State"
                        mode="state"
                        active={sortMode === 'state'}
                        dir={sortDir}
                        align="right"
                        onPick={pickSort}
                      />
                    </div>
                  </div>
                )}

                {/* Column headers — mobile. The Issued / Expires columns
                    in trip-row are hidden below md, so strict alignment
                    is impossible; instead we render a compact sort
                    chip-row so all four sort axes stay reachable on
                    phones. */}
                {totalCount > 0 && (
                  <div className="md:hidden flex items-center gap-2 flex-wrap px-4 py-2 border-b border-border/70">
                    <span className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold">
                      Sort
                    </span>
                    <SortHeader label="Client" mode="client" active={sortMode === 'client'} dir={sortDir} onPick={pickSort} />
                    <SortHeader label="Issued" mode="issued" active={sortMode === 'issued'} dir={sortDir} onPick={pickSort} />
                    <SortHeader label="Expires" mode="expires" active={sortMode === 'expires'} dir={sortDir} onPick={pickSort} />
                    <SortHeader label="State" mode="state" active={sortMode === 'state'} dir={sortDir} onPick={pickSort} />
                  </div>
                )}

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
            </>
          )}
        </main>
      </div>
    </>
  )
}
