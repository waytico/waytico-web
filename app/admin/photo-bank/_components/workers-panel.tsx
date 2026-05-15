'use client'

/**
 * Photo Bank v2 — admin Workers panel.
 *
 * Reads /api/admin/photo-bank/workers, renders one tile per worker
 * with status + last_tick_at + counters + pause/resume button. Also
 * exposes the "Reclassify all" action which flips ai_processed=FALSE
 * (and cleanup_processed=FALSE) across all eligible rows — the
 * ai_cleanup / ai_classify workers pick them up on their next tick.
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { AuthedFetch } from '@/hooks/use-admin-photo-review'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

interface WorkerRow {
  kind: 'collector' | 'ai_cleanup' | 'ai_classify'
  status: 'running' | 'paused' | 'idle'
  last_tick_at: string | null
  ticks_total: number
  photos_collected: number
  photos_ai_processed: number
  photos_ai_failed: number
}

const WORKER_LABEL: Record<WorkerRow['kind'], string> = {
  collector: 'Collector',
  ai_cleanup: 'Cleanup (Pass-2)',
  ai_classify: 'Classify (Pass-1)',
}

// Fixed left-to-right card order: collector → cleanup (Pass-2) →
// classify (Pass-1). The backend lists rows ORDER BY kind (alphabetical),
// so we re-sort on the client.
const WORKER_ORDER: WorkerRow['kind'][] = [
  'collector',
  'ai_cleanup',
  'ai_classify',
]

interface Props {
  authedFetch: AuthedFetch
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'just now'
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  return `${Math.floor(ms / 3_600_000)}h ago`
}

export function WorkersPanel({ authedFetch }: Props) {
  const [workers, setWorkers] = useState<WorkerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    authedFetch(`${API_URL}/api/admin/photo-bank/workers`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as { workers: WorkerRow[] }
      })
      .then((data) => {
        if (cancelled) return
        setWorkers(
          [...data.workers].sort(
            (a, b) =>
              WORKER_ORDER.indexOf(a.kind) - WORKER_ORDER.indexOf(b.kind),
          ),
        )
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
  }, [authedFetch, refreshTick])

  // No auto-refresh: the panel loads once and after each pause/resume
  // toggle. Use the Refresh button for an on-demand reload. The workers
  // were polling every 10s before, which made the screen flicker even
  // while both workers sat idle — pointless churn against a static
  // backend.

  const toggle = useCallback(
    async (kind: WorkerRow['kind'], target: 'pause' | 'resume') => {
      try {
        setBusy(`${kind}:${target}`)
        const res = await authedFetch(
          `${API_URL}/api/admin/photo-bank/workers/${kind}/${target}`,
          { method: 'POST' },
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setRefreshTick((x) => x + 1)
      } catch (err) {
        setError((err as Error)?.message || 'toggle failed')
      } finally {
        setBusy(null)
      }
    },
    [authedFetch],
  )

  const reclassifyAll = useCallback(async () => {
    if (
      !window.confirm(
        'Mark all non-legacy global photos as ai_processed=FALSE? AI worker will reprocess them on the next tick.',
      )
    )
      return
    try {
      setBusy('reclassify-all')
      const res = await authedFetch(
        `${API_URL}/api/admin/photo-bank/reclassify-all`,
        { method: 'POST' },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { queued: number }
      window.alert(`Queued ${data.queued} photos for reclassify.`)
    } catch (err) {
      setError((err as Error)?.message || 'reclassify failed')
    } finally {
      setBusy(null)
    }
  }, [authedFetch])

  return (
    <div>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-medium">Photo bank — workers</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="rounded border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={reclassifyAll}
            disabled={busy === 'reclassify-all'}
            className="rounded border border-amber-400 bg-amber-50 px-3 py-1 text-sm text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            Reclassify all
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {workers.map((w) => (
            <div
              key={w.kind}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-base font-semibold">
                  {WORKER_LABEL[w.kind] ?? w.kind}
                </h2>
                <span
                  className={
                    'rounded px-2 py-0.5 text-xs font-medium ' +
                    (w.status === 'running'
                      ? 'bg-emerald-100 text-emerald-900'
                      : w.status === 'idle'
                        ? 'bg-zinc-100 text-zinc-700'
                        : 'bg-amber-100 text-amber-900')
                  }
                >
                  {w.status}
                </span>
              </div>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Last tick</dt>
                  <dd className="text-zinc-800">{formatRelative(w.last_tick_at)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Ticks total</dt>
                  <dd className="text-zinc-800">{w.ticks_total}</dd>
                </div>
                {w.kind === 'collector' && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Photos collected</dt>
                    <dd className="text-zinc-800">{w.photos_collected}</dd>
                  </div>
                )}
                {(w.kind === 'ai_cleanup' || w.kind === 'ai_classify') && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">AI processed</dt>
                      <dd className="text-zinc-800">{w.photos_ai_processed}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">AI failed</dt>
                      <dd className="text-zinc-800">{w.photos_ai_failed}</dd>
                    </div>
                  </>
                )}
              </dl>
              <div className="mt-3 flex items-center gap-2">
                {w.status === 'paused' ? (
                  <button
                    type="button"
                    onClick={() => toggle(w.kind, 'resume')}
                    disabled={busy === `${w.kind}:resume`}
                    className="rounded border border-emerald-400 bg-emerald-50 px-3 py-1 text-sm text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(w.kind, 'pause')}
                    disabled={busy === `${w.kind}:pause`}
                    className="rounded border border-amber-400 bg-amber-50 px-3 py-1 text-sm text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  >
                    Pause
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
