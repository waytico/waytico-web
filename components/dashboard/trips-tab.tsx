'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowDown, ArrowUp, Plus, Search } from 'lucide-react'
import ChatFlow from '@/components/chat-flow'
import TripRow from '@/components/trip-row'
import type { Project, ProjectStatus } from '@/components/project-card'

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

const TAB_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
]

const PER_PAGE_OPTIONS: PerPage[] = [10, 25, 50, 100]
const VALID_SORT_MODES: SortMode[] = ['state', 'client', 'issued', 'expires']
const VALID_PER_PAGE: PerPage[] = [10, 25, 50, 100]

function parseStatusFilter(raw: string | null): StatusFilter {
  if (!raw) return 'all'
  if (
    raw === 'all' ||
    raw === 'draft' ||
    raw === 'quoted' ||
    raw === 'active' ||
    raw === 'completed' ||
    raw === 'archived'
  ) return raw
  return 'all'
}

function parseSortMode(raw: string | null): SortMode {
  if (raw && (VALID_SORT_MODES as string[]).includes(raw)) return raw as SortMode
  return 'state'
}

function parseSortDir(raw: string | null): SortDir {
  return raw === 'desc' ? 'desc' : 'asc'
}

function parsePerPage(raw: string | null): PerPage {
  const n = raw ? Number(raw) : NaN
  if ((VALID_PER_PAGE as number[]).includes(n)) return n as PerPage
  return 25
}

function parsePage(raw: string | null): number {
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

/** Sortable column-header button. Renders the column label with an arrow
 *  that's only visible when the column is the active sort target. The
 *  arrow direction reflects sortDir; clicking the active column toggles
 *  it, and picking a different column resets to 'asc'. */
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

type Props = {
  projects: Project[] | null
  onUpdate: (p: Project) => void
  onDelete: (id: string) => void
}

/**
 * TripsTab — list view of operator's trips with status tabs, search,
 * sort, and pagination. URL state lives under t-prefixed query params
 * (tq / ttab / tsort / tdir / tpage / tper) so it doesn't collide with
 * the upcoming ClientsTab params.
 *
 * Empty state (no trips at all) renders ChatFlow + heading inline,
 * matching the pre-refactor experience for a fresh operator.
 */
export default function TripsTab({ projects, onUpdate, onDelete }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(() => searchParams.get('tq') ?? '')
  const [sortMode, setSortMode] = useState<SortMode>(() =>
    parseSortMode(searchParams.get('tsort')),
  )
  const [sortDir, setSortDir] = useState<SortDir>(() =>
    parseSortDir(searchParams.get('tdir')),
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() =>
    parseStatusFilter(searchParams.get('ttab')),
  )
  const [perPage, setPerPage] = useState<PerPage>(() =>
    parsePerPage(searchParams.get('tper')),
  )
  const [page, setPage] = useState(() => parsePage(searchParams.get('tpage')))

  // Push state into URL with t-prefixed keys. Preserve unrelated keys
  // (notably ?view=trips) so we don't clobber the workspace switcher.
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const setOrDel = (k: string, v: string | null) => {
      if (v === null) params.delete(k)
      else params.set(k, v)
    }
    setOrDel('tq', search.trim() || null)
    setOrDel('ttab', statusFilter !== 'all' ? statusFilter : null)
    setOrDel('tsort', sortMode !== 'state' ? sortMode : null)
    setOrDel('tdir', sortDir !== 'asc' ? sortDir : null)
    setOrDel('tpage', page !== 1 ? String(page) : null)
    setOrDel('tper', perPage !== 25 ? String(perPage) : null)
    const qs = params.toString()
    router.replace(qs ? `/dashboard?${qs}` : '/dashboard', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, sortMode, sortDir, page, perPage])

  // Reset to page 1 whenever something that would change row counts moves.
  useEffect(() => {
    setPage(1)
  }, [search, sortMode, sortDir, statusFilter, perPage])

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
      sorted.sort((a, b) => {
        const ka = (a.client?.nickname || a.title || '').toLowerCase().trim()
        const kb = (b.client?.nickname || b.title || '').toLowerCase().trim()
        if (!ka && !kb) return 0
        if (!ka) return 1
        if (!kb) return -1
        return ka.localeCompare(kb)
      })
    } else if (sortMode === 'issued') {
      sorted.sort((a, b) => {
        const ad = (a as any).proposal_date as string | null
        const bd = (b as any).proposal_date as string | null
        if (ad && bd) return +new Date(bd) - +new Date(ad)
        if (ad) return -1
        if (bd) return 1
        return 0
      })
    } else if (sortMode === 'expires') {
      sorted.sort((a, b) => {
        const ad = (a as any).valid_until as string | null
        const bd = (b as any).valid_until as string | null
        if (ad && bd) return +new Date(ad) - +new Date(bd)
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

  // First-time empty state lives inside TripsTab so the user sees the
  // chat flow without leaving the workspace.
  if (projects !== null && projects.length === 0) {
    return (
      <div className="mt-2 px-1">
        <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6 text-center">
          Create your first quote
        </h2>
        <ChatFlow />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card mb-6">
      {/* Status tabs row + "+ New trip" */}
      <div
        className="border-b border-border/40 px-2 sm:px-4 flex items-center gap-1 overflow-x-auto"
        role="tablist"
        aria-label="Filter trips by status"
      >
        {TAB_FILTERS.map((tab) => {
          const count =
            tab.key === 'all'
              ? projects?.length ?? 0
              : projects?.filter((p) => p.status === tab.key).length ?? 0
          const active = statusFilter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatusFilter(tab.key)}
              className={`relative py-2 px-3 text-sm whitespace-nowrap transition-colors ${
                active
                  ? 'text-foreground font-medium'
                  : 'text-foreground/55 hover:text-foreground/85'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-xs ${
                  active ? 'text-foreground/55' : 'text-foreground/35'
                }`}
              >
                {count}
              </span>
              {active && (
                <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Toolbar: search + "+ New trip" button */}
      <div className="border-b border-border/40 px-4 py-2.5 flex flex-wrap items-center gap-3">
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
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="New trip"
          title="New trip"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium uppercase tracking-wider rounded-md border border-border text-foreground/80 hover:bg-secondary/60 hover:text-foreground transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New trip</span>
        </button>
      </div>

      {totalCount > 0 && (
        <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-border/40">
          <div className="w-12 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <SortHeader label="Client" mode="client" active={sortMode === 'client'} dir={sortDir} onPick={pickSort} />
          </div>
          <div className="w-20 flex-shrink-0 flex justify-end">
            <SortHeader label="Issued" mode="issued" active={sortMode === 'issued'} dir={sortDir} align="right" onPick={pickSort} />
          </div>
          <div className="w-20 flex-shrink-0 flex justify-end">
            <SortHeader label="Expires" mode="expires" active={sortMode === 'expires'} dir={sortDir} align="right" onPick={pickSort} />
          </div>
          <div className="w-24 flex-shrink-0 flex justify-end">
            <SortHeader label="State" mode="state" active={sortMode === 'state'} dir={sortDir} align="right" onPick={pickSort} />
          </div>
        </div>
      )}

      {totalCount > 0 && (
        <div className="md:hidden flex items-center gap-2 flex-wrap px-4 py-2 border-b border-border/40">
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
          {search.trim() ? `No matches for "${search}".` : 'Nothing to show with these filters.'}
        </div>
      ) : (
        <div className="py-1">
          {pagedList?.map((p) => (
            <TripRow
              key={p.id}
              project={p}
              dimmed={p.status === 'completed' || p.status === 'archived'}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {totalCount > 0 && (
        <div className="border-t border-border/40 px-4 py-2 flex items-center justify-between gap-3 text-xs text-foreground/60">
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
  )
}

