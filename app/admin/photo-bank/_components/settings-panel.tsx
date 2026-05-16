'use client'

/**
 * Photo Bank — Collector control panel.
 *
 * One flat panel (no outer accordion) split into clearly separated
 * sections by horizontal dividers:
 *
 *   1. Status row — pill + Pause/Resume + last-tick metrics for the
 *      Collector worker. Duplicates WorkersPanel's collector card on
 *      purpose: different mental model (overview vs control). The
 *      worker status auto-refreshes every 10 s so the metrics stay
 *      live without a manual reload.
 *   2. Priority collection — restrict the crawl to one country and/or
 *      kind. Default is "All countries / All kinds". When set, an
 *      amber inline banner appears so it's obvious the collector is
 *      narrowed.
 *   3. Change goal — bulk-bump `target_count` across a scope (Country,
 *      Country + City). ADD-only — set would wipe uneven goals on a
 *      country with landmarks ranging 5–15. Default-goal for newly
 *      generated locations sits in the same row but its value is part
 *      of the global Save below (not the bulk Apply).
 *   4. Pacing — Tick interval + Locations per cycle on top; the rarely
 *      touched Oversample / per-kind minimums sit in a nested
 *      `<details>` block (Advanced) — collapsed by default.
 *   5. Save — persists all settings (pacing + priority + default
 *      goal). The bulk goal Apply has its own button next to its
 *      inputs and fires independently.
 *
 * Schema note (already discussed): `photo_bank_targets` has no city
 * link for landmarks. Picking a city in the Change-goal scope hits
 * exactly that one city row. To bump a country's landmarks together,
 * leave city empty (= all rows in the country including landmarks).
 */

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { AuthedFetch } from '@/hooks/use-admin-photo-review'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

interface CollectorSettings {
  tickSeconds: number
  targetsPerTick: number
  oversample: number
  minCity: number
  minLandmark: number
  defaultTargetCount: number
}

interface CollectorOverride {
  country: string | null
  kind: 'city' | 'landmark' | null
  name: string | null
}

interface CountryEntry {
  country: string
  count: number
}

interface WorkerRow {
  kind: 'collector' | 'ai_cleanup' | 'ai_classify'
  status: 'running' | 'paused' | 'idle'
  last_tick_at: string | null
  ticks_total: number
  photos_collected: number
}

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

export function SettingsPanel({ authedFetch }: Props) {
  // ── Settings (pacing + priority + default goal) ──────────────────
  const [draft, setDraft] = useState<CollectorSettings | null>(null)
  const [override, setOverride] = useState<CollectorOverride>({
    country: null,
    kind: null,
    name: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // ── Countries for both dropdowns (priority + change-goal) ────────
  const [countries, setCountries] = useState<CountryEntry[]>([])
  const [refreshTick, setRefreshTick] = useState(0)

  // ── Collector worker status (status row + Pause/Resume) ──────────
  const [collectorWorker, setCollectorWorker] = useState<WorkerRow | null>(null)
  const [workerBusy, setWorkerBusy] = useState(false)

  // ── Change-goal scope state ──────────────────────────────────────
  // goalScope is an opaque encoded string:
  //   ""              → no further filter (country-level)
  //   "k:city"        → all cities of the country
  //   "k:landmark"    → all landmarks of the country
  //   "n:<Name>"      → exact target name
  const [goalCountry, setGoalCountry] = useState('')
  const [goalScope, setGoalScope] = useState('')
  const [goalAdd, setGoalAdd] = useState('')
  // locationsForCountry feeds BOTH the Priority and Change-goal combo
  // dropdowns when a country is picked in either. Lists every target
  // row of the country (cities + landmarks) with its kind so each
  // option can show the kind suffix.
  const [locationsForCountry, setLocationsForCountry] = useState<
    Array<{ name: string; kind: 'city' | 'landmark' }>
  >([])
  const [locationsForOverride, setLocationsForOverride] = useState<
    Array<{ name: string; kind: 'city' | 'landmark' }>
  >([])
  const [goalApplying, setGoalApplying] = useState(false)
  const [goalApplied, setGoalApplied] = useState<number | null>(null)

  // ── Load settings ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    authedFetch(`${API_URL}/api/admin/photo-bank/collector-settings`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return (await res.json()) as {
          settings: CollectorSettings
          override?: CollectorOverride
        }
      })
      .then((data) => {
        if (cancelled) return
        setDraft(data.settings)
        setOverride(data.override ?? { country: null, kind: null, name: null })
        setError(null)
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error)?.message || 'load failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authedFetch])

  // ── Load countries ───────────────────────────────────────────────
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

  // ── Load + auto-refresh collector worker row ─────────────────────
  useEffect(() => {
    let cancelled = false
    const fetchWorker = () =>
      authedFetch(`${API_URL}/api/admin/photo-bank/workers`)
        .then(async (res) => {
          if (!res.ok) return
          const data = (await res.json()) as { workers: WorkerRow[] }
          if (cancelled) return
          const c = (data.workers || []).find((w) => w.kind === 'collector')
          if (c) setCollectorWorker(c)
        })
        .catch(() => {})
    fetchWorker()
    const t = setInterval(fetchWorker, 10_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [authedFetch, refreshTick])

  // ── Cities + landmarks for the change-goal country ───────────────
  // Loaded fresh whenever `goalCountry` changes; cleared when it
  // resets. Shared shape with `locationsForOverride` below — both
  // feed scope-combo dropdowns that list every target row of the
  // country (city + landmark) with its kind so each option can show
  // the kind suffix.
  useEffect(() => {
    if (!goalCountry) {
      setLocationsForCountry([])
      setGoalScope('')
      return
    }
    let cancelled = false
    const sp = new URLSearchParams()
    sp.set('country', goalCountry)
    sp.set('perPage', '500')
    authedFetch(`${API_URL}/api/admin/photo-bank/targets?${sp.toString()}`)
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as {
          targets: Array<{ name: string; kind: 'city' | 'landmark' }>
        }
        if (cancelled) return
        const list = (data.targets || [])
          .map((t) => ({ name: t.name, kind: t.kind }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setLocationsForCountry(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authedFetch, goalCountry])

  // Cities + landmarks for the Priority-override country. Same shape
  // as above, separate state because the two sections can point at
  // different countries simultaneously (Change-goal on France while
  // Priority is on Canada is fine).
  useEffect(() => {
    if (!override.country) {
      setLocationsForOverride([])
      return
    }
    let cancelled = false
    const sp = new URLSearchParams()
    sp.set('country', override.country)
    sp.set('perPage', '500')
    authedFetch(`${API_URL}/api/admin/photo-bank/targets?${sp.toString()}`)
      .then(async (res) => {
        if (!res.ok) return
        const data = (await res.json()) as {
          targets: Array<{ name: string; kind: 'city' | 'landmark' }>
        }
        if (cancelled) return
        const list = (data.targets || [])
          .map((t) => ({ name: t.name, kind: t.kind }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setLocationsForOverride(list)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authedFetch, override.country])

  // ── Field setter (numeric) ───────────────────────────────────────
  const setField = useCallback(
    (key: keyof CollectorSettings, raw: string) => {
      setSaved(false)
      setDraft((prev) => {
        if (!prev) return prev
        const n = parseInt(raw, 10)
        return { ...prev, [key]: Number.isFinite(n) ? n : prev[key] }
      })
    },
    [],
  )

  // ── Save (all global settings) ───────────────────────────────────
  const save = useCallback(async () => {
    if (!draft || saving) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await authedFetch(
        `${API_URL}/api/admin/photo-bank/collector-settings`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...draft,
            overrideCountry: override.country,
            overrideKind: override.kind,
            overrideName: override.name,
          }),
        },
      )
      const data = (await res.json()) as {
        settings?: CollectorSettings
        override?: CollectorOverride
        error?: string
      }
      if (!res.ok) {
        setError(data?.error || `HTTP ${res.status}`)
      } else {
        if (data?.settings) setDraft(data.settings)
        if (data?.override) setOverride(data.override)
        setSaved(true)
      }
    } catch (err) {
      setError((err as Error)?.message || 'save failed')
    } finally {
      setSaving(false)
    }
  }, [authedFetch, draft, override, saving])

  // ── Pause/Resume the collector worker ────────────────────────────
  const toggleWorker = useCallback(async () => {
    if (workerBusy || !collectorWorker) return
    setWorkerBusy(true)
    setError(null)
    const action = collectorWorker.status === 'paused' ? 'resume' : 'pause'
    try {
      const res = await authedFetch(
        `${API_URL}/api/admin/photo-bank/workers/collector/${action}`,
        { method: 'POST' },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setRefreshTick((t) => t + 1)
    } catch (err) {
      setError((err as Error)?.message || 'pause/resume failed')
    } finally {
      setWorkerBusy(false)
    }
  }, [authedFetch, collectorWorker, workerBusy])

  // ── Apply bulk goal change (add only) ────────────────────────────
  const applyGoal = useCallback(async () => {
    if (goalApplying) return
    const n = parseInt(goalAdd, 10)
    if (!Number.isFinite(n) || n === 0) return
    setGoalApplying(true)
    setError(null)
    setGoalApplied(null)
    try {
      // goalScope decoding mirrors the dropdown encoding:
      //   ""           -> country-level (no second filter)
      //   "k:city"     -> filter.kind = 'city'
      //   "k:landmark" -> filter.kind = 'landmark'
      //   "n:<Name>"   -> filter.name = <Name>
      const filter: Record<string, string> = {}
      if (goalCountry) filter.country = goalCountry
      if (goalScope.startsWith('k:')) {
        const k = goalScope.slice(2)
        if (k === 'city' || k === 'landmark') filter.kind = k
      } else if (goalScope.startsWith('n:')) {
        filter.name = goalScope.slice(2)
      }
      const res = await authedFetch(
        `${API_URL}/api/admin/photo-bank/targets/bulk`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filter,
            patch: { target_count_delta: n },
          }),
        },
      )
      const data = (await res.json()) as { affected?: number; error?: string }
      if (!res.ok) {
        setError(data?.error || `HTTP ${res.status}`)
      } else {
        setGoalApplied(data.affected ?? 0)
        setGoalAdd('')
      }
    } catch (err) {
      setError((err as Error)?.message || 'apply failed')
    } finally {
      setGoalApplying(false)
    }
  }, [authedFetch, goalCountry, goalScope, goalAdd, goalApplying])

  const overrideActive = Boolean(
    override.country || override.kind || override.name,
  )

  // Auto-clear the "applied N rows" banner after a few seconds so it
  // doesn't sit forever between actions.
  useEffect(() => {
    if (goalApplied === null) return
    const t = setTimeout(() => setGoalApplied(null), 6_000)
    return () => clearTimeout(t)
  }, [goalApplied])

  const statusPillClasses = (() => {
    if (!collectorWorker) return 'bg-zinc-100 text-zinc-700'
    switch (collectorWorker.status) {
      case 'running':
        return 'bg-emerald-100 text-emerald-900'
      case 'paused':
        return 'bg-amber-100 text-amber-900'
      default:
        return 'bg-zinc-100 text-zinc-700'
    }
  })()

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      {/* ── 1. Status row ─────────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-medium">Collector</h2>
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${statusPillClasses}`}
        >
          {collectorWorker?.status ?? 'loading…'}
        </span>
        {collectorWorker?.status === 'paused' ? (
          <button
            type="button"
            onClick={toggleWorker}
            disabled={workerBusy || !collectorWorker}
            className="rounded border border-emerald-400 bg-emerald-50 px-3 py-1 text-sm text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
          >
            {workerBusy ? '…' : 'Resume'}
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleWorker}
            disabled={workerBusy || !collectorWorker}
            className="rounded border border-amber-400 bg-amber-50 px-3 py-1 text-sm text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            {workerBusy ? '…' : 'Pause'}
          </button>
        )}
        {collectorWorker && (
          <span className="text-xs text-zinc-500">
            last tick {formatRelative(collectorWorker.last_tick_at)} ·{' '}
            {collectorWorker.ticks_total.toLocaleString()} ticks ·{' '}
            {collectorWorker.photos_collected.toLocaleString()} photos
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}
      {saved && !error && (
        <div className="mb-3 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Saved. Changes take effect on the collector&apos;s next cycle.
        </div>
      )}
      {goalApplied !== null && !error && (
        <div className="mb-3 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Goal updated on {goalApplied.toLocaleString()} location
          {goalApplied === 1 ? '' : 's'}.
        </div>
      )}

      {loading || !draft ? (
        <div className="flex h-32 items-center justify-center text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          {/* ── 2. Priority collection ─────────────────────────── */}
          <div className="border-t border-zinc-200 pt-3">
            <h3 className="mb-1 text-sm font-semibold text-zinc-800">
              Priority collection
            </h3>
            <p className="mb-2 text-xs text-zinc-500">
              Restrict the collector to one country and/or kind. Leave both at
              the default to crawl everything ordered by priority.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={override.country ?? ''}
                onChange={(e) => {
                  setSaved(false)
                  // Switching countries invalidates any previously
                  // picked location name — drop it. Keep `kind` so a
                  // "Cities only" filter survives a country switch.
                  setOverride((o) => ({
                    ...o,
                    country: e.target.value || null,
                    name: null,
                  }))
                }}
                className="w-56 rounded border border-zinc-300 px-2 py-1 text-sm"
              >
                <option value="">All countries</option>
                {countries.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.country} ({c.count})
                  </option>
                ))}
              </select>
              <select
                value={
                  // Selected encoding mirrors Change-goal's:
                  //   ""            → no scope filter
                  //   "k:<kind>"    → kind aggregation
                  //   "n:<Name>"    → exact target
                  // Name takes precedence when both are set in DB
                  // (typical happy path: only one axis at a time).
                  override.name
                    ? `n:${override.name}`
                    : override.kind
                      ? `k:${override.kind}`
                      : ''
                }
                onChange={(e) => {
                  setSaved(false)
                  const v = e.target.value
                  if (v.startsWith('k:')) {
                    const k = v.slice(2)
                    setOverride((o) => ({
                      ...o,
                      kind: k === 'city' || k === 'landmark' ? k : null,
                      name: null,
                    }))
                  } else if (v.startsWith('n:')) {
                    setOverride((o) => ({
                      ...o,
                      kind: null,
                      name: v.slice(2),
                    }))
                  } else {
                    setOverride((o) => ({ ...o, kind: null, name: null }))
                  }
                }}
                disabled={!override.country}
                className="w-56 rounded border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-50 disabled:text-zinc-400"
                title={
                  override.country
                    ? `Narrow Priority within ${override.country}`
                    : 'Pick a country first'
                }
              >
                {!override.country ? (
                  <option value="">(pick country first)</option>
                ) : (
                  <>
                    <option value="">All locations</option>
                    <option value="k:city">All cities</option>
                    <option value="k:landmark">All landmarks</option>
                    {locationsForOverride.length > 0 && (
                      <option disabled value="__sep__">
                        ──────────
                      </option>
                    )}
                    {locationsForOverride.map((loc) => (
                      <option
                        key={`${loc.kind}:${loc.name}`}
                        value={`n:${loc.name}`}
                      >
                        {loc.name} ({loc.kind})
                      </option>
                    ))}
                  </>
                )}
              </select>
              {overrideActive && (
                <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
                  Crawling only {override.country ?? 'any country'} ·{' '}
                  {override.name
                    ? override.name
                    : override.kind
                      ? `${override.kind === 'city' ? 'cities' : 'landmarks'} only`
                      : 'all locations'}
                </span>
              )}
            </div>
          </div>

          {/* ── 3. Change goal ─────────────────────────────────── */}
          <div className="mt-4 border-t border-zinc-200 pt-3">
            <h3 className="mb-1 text-sm font-semibold text-zinc-800">
              Change goal
            </h3>
            <p className="mb-2 text-xs text-zinc-500">
              Add a number to <code>target_count</code> across the chosen
              scope. Add-only — a Set would wipe uneven goals (e.g. landmarks
              ranging 5–15). Default applies to newly generated locations.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={goalCountry}
                onChange={(e) => {
                  setGoalCountry(e.target.value)
                  setGoalScope('')
                }}
                className="w-56 rounded border border-zinc-300 px-2 py-1 text-sm"
              >
                <option value="">All countries</option>
                {countries.map((c) => (
                  <option key={c.country} value={c.country}>
                    {c.country} ({c.count})
                  </option>
                ))}
              </select>
              <select
                value={goalScope}
                onChange={(e) => setGoalScope(e.target.value)}
                disabled={!goalCountry}
                className="w-56 rounded border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-50 disabled:text-zinc-400"
                title={
                  goalCountry
                    ? `Narrow scope within ${goalCountry}`
                    : 'Pick a country first'
                }
              >
                {!goalCountry ? (
                  <option value="">(pick country first)</option>
                ) : (
                  <>
                    <option value="">All locations</option>
                    <option value="k:city">All cities</option>
                    <option value="k:landmark">All landmarks</option>
                    {locationsForCountry.length > 0 && (
                      <option disabled value="__sep__">
                        ──────────
                      </option>
                    )}
                    {locationsForCountry.map((loc) => (
                      <option
                        key={`${loc.kind}:${loc.name}`}
                        value={`n:${loc.name}`}
                      >
                        {loc.name} ({loc.kind})
                      </option>
                    ))}
                  </>
                )}
              </select>
              <input
                type="number"
                placeholder="add"
                value={goalAdd}
                onChange={(e) => setGoalAdd(e.target.value)}
                className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={applyGoal}
                disabled={goalApplying || goalAdd.trim() === ''}
                className="rounded border border-emerald-400 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
              >
                {goalApplying ? 'Applying…' : 'Apply'}
              </button>
              <span className="ml-3 inline-flex items-center gap-2 border-l border-zinc-200 pl-3 text-xs text-zinc-600">
                Default:
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={draft.defaultTargetCount}
                  onChange={(e) =>
                    setField('defaultTargetCount', e.target.value)
                  }
                  className="w-14 rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900"
                  title="Initial target_count for locations created by Top up. Saved with the global Save button. Recommended 5."
                />
              </span>
            </div>
          </div>

          {/* ── 4. Pacing ──────────────────────────────────────── */}
          <div className="mt-4 border-t border-zinc-200 pt-3">
            <h3 className="mb-1 text-sm font-semibold text-zinc-800">Pacing</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-800">
                  Tick interval (seconds)
                </span>
                <input
                  type="number"
                  min={2}
                  max={3600}
                  value={draft.tickSeconds}
                  onChange={(e) => setField('tickSeconds', e.target.value)}
                  className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                />
                <span className="text-xs text-zinc-500">
                  Seconds between collector cycles. Lower = faster crawl. Range
                  2–3600. Recommended 5.
                </span>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-zinc-800">
                  Locations per cycle
                </span>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={draft.targetsPerTick}
                  onChange={(e) => setField('targetsPerTick', e.target.value)}
                  className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                />
                <span className="text-xs text-zinc-500">
                  How many locations one cycle processes back-to-back. Range
                  1–25. Recommended 5.
                </span>
              </label>
            </div>
            <details className="mt-3 rounded border border-zinc-200">
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-zinc-700">
                Advanced — oversample &amp; exhaust minimums
              </summary>
              <div className="border-t border-zinc-200 px-3 py-3">
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-zinc-800">
                      Oversample factor
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={draft.oversample}
                      onChange={(e) => setField('oversample', e.target.value)}
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-zinc-500">
                      Wikimedia search results requested vs photos still
                      needed. Range 1–10. Recommended 3.
                    </span>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-zinc-800">
                      Min photos — city
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={draft.minCity}
                      onChange={(e) => setField('minCity', e.target.value)}
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-zinc-500">
                      Surviving photos before a city target may be marked
                      exhausted. Range 1–100. Recommended 5.
                    </span>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-zinc-800">
                      Min photos — landmark
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={draft.minLandmark}
                      onChange={(e) => setField('minLandmark', e.target.value)}
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                    <span className="text-xs text-zinc-500">
                      Surviving photos before a landmark target may be marked
                      exhausted. Range 1–100. Recommended 3.
                    </span>
                  </label>
                </div>
              </div>
            </details>
          </div>

          {/* ── 5. Save ───────────────────────────────────────────── */}
          <div className="mt-4 flex justify-end border-t border-zinc-200 pt-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || !draft}
              className="rounded border border-emerald-400 bg-emerald-50 px-4 py-1 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
