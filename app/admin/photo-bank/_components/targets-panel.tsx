'use client'

/**
 * Photo Bank v2 — admin Targets panel.
 *
 * Lists rows from /api/admin/photo-bank/targets with pagination and a
 * "Reset exhausted" button per row. Inline edit on target_count and
 * search_query via the PATCH endpoint.
 */

import { useCallback, useEffect, useState } from 'react'
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

interface Props {
  authedFetch: AuthedFetch
}

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
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const sp = new URLSearchParams()
    sp.set('page', String(page))
    sp.set('perPage', String(perPage))
    if (country) sp.set('country', country)
    if (kind !== 'all') sp.set('kind', kind)
    if (exhausted !== 'all') sp.set('exhausted', exhausted)
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
  }, [authedFetch, page, perPage, country, kind, exhausted, refreshTick])

  const patch = useCallback(
    async (id: string, body: Partial<TargetRow>) => {
      try {
        const res = await authedFetch(`${API_URL}/api/admin/photo-bank/targets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setRefreshTick((t) => t + 1)
      } catch (err) {
        setError((err as Error)?.message || 'update failed')
      }
    },
    [authedFetch],
  )

  return (
    <div>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-medium">Photo bank — targets</h1>
        <div className="flex items-center gap-2 text-sm">
          <GenerateButton authedFetch={authedFetch} onAfter={() => setRefreshTick((t) => t + 1)} />
          <input
            placeholder="Country filter"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value)
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
          No targets yet. Press <strong>Generate targets</strong> above to ask the
          model for a seed list — runs in the background; refresh this panel to
          watch new rows appear.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2" title="country_score × location_score">Priority</th>
                <th className="px-3 py-2" title="Country score · Location score (both 0–100)">Scores</th>
                <th className="px-3 py-2">Progress</th>
                <th className="px-3 py-2">Last attempt</th>
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
                    {row.exhausted ? (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                        exhausted
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">
                        active
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      {row.exhausted && (
                        <button
                          type="button"
                          onClick={() => patch(row.id, { exhausted: false })}
                          className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50"
                        >
                          Reset
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const v = prompt('New target_count', String(row.target_count))
                          if (v == null) return
                          const n = parseInt(v, 10)
                          if (!Number.isFinite(n) || n < 1) return
                          patch(row.id, { target_count: n })
                        }}
                        className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-50"
                      >
                        Set target
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
 * Inline "Generate targets" button + lightweight status pill.
 *
 * Kicks off the singleton target-generator job on the backend and
 * polls its status every 4 seconds while it's running. The button
 * itself collapses to a status pill while a job is in flight; clicking
 * the pill cancels.
 *
 * No country picker — the backend uses its built-in default list (one
 * sweep ≈ a few minutes). Operators can still adjust target_count and
 * search_query per row after the rows arrive.
 */
function GenerateButton({
  authedFetch,
  onAfter,
}: {
  authedFetch: AuthedFetch
  onAfter: () => void
}) {
  const [state, setState] = useState<GeneratorState | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Read current state once on mount in case a job is already running
  // (e.g. someone left the page open). After that, only poll while the
  // local view shows running.
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
            if (
              prev?.status === 'running' &&
              data.state.status !== 'running'
            ) {
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
    setBusy(true)
    setErr(null)
    try {
      const res = await authedFetch(
        `${API_URL}/api/admin/photo-bank/targets/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      )
      const data = (await res.json()) as { state?: GeneratorState; error?: string }
      if (!res.ok) {
        setErr(data?.error || `HTTP ${res.status}`)
        if (data?.state) setState(data.state)
      } else if (data?.state) {
        setState(data.state)
      }
    } catch (e) {
      setErr((e as Error)?.message || 'request failed')
    } finally {
      setBusy(false)
    }
  }, [authedFetch, busy])

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
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50 disabled:opacity-50"
      >
        Generate targets
      </button>
      {state &&
        (state.status === 'completed' ||
          state.status === 'cancelled' ||
          state.status === 'failed') && (
          <span className="text-xs text-zinc-500">
            Last run: {state.status} · +{state.locationsAdded}
            {state.errors.length > 0 ? ` · ${state.errors.length} errors` : ''}
          </span>
        )}
      {err && <span className="text-xs text-rose-700">{err}</span>}
    </div>
  )
}
