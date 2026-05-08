'use client'

/**
 * Admin ad-hoc crawl form — TZ Photo Bank Stage 10 Block D.
 *
 * Form: searchQuery + city + country + targetCount → POST
 * /api/admin/global-bank/crawl → polls /api/admin/global-bank/crawl/:jobId
 * every 2s for phase progress (crawl → classify → cleanup).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

interface CrawlState {
  jobId: string
  status:
    | 'queued'
    | 'crawling'
    | 'classifying'
    | 'cleaning'
    | 'done'
    | 'failed'
  progress: { phase: string; current: number; total: number }
  result?: { fetched: number; approved: number; rejected: number }
  error?: string
}

export default function AdminCrawlPage() {
  const { getToken } = useAuth()

  const authedFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getToken().catch(() => null)
      const headers = new Headers(init?.headers)
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return fetch(path, { ...init, headers })
    },
    [getToken],
  )

  const [searchQuery, setSearchQuery] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [targetCount, setTargetCount] = useState(50)
  const [submitting, setSubmitting] = useState(false)
  const [state, setState] = useState<CrawlState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }
  useEffect(() => () => stopPoll(), [])

  const submit = useCallback(async () => {
    if (!searchQuery || !city || !country) return
    setSubmitting(true)
    setError(null)
    setState(null)
    try {
      const res = await authedFetch(`${API_URL}/api/admin/global-bank/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery, city, country, targetCount }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as any).error || `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { jobId: string; status: string }
      const initial: CrawlState = {
        jobId: j.jobId,
        status: 'queued',
        progress: { phase: 'queued', current: 0, total: targetCount },
      }
      setState(initial)
      // Poll
      stopPoll()
      pollRef.current = setInterval(async () => {
        try {
          const r = await authedFetch(
            `${API_URL}/api/admin/global-bank/crawl/${j.jobId}`,
          )
          if (!r.ok) return
          const cur = (await r.json()) as CrawlState
          setState(cur)
          if (cur.status === 'done' || cur.status === 'failed') {
            stopPoll()
          }
        } catch {
          // ignore — keep polling
        }
      }, 2000)
    } catch (e: any) {
      setError(e?.message ?? 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }, [authedFetch, searchQuery, city, country, targetCount])

  return (
    <div>
      <header className="mb-3">
        <h1 className="text-lg font-medium">Ad-hoc Wikimedia crawl</h1>
        <p className="text-sm text-zinc-500">
          Crawls Wikimedia Commons for the given query, classifies new rows
          via Gemini, then cleanup-rejects the ones that don't fit.
        </p>
      </header>

      <div className="space-y-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search query (e.g. Metropolitan Opera)"
          className="block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (e.g. New York)"
            className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country (e.g. United States)"
            className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={targetCount}
            onChange={(e) => setTargetCount(Number(e.target.value) || 50)}
            min={1}
            max={200}
            className="w-[100px] rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || !searchQuery || !city || !country}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Start crawl'}
        </button>
        {error && (
          <div className="rounded bg-amber-50 p-2 text-sm text-amber-800">{error}</div>
        )}
      </div>

      {state && (
        <div className="mt-6 rounded border border-zinc-200 bg-white p-4">
          <div className="text-sm font-medium">Job {state.jobId.slice(0, 8)}…</div>
          <div className="mt-2 space-y-1 text-sm">
            {(['crawling', 'classifying', 'cleaning'] as const).map((phase) => {
              const isCurrent = state.status === phase
              const isPast = ['done', 'failed'].includes(state.status)
                ? true
                : (state.status === 'classifying' && phase === 'crawling') ||
                  (state.status === 'cleaning' && phase !== 'cleaning')
              return (
                <div key={phase} className="flex items-center gap-2">
                  {isCurrent && state.status !== 'done' && state.status !== 'failed' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span className="inline-block h-3.5 w-3.5 rounded-full bg-zinc-300" />
                  )}
                  <span className="capitalize">{phase}</span>
                  {isCurrent && (
                    <span className="text-zinc-500">
                      [{state.progress.current}/{state.progress.total}]
                    </span>
                  )}
                  {isPast && !isCurrent && <span className="text-zinc-500">✓</span>}
                </div>
              )
            })}
          </div>
          {state.status === 'done' && state.result && (
            <div className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-800">
              Done. Fetched {state.result.fetched}, approved {state.result.approved},
              rejected {state.result.rejected} (deleted).{' '}
              <a href="/admin/photo-bank" className="underline">
                Open photo bank to review
              </a>
            </div>
          )}
          {state.status === 'failed' && (
            <div className="mt-3 rounded bg-red-50 p-2 text-sm text-red-800">
              Failed: {state.error ?? 'unknown'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
