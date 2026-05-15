'use client'

/**
 * Photo Bank v2 — admin Targets panel.
 *
 * Lists rows from /api/admin/photo-bank/targets with a country dropdown,
 * a name filter, kind / state filters and a sortable Last-attempt column.
 * Per-row Reset / Set-target, a bulk "apply to the whole filtered set"
 * bar, and CSV export. The header carries the generator controls — full
 * two-pass sweep and single-country top-up.
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
  const [kind, setKind] = useState<'all' | 'city' | 'landmark'>('all')
  const [exhausted, setExhausted] = useState<'all' | 'true' | 'false'>('all')
  const [nameLike, setNameLike] = useState('')
  const [sort, setSort] = useState<SortKey>('priority')
  const [refreshTick, setRefreshTick] = useState(0)
  const [countries, setCountries] = useState<CountryEntry[]>([])

  // Bulk-bar local controls.
  const [bulkValue, setBulkValue] = useState('')
  const [bulkMode, setBulkMode] = useState<'set' | 'add'>('set')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [csvBusy, setCsvBusy] = useState(false)

  const filterActive =
    country !== '' ||
    kind !== 'all' ||
    exhausted !== 'all' ||
    nameLike.trim() !== ''

  // Shared query string for the listing + CSV export (no pagination here).
  const queryString = useMemo(() => {
    const sp = new URLSearchParams()
    if (country) sp.set('country', country)
    if (kind !== 'all') sp.set('kind', kind)
    if (exhausted !== 'all') sp.set('exhausted', exhausted)
    if (nameLike.trim()) sp.set('name_like', nameLike.trim())
    if (sort !== 'priority') sp.set('sort', sort)
    return sp.toString()
  }, [country, kind, exhausted, nameLike, sort])

  // Country list for the dropdowns — refreshed alongside the table so a
  // freshly generated country appears in the picker.
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

  // Bulk apply: one change to every row matching the current filter.
  const bulkApply = useCallback(
    async (patchBody: Record<string, unknown>) => {
      setBulkBusy(true)
      setError(null)
      try {
        const filter: Record<string, string> = {}
        if (country) filter.country = country
        if (kind !== 'all') filter.kind = kind
        if (exhausted !== 'all') filter.state = exhausted
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
    [authedFetch, country, kind, exhausted, nameLike],
  )

  const applyBulkTargetCount = useCallback(() => {
    const n = parseInt(bulkValue, 10)
    if (!Number.isFinite(n)) return
    bulkApply(
      bulkMode === 'set' ? { target_count_set: n } : { target_count_delta: n },
    )
  }, [bulkApply, bulkValue, bulkMode])

  // CSV export of the whole filtered set (pagination ignored server-side).
  const exportCsv = useCallback(async () => {
    setCsvBusy(true)
    setError(null)
    try {
      const res = await authedFetch(
        `${API_URL}/api/admin/photo-bank/targets?${queryString}`,
        { headers: { Accept: 'text/csv' } },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'photo-bank-targets.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError((err as Error)?.message || 'export failed')
    } finally {
      setCsvBusy(false)
    }
  }, [authedFetch, queryString])

  const toggleSort = useCallback(() => {
    setSort((s) => (s === 'last_attempt' ? 'priority' : 'last_attempt'))
    setPage(1)
  }, [])

  return (
    <div>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-medium">Photo bank — targets</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <GeneratorControls
            authedFetch={authedFetch}
            countries={countries}
            onAfter={() => setRefreshTick((t) => t + 1)}
          />
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value)
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
          <select
            value={exhausted}
            onChange={(e) => {
              setExhausted(e.target.value as typeof exhausted)
              setPage(1)
            }}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="all">All states</option>
            <option value="false">Active</option>
            <option value="true">Exhausted</option>
          </select>
          <button
            type="button"
            onClick={exportCsv}
            disabled={csvBusy}
            className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            {csvBusy ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="mb-2 text-sm text-zinc-500">
        {totalCount} targets · page {page} of {Math.max(1, totalPages)}
      </div>

      {filterActive && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <span className="font-medium">
            Bulk · {totalCount} filtered row{totalCount === 1 ? '' : 's'}
          </span>
          <select
            value={bulkMode}
            onChange={(e) => setBulkMode(e.target.value as 'set' | 'add')}
            className="rounded border border-sky-300 bg-white px-2 py-1 text-sm"
          >
            <option value="set">Set target_count</option>
            <option value="add">Add to target_count</option>
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
            onClick={applyBulkTargetCount}
            disabled={bulkBusy || bulkValue.trim() === ''}
            className="rounded border border-sky-400 bg-white px-3 py-1 text-sm hover:bg-sky-100 disabled:opacity-50"
          >
            Apply to {totalCount}
          </button>
          <span className="text-sky-400">·</span>
          <button
            type="button"
            onClick={() => bulkApply({ exhausted: true })}
            disabled={bulkBusy}
            className="rounded border border-sky-400 bg-white px-3 py-1 text-sm hover:bg-sky-100 disabled:opacity-50"
          >
            Mark exhausted
          </button>
          <button
            type="button"
            onClick={() => bulkApply({ exhausted: false })}
            disabled={bulkBusy}
            className="rounded border border-sky-400 bg-white px-3 py-1 text-sm hover:bg-sky-100 disabled:opacity-50"
          >
            Mark active
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
          No targets match. Use <strong>Generate all</strong> for a full
          sweep, or <strong>Top up country</strong> to add more places to one
          country — both run in the background; refresh to watch rows appear.
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
                <th className="px-3 py-2">Progress</th>
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
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{row.country}</td>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">{row.kind}</td>
                  <td className="px-3 py-2 font-mono">{row.priority}</td>
                  <td className="px-3 py-2 text-xs text-zinc-500">
                    {row.country_score} · {row.location_score}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {row.collected_count} / {row.target_count}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {row.last_attempt_at
                      ? new Date(row.last_attempt_at).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setExhausted(row.exhausted ? 'true' : 'false')
                        setPage(1)
                      }}
                      title="Filter by this state"
                    >
                      {row.exhausted ? (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900 hover:bg-amber-200">
                          exhausted
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 hover:bg-emerald-200">
                          active
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const v = prompt(
                            'New target_count',
                            String(row.target_count),
                          )
                          if (v == null) return
                          const n = parseInt(v, 10)
                          if (!Number.isFinite(n) || n < 1) return
                          patch(row.id, { target_count: n })
                        }}
                        className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50"
                      >
                        Set target
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            !confirm(
                              `Reset "${row.name}"? collected_count → 0, exhausted → off. The collector will re-attempt this target.`,
                            )
                          )
                            return
                          patch(row.id, {
                            collected_count: 0,
                            exhausted: false,
                          })
                        }}
                        className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50"
                      >
                        Reset target
                      </button>
                    </div>
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
 * Generator controls — full two-pass sweep + single-country top-up.
 *
 * Both actions drive the same singleton backend job, so one status
 * poller covers them. While a job runs, the controls collapse to a
 * status pill with a Cancel button. "Generate all" opens an inline
 * panel for the per-run target_count; "Top up country" opens one for a
 * country + how many places to add.
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
  const [genOpen, setGenOpen] = useState(false)
  const [topOpen, setTopOpen] = useState(false)
  const [targetCount, setTargetCount] = useState('5')
  const [topCountry, setTopCountry] = useState('')
  const [extraCount, setExtraCount] = useState('5')

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

  const startFull = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setErr(null)
    try {
      const n = parseInt(targetCount, 10)
      const body: { target_count?: number } = {}
      if (Number.isFinite(n) && n >= 1) body.target_count = n
      const res = await authedFetch(
        `${API_URL}/api/admin/photo-bank/targets/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      const data = (await res.json()) as {
        state?: GeneratorState
        error?: string
      }
      if (!res.ok) {
        setErr(data?.error || `HTTP ${res.status}`)
        if (data?.state) setState(data.state)
      } else if (data?.state) {
        setState(data.state)
        setGenOpen(false)
      }
    } catch (e) {
      setErr((e as Error)?.message || 'request failed')
    } finally {
      setBusy(false)
    }
  }, [authedFetch, busy, targetCount])

  const startTopUp = useCallback(async () => {
    if (busy) return
    const c = topCountry.trim()
    if (!c) {
      setErr('Pick a country to top up')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const n = parseInt(extraCount, 10)
      const body: { country: string; extra_count?: number } = { country: c }
      if (Number.isFinite(n) && n >= 1) body.extra_count = n
      const res = await authedFetch(
        `${API_URL}/api/admin/photo-bank/targets/generate-country`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      const data = (await res.json()) as {
        state?: GeneratorState
        error?: string
      }
      if (!res.ok) {
        setErr(data?.error || `HTTP ${res.status}`)
        if (data?.state) setState(data.state)
      } else if (data?.state) {
        setState(data.state)
        setTopOpen(false)
      }
    } catch (e) {
      setErr((e as Error)?.message || 'request failed')
    } finally {
      setBusy(false)
    }
  }, [authedFetch, busy, topCountry, extraCount])

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
      // soft fail — the polling loop will still pick up the new status.
    } finally {
      setBusy(false)
    }
  }, [authedFetch, busy])

  if (state?.status === 'running') {
    const total = state.totalCountries || 1
    return (
      <span className="inline-flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-1 text-sm text-amber-900">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Generating · {state.processedCountries}/{total}
        {state.currentCountry ? ` · ${state.currentCountry}` : ''} · +
        {state.locationsAdded} rows
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="ml-1 rounded border border-amber-300 px-2 py-0.5 text-xs hover:bg-amber-100 disabled:opacity-50"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setGenOpen((o) => !o)
          setTopOpen(false)
          setErr(null)
        }}
        className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50"
      >
        Generate all
      </button>
      <button
        type="button"
        onClick={() => {
          setTopOpen((o) => !o)
          setGenOpen(false)
          setErr(null)
        }}
        className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50"
      >
        Top up country
      </button>

      {genOpen && (
        <div className="flex items-center gap-2 rounded border border-zinc-300 bg-zinc-50 px-2 py-1">
          <label className="text-xs text-zinc-600">target_count</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={targetCount}
            onChange={(e) => setTargetCount(e.target.value)}
            className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={startFull}
            disabled={busy}
            className="rounded border border-emerald-400 bg-emerald-50 px-3 py-1 text-sm text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
          >
            Start full sweep
          </button>
        </div>
      )}

      {topOpen && (
        <div className="flex items-center gap-2 rounded border border-zinc-300 bg-zinc-50 px-2 py-1">
          <select
            value={topCountry}
            onChange={(e) => setTopCountry(e.target.value)}
            className="rounded border border-zinc-300 px-2 py-1 text-sm"
          >
            <option value="">Pick country…</option>
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
            value={extraCount}
            onChange={(e) => setExtraCount(e.target.value)}
            className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={startTopUp}
            disabled={busy}
            className="rounded border border-emerald-400 bg-emerald-50 px-3 py-1 text-sm text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
          >
            Top up
          </button>
        </div>
      )}

      {state &&
        (state.status === 'completed' ||
          state.status === 'cancelled' ||
          state.status === 'failed') && (
          <span className="text-xs text-zinc-500">
            Last run: {state.status} · +{state.locationsAdded}
            {state.errors.length > 0 ? ` · ${state.errors.length} errors` : ''}
            {state.fatalError ? ` · ${state.fatalError}` : ''}
          </span>
        )}
      {err && <span className="text-xs text-rose-700">{err}</span>}
    </div>
  )
}
