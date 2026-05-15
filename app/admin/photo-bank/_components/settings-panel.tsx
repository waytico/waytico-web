'use client'

/**
 * Photo Bank — Collector settings panel.
 *
 * Two groups of knobs from /api/admin/photo-bank/collector-settings
 * (backed by config_settings):
 *
 *   - Priority override — restrict the collector to one country and/or
 *     kind. Surfaced first because it changes *what* gets crawled.
 *   - Pacing — tick interval + targets per cycle on top; the rarely
 *     touched oversample / per-kind minimums sit in an Advanced block.
 *
 * The per-target plan (defaultTargetCount) is no longer edited here —
 * it moved into the "Generate all" control on the Targets panel. Edits
 * take effect within one collector cycle (the PATCH invalidates the
 * settings cache); no redeploy needed.
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
}

interface CountryEntry {
  country: string
  count: number
}

interface FieldSpec {
  key: keyof CollectorSettings
  label: string
  help: string
  min: number
  max: number
}

// min/max mirror the clamps in the backend (collector-settings.ts).
const PRIMARY_FIELDS: FieldSpec[] = [
  {
    key: 'tickSeconds',
    label: 'Tick interval (seconds)',
    help: 'Seconds between collector cycles. Lower = faster crawl.',
    min: 2,
    max: 3600,
  },
  {
    key: 'targetsPerTick',
    label: 'Targets per cycle',
    help: 'How many targets one cycle processes back-to-back.',
    min: 1,
    max: 25,
  },
]

const ADVANCED_FIELDS: FieldSpec[] = [
  {
    key: 'oversample',
    label: 'Oversample factor',
    help: 'Wikimedia search results requested vs photos still needed.',
    min: 1,
    max: 10,
  },
  {
    key: 'minCity',
    label: 'Min photos — city',
    help: 'Surviving photos before a city target may be marked exhausted.',
    min: 1,
    max: 100,
  },
  {
    key: 'minLandmark',
    label: 'Min photos — landmark',
    help: 'Surviving photos before a landmark target may be marked exhausted.',
    min: 1,
    max: 100,
  },
]

interface Props {
  authedFetch: AuthedFetch
}

export function SettingsPanel({ authedFetch }: Props) {
  const [draft, setDraft] = useState<CollectorSettings | null>(null)
  const [override, setOverride] = useState<CollectorOverride>({
    country: null,
    kind: null,
  })
  const [countries, setCountries] = useState<CountryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

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
        setOverride(data.override ?? { country: null, kind: null })
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
  }, [authedFetch])

  // Country list for the override dropdown.
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
  }, [authedFetch])

  const setField = useCallback((key: keyof CollectorSettings, raw: string) => {
    setSaved(false)
    setDraft((prev) => {
      if (!prev) return prev
      const n = parseInt(raw, 10)
      return { ...prev, [key]: Number.isFinite(n) ? n : prev[key] }
    })
  }, [])

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
        // Show the clamped / normalised values the backend actually stored.
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

  const overrideActive = Boolean(override.country || override.kind)

  return (
    <details className="rounded-lg border border-zinc-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-lg font-medium text-zinc-900">
        Photo bank — collector settings
        {overrideActive ? (
          <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-900">
            override active
          </span>
        ) : (
          <span className="ml-2 text-xs font-normal text-zinc-400">
            — collector pacing &amp; priority override
          </span>
        )}
      </summary>

      <div className="border-t border-zinc-200 px-4 py-3">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || !draft}
            className="rounded border border-emerald-400 bg-emerald-50 px-3 py-1 text-sm text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
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

        {loading || !draft ? (
          <div className="flex h-32 items-center justify-center text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* ── Priority override ─────────────────────────────── */}
            <section>
              <h2 className="mb-1 text-sm font-semibold text-zinc-800">
                Priority override
              </h2>
              {overrideActive && (
                <div className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Override active — the collector only crawls{' '}
                  <strong>{override.country ?? 'any country'}</strong>
                  {' / '}
                  <strong>{override.kind ?? 'any kind'}</strong>. Clear both
                  fields to return to the global priority queue.
                </div>
              )}
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-zinc-800">
                    Country
                  </span>
                  <select
                    value={override.country ?? ''}
                    onChange={(e) => {
                      setSaved(false)
                      setOverride((o) => ({
                        ...o,
                        country: e.target.value || null,
                      }))
                    }}
                    className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                  >
                    <option value="">No override (all countries)</option>
                    {countries.map((c) => (
                      <option key={c.country} value={c.country}>
                        {c.country} ({c.count})
                      </option>
                    ))}
                  </select>
                  <span className="text-xs leading-snug text-zinc-500">
                    Restrict the collector to one country.
                  </span>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-zinc-800">
                    Kind
                  </span>
                  <select
                    value={override.kind ?? ''}
                    onChange={(e) => {
                      setSaved(false)
                      const v = e.target.value
                      setOverride((o) => ({
                        ...o,
                        kind:
                          v === 'city' || v === 'landmark' ? v : null,
                      }))
                    }}
                    className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                  >
                    <option value="">No override (all kinds)</option>
                    <option value="city">Cities only</option>
                    <option value="landmark">Landmarks only</option>
                  </select>
                  <span className="text-xs leading-snug text-zinc-500">
                    Restrict the collector to one kind.
                  </span>
                </label>
              </div>
            </section>

            {/* ── Pacing ────────────────────────────────────────── */}
            <section>
              <h2 className="mb-1 text-sm font-semibold text-zinc-800">
                Pacing
              </h2>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                {PRIMARY_FIELDS.map((f) => (
                  <label key={f.key} className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-zinc-800">
                      {f.label}
                    </span>
                    <input
                      type="number"
                      min={f.min}
                      max={f.max}
                      value={draft[f.key]}
                      onChange={(e) => setField(f.key, e.target.value)}
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                    />
                    <span className="text-xs leading-snug text-zinc-500">
                      {f.help} Range {f.min}–{f.max}.
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* ── Advanced ──────────────────────────────────────── */}
            <details className="rounded border border-zinc-200">
              <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-700">
                Advanced — oversample &amp; exhaust minimums
              </summary>
              <div className="border-t border-zinc-200 px-3 py-3">
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ADVANCED_FIELDS.map((f) => (
                    <label key={f.key} className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-zinc-800">
                        {f.label}
                      </span>
                      <input
                        type="number"
                        min={f.min}
                        max={f.max}
                        value={draft[f.key]}
                        onChange={(e) => setField(f.key, e.target.value)}
                        className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                      />
                      <span className="text-xs leading-snug text-zinc-500">
                        {f.help} Range {f.min}–{f.max}.
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </details>
          </div>
        )}
      </div>
    </details>
  )
}
