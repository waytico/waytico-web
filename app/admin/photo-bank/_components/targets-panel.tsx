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
  weight: number
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
          No targets yet. Run{' '}
          <code className="rounded bg-zinc-100 px-1">
            npx tsx src/scripts/generate-photo-targets.ts
          </code>{' '}
          on the backend (Render Shell) to populate.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left">
              <tr>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Weight</th>
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
                  <td className="px-3 py-2">{row.weight}</td>
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
