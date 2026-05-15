'use client'

/**
 * Photo Bank v2 — admin Targets panel.
 *
 * Listing of /api/admin/photo-bank/targets. Each row shows country /
 * name / kind / priority / scores / photos / goal / last attempt. Goal
 * is inline-editable (click the number). Exhausted targets get a red
 * row tint — the legend sits above the table. The header carries a
 * country picker, an in-country target picker, a name-contains box,
 * kind filter, CSV export, and the single Top-up-targets entry point
 * (all countries via the model, or one country picked from a dropdown).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { AuthedFetch } from '@/hooks/use-admin-photo-review'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

interface TargetRow {
  id: string
  country: string
  name: string
  kind: 'city' | 'landmark'
  country_score: number
  location_score: number
  priority: number
  target_count: number
  collected_count: number
  exhausted: boolean
  search_query: string | null
  last_attempt_at: string | null
}

interface CountryEntry {
  country: string
  count: number
}

interface Props {
  authedFetch: AuthedFetch
}

type SortKey = 'priority' | 'last_attempt'

export function TargetsPanel({ authedFetch }: Props) {
  const [rows, setRows] = useState<TargetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [perPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [country, setCountry] = useState<string>('')
  const [targetName, setTargetName] = useState<string>('') // exact name (in-country picker)
  const [kind, setKind] = useState<'all' | 'city' | 'landmark'>('all')
  const [nameLike, setNameLike] = useState('')
  const [sort, setSort] = useState<SortKey>('priority')
  const [refreshTick, setRefreshTick] = useState(0)
  const [countries, setCountries] = useState<CountryEntry[]>([])
  const [targetsForCountry, setTargetsForCountry] = useState<string[]>([])

  // Bulk-bar local controls.
  const [bulkValue, setBulkValue] = useState('')
  const [bulkMode, setBulkMode] = useState<'set' | 'add'>('set')
  const [bulkBusy, setBulkBusy] = useState(false)

  // Inline-edit state for the Goal column.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')

  const filterActive =
    country !== '' ||
    kind !== 'all' ||
    nameLike.trim() !== '' ||
    targetName !== ''

  // Shared query string for the listing + CSV export (no pagination here).
  const queryString = useMemo(() => {
    const sp = new URLSearchParams()
    if (country) sp.set('country', country)
    if (targetName) sp.set('name', targetName)
    if (kind !== 'all') sp.set('kind', kind)
    if (nameLike.trim()) sp.set('name_like', nameLike.trim())
    if (sort !== 'priority') sp.set('sort', sort)
    return sp.toString()
  }, [country, targetName, kind, nameLike, sort])

  // Country list — refreshed alongside the table so a freshly generated
  // country appears in the picker.
  useEffect(() => {
    let cancelled = false
    authedFetch(`${API_URL}/api/admin/photo-bank/targets/countries`)
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { countries: CountryEntry[] }
        if (!cancelled) setCountries(data.countries || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authedFetch, refreshTick])

  // Per-country target list — populates the second picker.
  useEffect(() => {
    if (!country) {
      setTargetsForCountry([])
      setTargetName('')
      return
    }
    let cancelled = false
    const sp = new URLSearchParams()
    sp.set('country', country)
    sp.set('perPage', '200')
    // Use a sort that's name-friendly server-side: priority DESC is the
    // default; for the picker we sort A→Z client-side after fetching.
    authedFetch(`${API_URL}/api/admin/photo-bank/targets?${sp.toString()}`)
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { targets: TargetRow[] }
        if (cancelled) return
        const names = (data.targets || [])
          .map((t) => t.name)
          .sort((a, b) => a.localeCompare(b))
        setTargetsForCountry(names)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authedFetch, country, refreshTick])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const sp = new URLSearchParams(queryString)
    sp.set('page', String(page))
    sp.set('perPage', String(perPage))
    authedFetch(`${API_URL}/api/admin/photo-bank/targets?${sp.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as {
          targets: TargetRow[]
          totalCount: number
          totalPages: number
        }
      })
      .then((data) => {
        if (cancelled) return
        setRows(data.targets)
        setTotalCount(data.totalCount)
        setTotalPages(data.totalPages)
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'load failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authedFetch, page, perPage, queryString, refreshTick])

  const patch = useCallback(
    async (id: string, body: Partial<TargetRow>) => {
      try {
        const res = await authedFetch(
          `${API_URL}/api/admin/photo-bank/targets/${id}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setRefreshTick((t) => t + 1)
      } catch (err) {
        setError((err as Error)?.message || 'update failed')
      }
    },
    [authedFetch],
  )

  // Inline Goal edit — commit on Enter / blur, cancel on Esc.
  const startEditGoal = useCallback((row: TargetRow) => {
    setEditingId(row.id)
    setEditingValue(String(row.target_count))
  }, [])
  const cancelEditGoal = useCallback(() => {
    setEditingId(null)
    setEditingValue('')
  }, [])
  const commitEditGoal = useCallback(
    (row: TargetRow) => {
      const n = parseInt(editingValue, 10)
      setEditingId(null)
      if (!Number.isFinite(n) || n < 1) return
      if (n === row.target_count) return // no-op
      patch(row.id, { target_count: n })
    },
    [editingValue, patch],
  )

  // Bulk apply: one change to every row matching the current filter.
  const bulkApply = useCallback(
    async (patchBody: Record<string, unknown>) => {
      setBulkBusy(true)
      setError(null)
      try {
        // Bulk uses name_like (substring) not exact name — the exact
        // picker is for inspecting one row; bulk operates on the wider
        // free-text + country / kind filter set.
        const filter: Record<string, string> = {}
        if (country) filter.country = country
        if (kind !== 'all') filter.kind = kind
        if (nameLike.trim()) filter.name_like = nameLike.trim()
        const res = await authedFetch(
          `${API_URL}/api/admin/photo-bank/targets/bulk`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filter, patch: patchBody }),
          },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setRefreshTick((t) => t + 1)
      } catch (err) {
        setError((err as Error)?.message || 'bulk update failed')
      } finally {
        setBulkBusy(false)
      }
    },
    [authedFetch, country, kind, nameLike],
  )

  const applyBulkGoal = useCallback(() => {
    const n = parseInt(bulkValue, 10)
    if (!Number.isFinite(n)) return
    bulkApply(
      bulkMode === 'set' ? { target_count_set: n } : { target_count_delta: n },
    )
  }, [bulkApply, bulkValue, bulkMode])

  const toggleSort = useCallback(() => {
    setSort((s) => (s === 'last_attempt' ? 'priority' : 'last_attempt'))
    setPage(1)
  }, [])

  // The exact-name picker only makes sense for the bulk-bar set when a
  // country is chosen — bulk hits a country/kind/name_like filter; the
  // single exact pick is shown but not bulkable. So bulk-bar is hidden
  // when only a target-name is selected (would touch exactly one row).
  const bulkBarVisible =
    country !== '' || kind !== 'all' || nameLike.trim() !== ''

  return (
    <div>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h1 className="text-lg font-medium">Photo bank — targets</h1>
        <div className="flex items-center gap-2 text-sm">
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value)
              setTargetName('')
              setPage(1)
            }}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country} ({c.count})
              </option>
            ))}
          </select>
          <select
            value={targetName}
            onChange={(e) => {
              setTargetName(e.target.value)
              setPage(1)
            }}
            disabled={!country}
            className="rounded border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-50 disabled:text-zinc-400"
            title={country ? `Targets in ${country}` : 'Pick a country first'}
          >
            {!country ? (
              <option value="">Pick a country first</option>
            ) : (
              <>
                <option value="">All targets in {country}</option>
                {targetsForCountry.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </>
            )}
          </select>
          <input
            placeholder="Name contains…"
            value={nameLike}
            onChange={(e) => {
              setNameLike(e.target.value)
              setPage(1)
            }}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as typeof kind)
              setPage(1)
            }}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="all">All kinds</option>
            <option value="city">Cities</option>
            <option value="landmark">Landmarks</option>
          </select>
          <GeneratorControls
            authedFetch={authedFetch}
            countries={countries}
            onAfter={() => setRefreshTick((t) => t + 1)}
          />
        </div>
      </header>

      <div className="mb-2 flex items-center justify-between text-sm text-zinc-500">
        <span>
          {totalCount} targets · page {page} of {Math.max(1, totalPages)}
        </span>
        <span className="text-xs">
          <span className="mr-1 inline-block h-3 w-3 rounded-sm border border-rose-300 bg-rose-50 align-middle" />
          red rows = exhausted (no more photos available from Wikimedia)
        </span>
      </div>

      {bulkBarVisible && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <span className="font-medium">
            Bulk · {totalCount} filtered row{totalCount === 1 ? '' : 's'}
          </span>
          <select
            value={bulkMode}
            onChange={(e) => setBulkMode(e.target.value as 'set' | 'add')}
            className="rounded border border-sky-300 bg-white px-2 py-1 text-sm"
          >
            <option value="set">Set goal</option>
            <option value="add">Add to goal</option>
          </select>
          <input
            type="number"
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
            placeholder={bulkMode === 'set' ? '1–1000' : '±'}
            className="w-24 rounded border border-sky-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={applyBulkGoal}
            disabled={bulkBusy || bulkValue.trim() === ''}
            className="rounded border border-sky-400 bg-white px-3 py-1 text-sm hover:bg-sky-100 disabled:opacity-50"
          >
            Apply to {totalCount}
          </button>
          {bulkBusy && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
      )}

      {error && (
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-500">
          No targets match. Use <strong>Top up targets</strong> above to ask
          the model for more places — runs in the background; refresh to watch
          rows appear.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Kind</th>
                <th
                  className="px-3 py-2"
                  title="country_score × location_score"
                >
                  Priority
                </th>
                <th
                  className="px-3 py-2"
                  title="Country score · Location score (both 0–100)"
                >
                  Scores
                </th>
                <th className="px-3 py-2" title="Photos collected so far">
                  Photos
                </th>
                <th className="px-3 py-2" title="Target photo count — click to edit">
                  Goal
                </th>
                <th className="px-3 py-2">
                  <button
                    type="button"
                    onClick={toggleSort}
                    className="font-medium hover:underline"
                    title="Sort by last attempt (stalest first)"
                  >
                    Last attempt
                    {sort === 'last_attempt' ? ' ▲' : ''}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={
                    'border-t border-zinc-100 ' +
                    (row.exhausted ? 'bg-rose-50' : '')
                  }
                  title={row.exhausted ? 'Exhausted — Wikimedia has no more photos for this target' : undefined}
                >
                  <td className="px-3 py-2">{row.country}</td>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{row.kind}</td>
                  <td className="px-3 py-2 font-mono">{row.priority}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {row.country_score} · {row.location_score}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {row.collected_count}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === row.id ? (
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={editingValue}
                        autoFocus
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => commitEditGoal(row)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEditGoal(row)
                          else if (e.key === 'Escape') cancelEditGoal()
                        }}
                        className="w-20 rounded border border-zinc-300 px-1 py-0.5 text-sm"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditGoal(row)}
                        className="rounded px-1 py-0.5 hover:bg-zinc-100"
                        title="Click to edit"
                      >
                        {row.target_count}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {row.last_attempt_at
                      ? new Date(row.last_attempt_at).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-zinc-500">
          Page {page} of {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages}
          className="rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

interface GeneratorState {
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'failed'
  startedAt: string | null
  finishedAt: string | null
  totalCountries: number
  processedCountries: number
  currentCountry: string | null
  locationsAdded: number
  errors: Array<{ country: string; message: string }>
  fatalError: string | null
}

/**
 * Single "Top up targets" entry point — covers both the full sweep and
 * the single-country top-up via one dropdown:
 *   - "All countries"       → POST /generate          (pass 1 + pass 2)
 *   - one country           → POST /generate-country  (pass 2 only)
 *
 * The `extra` number is `target_count` for new places either way. Both
 * routes drive the same singleton backend job — one status pill covers
 * either run.
 */
function GeneratorControls({
  authedFetch,
  countries,
  onAfter,
}: {
  authedFetch: AuthedFetch
  countries: CountryEntry[]
  onAfter: () => void
}) {
  const [state, setState] = useState<GeneratorState | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<string>('') // '' = All, otherwise country name
  const [extra, setExtra] = useState('5')

  useEffect(() => {
    let cancelled = false
    authedFetch(`${API_URL}/api/admin/photo-bank/targets/generate-status`)
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as { state: GeneratorState }
        if (!cancelled) setState(data.state)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authedFetch])

  useEffect(() => {
    if (state?.status !== 'running') return
    const t = setInterval(() => {
      authedFetch(`${API_URL}/api/admin/photo-bank/targets/generate-status`)
        .then(async (res) => {
          if (!res.ok) return
          const data = (await res.json()) as { state: GeneratorState }
          setState((prev) => {
            if (prev?.status === 'running' && data.state.status !== 'running') {
              onAfter()
            }
            return data.state
          })
        })
        .catch(() => {})
    }, 4_000)
    return () => clearInterval(t)
  }, [state?.status, authedFetch, onAfter])

  const start = useCallback(async () => {
    if (busy) return
    // Safety: a full sweep across all countries is expensive (1 + N LLM
    // calls, minutes of work). Confirm before firing. Single-country
    // top-up is cheap (one LLM call) — no confirm needed.
    if (
      scope === '' &&
      !confirm(
        'Run a full top-up across all countries? This makes ~1 + N LLM calls and takes a few minutes.',
      )
    )
      return
    setBusy(true)
    setErr(null)
    const n = parseInt(extra, 10)
    try {
      let res: Response
      if (scope === '') {
        const body: { target_count?: number } = {}
        if (Number.isFinite(n) && n >= 1) body.target_count = n
        res = await authedFetch(
          `${API_URL}/api/admin/photo-bank/targets/generate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        )
      } else {
        const body: { country: string; extra_count?: number } = { country: scope }
        if (Number.isFinite(n) && n >= 1) body.extra_count = n
        res = await authedFetch(
          `${API_URL}/api/admin/photo-bank/targets/generate-country`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
        )
      }
      const data = (await res.json()) as {
        state?: GeneratorState
        error?: string
      }
      if (!res.ok) {
        setErr(data?.error || `HTTP ${res.status}`)
        if (data?.state) setState(data.state)
      } else if (data?.state) {
        setState(data.state)
        setOpen(false)
      }
    } catch (e) {
      setErr((e as Error)?.message || 'request failed')
    } finally {
      setBusy(false)
    }
  }, [authedFetch, busy, extra, scope])

  const cancel = useCallback(async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await authedFetch(
        `${API_URL}/api/admin/photo-bank/targets/generate-cancel`,
        { method: 'POST' },
      )
      const data = (await res.json()) as { state?: GeneratorState }
      if (data?.state) setState(data.state)
    } catch {
      // soft fail — the polling loop will pick up the new status.
    } finally {
      setBusy(false)
    }
  }, [authedFetch, busy])

  // Compact running pill — keeps the single-row layout intact during a
  // long generation. Full progress lives in the tooltip.
  if (state?.status === 'running') {
    const total = state.totalCountries || 1
    const title =
      `Top up running · ${state.processedCountries}/${total}` +
      (state.currentCountry ? ` · ${state.currentCountry}` : '') +
      ` · +${state.locationsAdded} rows`
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-sm text-amber-900"
        title={title}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {state.processedCountries}/{total}
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="ml-1 rounded border border-amber-300 px-1 text-xs hover:bg-amber-100 disabled:opacity-50"
          title="Cancel run"
        >
          ×
        </button>
      </span>
    )
  }

  // Last-run summary lives in the button tooltip — no visible text
  // eating space in the filter row.
  const lastRunTitle =
    state && state.status !== 'idle'
      ? `Last run: ${state.status} · +${state.locationsAdded}` +
        (state.errors.length > 0 ? ` · ${state.errors.length} errors` : '') +
        (state.fatalError ? ` · ${state.fatalError}` : '')
      : 'Top up targets — ask the model for more places (all countries or one)'

  return (
    <span className="relative inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o)
          setErr(null)
        }}
        title={lastRunTitle}
        className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50"
      >
        Top up targets
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 flex items-center gap-2 whitespace-nowrap rounded border border-zinc-300 bg-white px-2 py-2 shadow-md">
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c.country} value={c.country}>
                {c.country} ({c.count})
              </option>
            ))}
          </select>
          <label className="text-xs text-zinc-600">extra</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="rounded border border-emerald-400 bg-emerald-50 px-3 py-1 text-sm text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
          >
            Top up
          </button>
          {err && <span className="ml-1 text-xs text-rose-700">{err}</span>}
        </div>
      )}
    </span>
  )
}
