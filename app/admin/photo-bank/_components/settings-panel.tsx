'use client'

/**
 * Photo Bank — Collector settings panel.
 *
 * Reads / edits the six collector pacing knobs from
 * /api/admin/photo-bank/collector-settings (backed by config_settings):
 * tick interval, targets per cycle, Wikimedia oversample factor, the
 * per-kind exhaust minimums, and the default per-target plan stamped on
 * newly generated targets.
 *
 * Edits take effect within one collector cycle — the backend PATCH
 * invalidates the settings cache; no redeploy needed. Inputs are plain
 * number fields; the backend clamps to safe ranges as a backstop, but
 * the min/max here match those clamps so the UI guides the operator.
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

interface FieldSpec {
  key: keyof CollectorSettings
  label: string
  help: string
  min: number
  max: number
}

// min/max mirror the clamps in the backend (collector-settings.ts).
const FIELDS: FieldSpec[] = [
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
  {
    key: 'defaultTargetCount',
    label: 'Default target plan',
    help: 'target_count stamped on newly generated targets.',
    min: 1,
    max: 1000,
  },
]

interface Props {
  authedFetch: AuthedFetch
}

export function SettingsPanel({ authedFetch }: Props) {
  const [draft, setDraft] = useState<CollectorSettings | null>(null)
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
        return (await res.json()) as { settings: CollectorSettings }
      })
      .then((data) => {
        if (cancelled) return
        setDraft(data.settings)
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
          body: JSON.stringify(draft),
        },
      )
      const data = (await res.json()) as {
        settings?: CollectorSettings
        error?: string
      }
      if (!res.ok) {
        setError(data?.error || `HTTP ${res.status}`)
      } else if (data?.settings) {
        // Show the clamped values the backend actually stored.
        setDraft(data.settings)
        setSaved(true)
      }
    } catch (err) {
      setError((err as Error)?.message || 'save failed')
    } finally {
      setSaving(false)
    }
  }, [authedFetch, draft, saving])

  return (
    <div>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-medium">Photo bank — collector settings</h1>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading || !draft}
          className="rounded border border-emerald-400 bg-emerald-50 px-3 py-1 text-sm text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </header>

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
        <div className="flex h-40 items-center justify-center text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label
              key={f.key}
              className="rounded-lg border border-zinc-200 bg-white p-3"
            >
              <div className="mb-1 text-sm font-medium text-zinc-800">
                {f.label}
              </div>
              <input
                type="number"
                min={f.min}
                max={f.max}
                value={draft[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
                className="w-full rounded border border-zinc-300 px-2 py-1 text-sm"
              />
              <div className="mt-1 text-xs text-zinc-500">
                {f.help} Range {f.min}–{f.max}.
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
