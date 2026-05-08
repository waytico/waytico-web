'use client'

/**
 * Admin ad-hoc crawl form — Stage 11 Block E.
 *
 * Multi-city batch UI replacing the single-city form from Stage 10
 * Block D. Operator pastes 1–20 cities (comma- or newline-separated),
 * one country (applies to all), optional search query (blank = use
 * each city's name as its query), and photos-per-city target.
 * Sequential per-city processing happens server-side; this UI polls
 * /api/admin/global-bank/crawl/:jobId every 2 s and renders per-city
 * status until the job completes.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

type CityPhase =
  | 'queued'
  | 'crawling'
  | 'classifying'
  | 'cleaning'
  | 'done'
  | 'failed'

interface CityEntry {
  name: string
  status: CityPhase
  progress: { phase: CityPhase; current: number; total: number }
  result?: { fetched: number; approved: number; rejected_deleted: number }
  error?: string
}

interface MultiCrawlState {
  jobId: string
  type: 'multi_city'
  startedAt: number
  completedAt?: number
  searchQuery: string | null
  country: string
  targetCountPerCity: number
  cities: CityEntry[]
}

const MAX_CITIES = 20

function parseCities(raw: string): string[] {
  // Split by both commas and newlines, trim, drop empties, dedupe
  // case-insensitively while preserving the first-seen casing.
  const seen = new Set<string>()
  const out: string[] = []
  for (const piece of raw.split(/[,\n]/)) {
    const c = piece.trim()
    if (!c) continue
    const key = c.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
    if (out.length >= MAX_CITIES) break
  }
  return out
}

function phaseLabel(phase: CityPhase): string {
  switch (phase) {
    case 'queued':
      return 'Queued'
    case 'crawling':
      return 'Crawling'
    case 'classifying':
      return 'Classifying'
    case 'cleaning':
      return 'Cleaning'
    case 'done':
      return 'Done'
    case 'failed':
      return 'Failed'
  }
}

function CityRow({ city }: { city: CityEntry }) {
  const isInProgress =
    city.status === 'crawling' ||
    city.status === 'classifying' ||
    city.status === 'cleaning'
  const progressText = isInProgress
    ? `${phaseLabel(city.status)} ${city.progress.current}/${city.progress.total}`
    : phaseLabel(city.status)

  let detail: string | null = null
  if (city.status === 'done' && city.result) {
    const { fetched, approved, rejected_deleted } = city.result
    detail = `${fetched} fetched, ${approved} kept, ${rejected_deleted} deleted`
  } else if (city.status === 'failed' && city.error) {
    detail = city.error
  }

  return (
    <div className="flex items-start gap-3 py-1.5 text-sm">
      <span className="w-40 shrink-0 truncate font-medium" title={city.name}>
        {city.name}
      </span>
      <span className="flex-1">
        {isInProgress && (
          <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" aria-hidden />
        )}
        <span
          className={
            city.status === 'failed'
              ? 'text-rose-600'
              : city.status === 'done'
                ? 'text-zinc-700'
                : 'text-zinc-500'
          }
        >
          {progressText}
        </span>
        {detail && (
          <span className="ml-2 text-zinc-500">— {detail}</span>
        )}
      </span>
    </div>
  )
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

  const [citiesRaw, setCitiesRaw] = useState('')
  const [country, setCountry] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [targetCountPerCity, setTargetCountPerCity] = useState(50)
  const [submitting, setSubmitting] = useState(false)
  const [state, setState] = useState<MultiCrawlState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const parsedCities = parseCities(citiesRaw)
  const canSubmit =
    !submitting &&
    parsedCities.length > 0 &&
    country.trim().length > 0 &&
    targetCountPerCity > 0

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }
  useEffect(() => () => stopPoll(), [])

  const submit = useCallback(async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    setState(null)
    try {
      const res = await authedFetch(`${API_URL}/api/admin/global-bank/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cities: parsedCities,
          country: country.trim(),
          searchQuery: searchQuery.trim() || null,
          targetCountPerCity,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as any).error || `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { jobId: string }

      // Seed local state immediately so the user sees their cities listed
      // as Queued before the first poll lands.
      setState({
        jobId: j.jobId,
        type: 'multi_city',
        startedAt: Date.now(),
        searchQuery: searchQuery.trim() || null,
        country: country.trim(),
        targetCountPerCity,
        cities: parsedCities.map((name) => ({
          name,
          status: 'queued',
          progress: { phase: 'queued', current: 0, total: targetCountPerCity },
        })),
      })

      stopPoll()
      pollRef.current = setInterval(async () => {
        try {
          const r = await authedFetch(
            `${API_URL}/api/admin/global-bank/crawl/${j.jobId}`,
          )
          if (!r.ok) return
          const cur = (await r.json()) as MultiCrawlState
          setState(cur)
          if (cur.completedAt) stopPoll()
        } catch {
          // ignore — keep polling
        }
      }, 2000)
    } catch (e: any) {
      setError(e?.message ?? 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }, [
    authedFetch,
    canSubmit,
    parsedCities,
    country,
    searchQuery,
    targetCountPerCity,
  ])

  const allDone = state?.completedAt != null
  const totals = state
    ? state.cities.reduce(
        (acc, c) => {
          if (c.result) {
            acc.fetched += c.result.fetched
            acc.kept += c.result.approved
            acc.deleted += c.result.rejected_deleted
          }
          return acc
        },
        { fetched: 0, kept: 0, deleted: 0 },
      )
    : null
  const doneCount = state?.cities.filter((c) => c.status === 'done').length ?? 0
  const cityTotal = state?.cities.length ?? 0

  return (
    <div>
      <header className="mb-3">
        <h1 className="text-lg font-medium">Ad-hoc Wikimedia crawl</h1>
        <p className="text-sm text-zinc-500">
          Crawl Wikimedia Commons for one or more cities, classify new rows
          via Gemini, then cleanup-reject the ones that don&apos;t fit. Sequential
          per-city processing — pace is rate-limit-safe.
        </p>
      </header>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Cities <span className="font-normal text-zinc-500">(one per line or comma-separated, max {MAX_CITIES})</span>
          </label>
          <textarea
            value={citiesRaw}
            onChange={(e) => setCitiesRaw(e.target.value)}
            rows={4}
            placeholder={'Montreal, Toronto, Vancouver\nQuebec City'}
            className="block w-full rounded border border-zinc-300 px-3 py-2 text-sm font-mono"
          />
          <p className="mt-1 text-xs text-zinc-500">
            {parsedCities.length === 0
              ? 'No cities yet'
              : `${parsedCities.length} cit${parsedCities.length === 1 ? 'y' : 'ies'} parsed`}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Country <span className="font-normal text-zinc-500">(applies to all cities)</span>
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Canada"
            className="block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Search query <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="historic district"
            className="block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Leave blank to search by city name. When set, the same query is
            applied to every city.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-700">
            Photos per city
          </label>
          <input
            type="number"
            value={targetCountPerCity}
            onChange={(e) =>
              setTargetCountPerCity(Number(e.target.value) || 50)
            }
            min={1}
            max={200}
            className="block w-[120px] rounded border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Run'}
          </button>
        </div>

        {error && (
          <div className="rounded bg-amber-50 p-2 text-sm text-amber-800">
            {error}
          </div>
        )}
      </div>

      {state && (
        <div className="mt-6 rounded border border-zinc-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">
              {allDone
                ? `✓ All ${cityTotal} cit${cityTotal === 1 ? 'y' : 'ies'} done`
                : `Job in progress (${doneCount}/${cityTotal} cities done)`}
            </div>
            <div className="text-xs text-zinc-500">
              Job {state.jobId.slice(0, 8)}…
            </div>
          </div>

          <div className="divide-y divide-zinc-100">
            {state.cities.map((city) => (
              <CityRow key={city.name} city={city} />
            ))}
          </div>

          {allDone && totals && (
            <div className="mt-3 border-t border-zinc-100 pt-3 text-sm">
              <div className="text-zinc-700">
                Total: {totals.fetched} fetched, {totals.kept} kept,{' '}
                {totals.deleted} deleted
              </div>
              <a
                href="/admin/photo-bank"
                className="mt-2 inline-block rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Open photo bank to review →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
