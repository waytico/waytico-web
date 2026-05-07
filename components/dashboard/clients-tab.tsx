'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import ClientRow from './client-row'
import NewClientModal from './new-client-modal'
import EditClientModal from './edit-client-modal'
import { apiFetch } from '@/lib/api'
import type { Project } from '@/components/project-card'
import type { Client } from '@/components/trip/trip-types'
import {
  clientLastActivity,
  clientLocalMatch,
  clientTripCounts,
  deriveClientStatus,
  type ClientStatus,
} from '@/lib/clients-derive'

type StatusTab = 'all' | ClientStatus
type SortMode = 'name' | 'activity' | 'trips'
type SortDir = 'asc' | 'desc'
type PerPage = 10 | 25 | 50 | 100

const STATUS_TABS: ReadonlyArray<{ key: StatusTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'prospect', label: 'Prospects' },
  { key: 'past', label: 'Past' },
]

const PER_PAGE_OPTIONS: PerPage[] = [10, 25, 50, 100]
const VALID_PER: PerPage[] = [10, 25, 50, 100]
const VALID_SORT: SortMode[] = ['name', 'activity', 'trips']

function parseStatus(raw: string | null): StatusTab {
  if (raw === 'active' || raw === 'prospect' || raw === 'past') return raw
  return 'all'
}
function parseSort(raw: string | null): SortMode {
  return raw && (VALID_SORT as string[]).includes(raw) ? (raw as SortMode) : 'activity'
}
function parseDir(raw: string | null): SortDir { return raw === 'asc' ? 'asc' : 'desc' }
function parsePer(raw: string | null): PerPage {
  const n = raw ? Number(raw) : NaN
  return (VALID_PER as number[]).includes(n) ? (n as PerPage) : 25
}
function parsePage(raw: string | null): number {
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

type Props = {
  clients: Client[] | null
  projects: Project[] | null
  refresh: () => Promise<void>
}

/**
 * ClientsTab — full CRM list. Status tabs, search (local — server-side
 * smart-search lives in SmartClientPicker), sortable columns, pagination.
 * Toggles for Hide blacklisted (default ON) and Show archived (default OFF).
 * "+ New client" opens a modal; ActionMenu on each row opens edit modal
 * or toggles archive / blacklist via PATCH /api/clients/:id.
 *
 * URL state under c-prefixed keys (cq, ctab, csort, cdir, cpage, cper,
 * chideblack, cshowarch).
 */
export default function ClientsTab({ clients, projects, refresh }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken } = useAuth()

  const [search, setSearch] = useState(() => searchParams.get('cq') ?? '')
  const [statusTab, setStatusTab] = useState<StatusTab>(() => parseStatus(searchParams.get('ctab')))
  const [sortMode, setSortMode] = useState<SortMode>(() => parseSort(searchParams.get('csort')))
  const [sortDir, setSortDir] = useState<SortDir>(() => parseDir(searchParams.get('cdir')))
  const [perPage, setPerPage] = useState<PerPage>(() => parsePer(searchParams.get('cper')))
  const [page, setPage] = useState(() => parsePage(searchParams.get('cpage')))
  const [hideBlack, setHideBlack] = useState(() => (searchParams.get('chideblack') ?? '1') === '1')
  const [showArch, setShowArch] = useState(() => (searchParams.get('cshowarch') ?? '0') === '1')

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)

  // Push state into URL with c-prefixed keys, preserving unrelated keys
  // (notably ?view=clients and any t* trips state on the same URL).
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const setOrDel = (k: string, v: string | null) => {
      if (v === null) params.delete(k)
      else params.set(k, v)
    }
    setOrDel('cq', search.trim() || null)
    setOrDel('ctab', statusTab !== 'all' ? statusTab : null)
    setOrDel('csort', sortMode !== 'activity' ? sortMode : null)
    setOrDel('cdir', sortDir !== 'desc' ? sortDir : null)
    setOrDel('cpage', page !== 1 ? String(page) : null)
    setOrDel('cper', perPage !== 25 ? String(perPage) : null)
    setOrDel('chideblack', hideBlack ? null : '0')
    setOrDel('cshowarch', showArch ? '1' : null)
    const qs = params.toString()
    router.replace(qs ? `/dashboard?${qs}` : '/dashboard', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusTab, sortMode, sortDir, page, perPage, hideBlack, showArch])

  // Reset to page 1 on filter/sort/search changes.
  useEffect(() => {
    setPage(1)
  }, [search, statusTab, sortMode, sortDir, perPage, hideBlack, showArch])

  function pickSort(next: SortMode) {
    if (next === sortMode) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortMode(next)
      setSortDir(next === 'name' ? 'asc' : 'desc')
    }
  }

  // Pre-compute status, last activity, and trip-counts so sorts/filters
  // don't re-derive per item. Keyed by client.id for stable lookups.
  const derived = useMemo(() => {
    if (!clients || !projects) return null
    const m = new Map<string, { status: ClientStatus; activity: Date | null; counts: { total: number; active: number } }>()
    for (const c of clients) {
      m.set(c.id, {
        status: deriveClientStatus(c, projects),
        activity: clientLastActivity(c, projects),
        counts: clientTripCounts(c, projects),
      })
    }
    return m
  }, [clients, projects])

  const blacklistTotal = useMemo(
    () => (clients ? clients.filter((c) => c.blacklisted).length : 0),
    [clients],
  )

  // Apply search → status filter → archived/blacklisted toggles → sort.
  const visible = useMemo(() => {
    if (!clients || !derived) return null
    let list = clients

    if (!showArch) list = list.filter((c) => !c.archived)
    if (hideBlack) list = list.filter((c) => !c.blacklisted)

    if (statusTab !== 'all') {
      list = list.filter((c) => derived.get(c.id)?.status === statusTab)
    }

    if (search.trim()) {
      list = list.filter((c) => clientLocalMatch(c, search))
    }

    const sorted = [...list]
    if (sortMode === 'name') {
      sorted.sort((a, b) => {
        const ka = (a.nickname || a.name || a.email || '').toLowerCase().trim()
        const kb = (b.nickname || b.name || b.email || '').toLowerCase().trim()
        if (!ka && !kb) return 0
        if (!ka) return 1
        if (!kb) return -1
        return ka.localeCompare(kb)
      })
    } else if (sortMode === 'activity') {
      sorted.sort((a, b) => {
        const da = derived.get(a.id)?.activity?.getTime() ?? 0
        const db = derived.get(b.id)?.activity?.getTime() ?? 0
        return db - da // newest first by default
      })
    } else if (sortMode === 'trips') {
      sorted.sort((a, b) => {
        const ta = derived.get(a.id)?.counts.total ?? 0
        const tb = derived.get(b.id)?.counts.total ?? 0
        return tb - ta
      })
    }

    if (sortDir === 'asc' && sortMode !== 'name') sorted.reverse()
    if (sortDir === 'desc' && sortMode === 'name') sorted.reverse()

    return sorted
  }, [clients, derived, search, statusTab, sortMode, sortDir, showArch, hideBlack])

  // Status-tab counts are computed against the unfiltered roster
  // (modulo the archive/blacklist toggles) so the user sees the
  // distribution with the same visibility rules as the rows.
  const statusCounts = useMemo(() => {
    if (!clients || !derived) return { all: 0, active: 0, prospect: 0, past: 0 }
    const base = clients.filter((c) => {
      if (!showArch && c.archived) return false
      if (hideBlack && c.blacklisted) return false
      return true
    })
    const out = { all: base.length, active: 0, prospect: 0, past: 0 }
    for (const c of base) {
      const s = derived.get(c.id)?.status ?? 'prospect'
      out[s]++
    }
    return out
  }, [clients, derived, showArch, hideBlack])

  const totalCount = visible?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage))
  const currentPage = Math.min(page, totalPages)
  const pagedList = useMemo(() => {
    if (!visible) return null
    const start = (currentPage - 1) * perPage
    return visible.slice(start, start + perPage)
  }, [visible, currentPage, perPage])

  async function patchClient(id: string, patch: Partial<Client>) {
    try {
      const token = await getToken()
      const res = await apiFetch(`/api/clients/${id}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        toast.error('Could not update client')
        return
      }
      await refresh()
    } catch {
      toast.error('Network error')
    }
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card mb-6">
      {/* Status tabs + visibility toggles + "+ New client" */}
      <div className="border-b border-border/40 px-2 sm:px-4 py-2 flex items-center gap-2 flex-wrap">
        <div role="tablist" aria-label="Filter clients by status" className="flex items-center gap-1">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.key === 'all'
                ? statusCounts.all
                : tab.key === 'active'
                  ? statusCounts.active
                  : tab.key === 'prospect'
                    ? statusCounts.prospect
                    : statusCounts.past
            const active = statusTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusTab(tab.key)}
                className={`relative py-2 px-3 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? 'text-foreground font-medium'
                    : 'text-foreground/55 hover:text-foreground/85'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${active ? 'text-foreground/55' : 'text-foreground/35'}`}>
                  {count}
                </span>
                {active && (
                  <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-foreground rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <label
            className="inline-flex items-center gap-1.5 text-xs text-foreground/70"
            title="Show blacklist toggle"
          >
            <input
              type="checkbox"
              checked={hideBlack}
              onChange={(e) => setHideBlack(e.target.checked)}
            />
            Hide blacklisted
            <span className="text-foreground/40">({blacklistTotal})</span>
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs text-foreground/70">
            <input
              type="checkbox"
              checked={showArch}
              onChange={(e) => setShowArch(e.target.checked)}
            />
            Show archived
          </label>
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium uppercase tracking-wider rounded-md border border-border text-foreground/80 hover:bg-secondary/60 hover:text-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New client</span>
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className="border-b border-border/40 px-4 py-2.5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            type="search"
            placeholder="Search by name, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 h-8 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Sort header — desktop. Mirrors trips-tab visually. */}
      {totalCount > 0 && (
        <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-border/40 text-[10px] uppercase tracking-wider font-semibold text-foreground/40">
          <div className="w-9 flex-shrink-0" />
          <button
            type="button"
            onClick={() => pickSort('name')}
            className={`flex-1 text-left hover:text-foreground/70 ${sortMode === 'name' ? 'text-foreground/80' : ''}`}
          >
            Name {sortMode === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
          </button>
          <button
            type="button"
            onClick={() => pickSort('activity')}
            className={`w-20 text-right hover:text-foreground/70 ${sortMode === 'activity' ? 'text-foreground/80' : ''}`}
          >
            {sortMode === 'activity' && (sortDir === 'asc' ? '↑ ' : '↓ ')}Activity
          </button>
          <button
            type="button"
            onClick={() => pickSort('trips')}
            className={`w-32 text-right hover:text-foreground/70 ${sortMode === 'trips' ? 'text-foreground/80' : ''}`}
          >
            {sortMode === 'trips' && (sortDir === 'asc' ? '↑ ' : '↓ ')}Trips
          </button>
          <div className="w-16 flex-shrink-0" />
        </div>
      )}

      {/* Sort chips — mobile */}
      {totalCount > 0 && (
        <div className="md:hidden flex items-center gap-2 flex-wrap px-4 py-2 border-b border-border/40">
          <span className="text-[10px] uppercase tracking-wider text-foreground/40 font-semibold">Sort</span>
          {(['name', 'activity', 'trips'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => pickSort(m)}
              className={`text-[10px] uppercase tracking-wider font-semibold ${sortMode === m ? 'text-foreground/80' : 'text-foreground/40'}`}
            >
              {m}
              {sortMode === m && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          ))}
        </div>
      )}

      {clients === null || projects === null ? (
        <div className="px-4 py-8 text-sm text-foreground/50 text-center">Loading…</div>
      ) : totalCount === 0 ? (
        <div className="px-4 py-8 text-sm text-foreground/50 text-center">
          {search.trim() ? `No matches for "${search}".` : 'No clients to show.'}
        </div>
      ) : (
        <div className="py-1">
          {pagedList?.map((c) => (
            <ClientRow
              key={c.id}
              client={c}
              trips={projects ?? []}
              expanded={expandedId === c.id}
              onToggle={() => setExpandedId((v) => (v === c.id ? null : c.id))}
              onEdit={() => setEditClient(c)}
              onArchiveToggle={() => patchClient(c.id, { archived: !c.archived })}
              onBlacklistToggle={() => patchClient(c.id, { blacklisted: !c.blacklisted })}
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

      <NewClientModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSaved={async () => { await refresh() }}
      />
      <EditClientModal
        open={editClient !== null}
        client={editClient}
        tripCount={editClient ? (projects ?? []).filter((p) => p.client?.id === editClient.id).length : 0}
        onClose={() => setEditClient(null)}
        onSaved={async () => { await refresh() }}
        onDeleted={async () => { await refresh() }}
      />
    </div>
  )
}


