'use client'

/**
 * Reclassify panel — admin Pass-1 sweep over the global photo bank.
 *
 * Two sub-pieces in one component:
 *
 *   1. Trigger button (top-right of the photo-bank header). Click
 *      opens a small mode-picker dropdown with three presets:
 *        - "Incomplete fields only" (default; recommended)
 *        - "Failed only" (rows where ai_processed=FALSE)
 *        - "All photos" (full bank — slow + costly, with confirm)
 *      Submits POST /api/admin/global-bank/reclassify, gets back a
 *      jobId, persists it in localStorage, and starts polling.
 *
 *   2. Sticky progress banner above the page (only when a sweep is
 *      running). Shows mode, current/total, and a Cancel? Pseudo —
 *      we don't have a backend cancel endpoint; we just stop polling
 *      locally and clear localStorage. The job continues server-side.
 *
 * On page mount we hit GET /admin/global-bank/reclassify (sans-id) to
 * detect any in-flight job started by another tab/session and resume
 * polling automatically.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2, RefreshCw, ChevronDown, X } from 'lucide-react'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

type ReclassifyMode = 'incomplete' | 'failed' | 'all'
type ReclassifyStatus = 'queued' | 'running' | 'done' | 'failed'

interface ReclassifyState {
  jobId: string
  mode: ReclassifyMode
  status: ReclassifyStatus
  startedAt: number
  finishedAt?: number
  progress: { current: number; total: number }
  result?: { processed: number; succeeded: number; failed: number }
  error?: string
}

const STORAGE_KEY = 'waytico:active-reclassify-job'

function saveJob(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // ignore
  }
}

function loadJob(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function clearJob() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

function modeLabel(mode: ReclassifyMode): string {
  switch (mode) {
    case 'incomplete':
      return 'Incomplete fields'
    case 'failed':
      return 'Failed only'
    case 'all':
      return 'All photos'
  }
}

export function ReclassifyPanel() {
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

  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [state, setState] = useState<ReclassifyState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [doneToastShown, setDoneToastShown] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }
  useEffect(() => () => stopPoll(), [])

  const startPoll = useCallback(
    (jobId: string) => {
      stopPoll()
      pollRef.current = setInterval(async () => {
        try {
          const r = await authedFetch(
            `${API_URL}/api/admin/global-bank/reclassify/${jobId}`,
          )
          if (r.status === 404) {
            stopPoll()
            clearJob()
            setState(null)
            return
          }
          if (!r.ok) return
          const cur = (await r.json()) as ReclassifyState
          setState(cur)
          if (cur.status === 'done' || cur.status === 'failed') {
            stopPoll()
            clearJob()
          }
        } catch {
          // ignore
        }
      }, 2000)
    },
    [authedFetch],
  )

  // Mount-time restore: storage first, then fall back to GET /reclassify
  // (returns the active job, if any) so a sweep started in another tab
  // is also picked up.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const stored = loadJob()
      try {
        if (stored) {
          const r = await authedFetch(
            `${API_URL}/api/admin/global-bank/reclassify/${stored}`,
          )
          if (cancelled) return
          if (r.ok) {
            const s = (await r.json()) as ReclassifyState
            setState(s)
            if (s.status === 'queued' || s.status === 'running') {
              startPoll(s.jobId)
              return
            }
            // Done/failed — keep visible briefly, drop the key.
            clearJob()
            return
          }
          if (r.status === 404) clearJob()
        }

        const r2 = await authedFetch(
          `${API_URL}/api/admin/global-bank/reclassify`,
        )
        if (cancelled) return
        if (r2.ok) {
          const j = (await r2.json()) as { active: ReclassifyState | null }
          if (j.active) {
            saveJob(j.active.jobId)
            setState(j.active)
            if (
              j.active.status === 'queued' ||
              j.active.status === 'running'
            ) {
              startPoll(j.active.jobId)
            }
          }
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = useCallback(
    async (mode: ReclassifyMode) => {
      if (submitting) return
      setSubmitting(true)
      setError(null)
      setPickerOpen(false)
      setDoneToastShown(false)
      try {
        const res = await authedFetch(
          `${API_URL}/api/admin/global-bank/reclassify`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode }),
          },
        )
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          throw new Error(
            (j as { error?: string }).error || `HTTP ${res.status}`,
          )
        }
        const j = (await res.json()) as {
          jobId: string
          alreadyRunning: boolean
          state: ReclassifyState
        }
        saveJob(j.jobId)
        setState(j.state)
        startPoll(j.jobId)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Submit failed')
      } finally {
        setSubmitting(false)
      }
    },
    [authedFetch, startPoll, submitting],
  )

  const dismiss = () => {
    stopPoll()
    clearJob()
    setState(null)
    setDoneToastShown(false)
  }

  const inFlight =
    state && (state.status === 'queued' || state.status === 'running')
  const justFinished =
    state && (state.status === 'done' || state.status === 'failed')

  return (
    <>
      {/* Trigger button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          disabled={submitting || Boolean(inFlight)}
          className="inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
          title={
            inFlight
              ? 'A reclassify sweep is already running'
              : 'Reclassify rows in the photo bank'
          }
        >
          <RefreshCw
            className={'h-3.5 w-3.5 ' + (submitting ? 'animate-spin' : '')}
          />
          Reclassify…
          <ChevronDown className="h-3 w-3" />
        </button>

        {pickerOpen && !inFlight && (
          <div
            role="menu"
            className="absolute right-0 top-full z-10 mt-1 w-72 rounded border border-zinc-200 bg-white shadow-md"
          >
            <button
              type="button"
              onClick={() => submit('incomplete')}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
            >
              <div className="font-medium">Incomplete fields</div>
              <div className="text-xs text-zinc-500">
                Rows missing description, tags, landmarks, or ai_processed=false.
                Recommended.
              </div>
            </button>
            <button
              type="button"
              onClick={() => submit('failed')}
              className="block w-full border-t border-zinc-100 px-3 py-2 text-left text-sm hover:bg-zinc-50"
            >
              <div className="font-medium">Failed only</div>
              <div className="text-xs text-zinc-500">
                Rows where ai_processed=false. Faster — skips partially-classified.
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'Reclassify ALL photos? This re-asks Gemini for every row in the bank — slow and costly.',
                  )
                ) {
                  submit('all')
                }
              }}
              className="block w-full border-t border-zinc-100 px-3 py-2 text-left text-sm hover:bg-zinc-50"
            >
              <div className="font-medium text-rose-700">All photos</div>
              <div className="text-xs text-zinc-500">
                Every row in the bank. Use sparingly.
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Sticky progress banner — full width below the header */}
      {(inFlight || (justFinished && !doneToastShown)) && state && (
        <div
          className={
            'sticky top-0 z-20 mb-3 flex flex-wrap items-center gap-2 rounded border px-3 py-2 text-sm ' +
            (inFlight
              ? 'border-amber-300 bg-amber-50 text-amber-900'
              : state.status === 'done'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border-rose-300 bg-rose-50 text-rose-900')
          }
        >
          {inFlight && (
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          )}
          <span className="font-medium">
            Reclassify ({modeLabel(state.mode)}):
          </span>
          {inFlight ? (
            <span>
              {state.progress.current} / {state.progress.total} processed
              {state.progress.total > 0 &&
                ` · ${Math.floor(
                  (state.progress.current / state.progress.total) * 100,
                )}%`}
            </span>
          ) : state.status === 'done' && state.result ? (
            <span>
              Done — {state.result.succeeded} succeeded, {state.result.failed}{' '}
              failed of {state.result.processed}
            </span>
          ) : (
            <span>Failed — {state.error ?? 'unknown error'}</span>
          )}
          <span className="ml-auto flex items-center gap-2">
            {inFlight && state.progress.total > 0 && (
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-amber-200">
                <div
                  className="h-full bg-amber-600 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (state.progress.current / state.progress.total) * 100,
                    )}%`,
                  }}
                />
              </div>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded p-1 hover:bg-black/5"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-800">
          {error}
        </div>
      )}
    </>
  )
}
