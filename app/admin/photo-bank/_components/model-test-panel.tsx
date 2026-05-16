'use client'

/**
 * Photo Bank → Model test panel.
 *
 * Operator workflow:
 *   1. Upload one image (file input or drag-and-drop).
 *   2. Pick which prompt to run: Pass-2 cleanup, Pass-1 classify, or
 *      both. In "both" mode the passes run in production order —
 *      cleanup first, classify second.
 *   3. Tick up to 20 models from the catalog (only enabled rows).
 *      Each picker tile is heat-mapped by price using the same 9-step
 *      palette as /admin/models so cost is visible while picking.
 *   4. Run → server fires all calls in parallel → results render as
 *      side-by-side columns of equal width. Each column has the same
 *      vertical structure (image / decision badge / description /
 *      categories / tags / landmarks / metrics) and the rows align
 *      across columns so the operator can compare like-for-like.
 *
 * When the model returns JSON (the default for Pass-1 and Pass-2
 * prompts), the panel parses it and shows each field as a labelled
 * block — much easier to skim than a raw JSON dump. If parsing fails,
 * the raw text is shown instead.
 *
 * The image is held in memory only — never written to S3 or DB.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import type { AuthedFetch } from '@/hooks/use-admin-photo-review'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

// Per-run cap is the full count of enabled models — operator may want
// to compare them all. The backend has a defensive cap on the zod
// schema; if the operator picks more than that, the run will fail
// with a clear error.

// node-pg returns NUMERIC as string. Coerce defensively.
function coerceNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

// Project the per-photo cost to 1,000 photos using catalog prices
// (USD per 1M tokens). Returns null when either side of the price is
// missing — the UI then shows "—" instead of a misleading $0.00.
function costFor1000Photos(
  tokensIn: number | null,
  tokensOut: number | null,
  priceIn: number | null,
  priceOut: number | null,
): number | null {
  if (priceIn == null || priceOut == null) return null
  const ti = tokensIn ?? 0
  const to = tokensOut ?? 0
  const perCall = (ti * priceIn + to * priceOut) / 1_000_000
  return perCall * 1000
}

// Average input+output price for a catalog row. Mirrors what
// /admin/models uses for sort + heat-map so colours stay consistent.
function avgPrice(row: CatalogRow): number | null {
  const pi = coerceNum(row.price_input_per_1m)
  const po = coerceNum(row.price_output_per_1m)
  if (pi == null || po == null) return null
  return (pi + po) / 2
}

// 9-step heat-map identical to the catalog page: cheapest = green,
// most expensive = red, nine discrete bands so the transition reads
// at a glance.
function heatmapBg(
  v: number | null,
  domain: { min: number; max: number } | null,
): string | undefined {
  if (v == null || v <= 0 || !domain) return undefined
  if (domain.max === domain.min) return 'hsl(130, 55%, 90%)'
  // Logarithmic scale. With catalog prices spanning ~$0.18..$15.00,
  // a linear scale dumps two-thirds of the models into the first
  // bucket (everyone looks the same green). Log spreads them out so
  // each step in the 9-band palette actually gets populated.
  const lo = Math.log(domain.min)
  const hi = Math.log(domain.max)
  const t = Math.max(0, Math.min(1, (Math.log(v) - lo) / (hi - lo)))
  const STEPS = 9
  const stepIdx = Math.min(STEPS - 1, Math.floor(t * STEPS))
  const hue = 130 - (130 * stepIdx) / (STEPS - 1)
  const light = 93 - (15 * stepIdx) / (STEPS - 1)
  return `hsl(${hue.toFixed(0)}, 60%, ${light.toFixed(0)}%)`
}

type PromptKey = 'photo_bank_classify' | 'photo_cleanup'
type RunMode = PromptKey | 'both'

interface CatalogRow {
  id: string
  provider: string
  model: string
  label: string | null
  enabled: boolean
  sort_order: number
  price_input_per_1m?: number | string | null
  price_output_per_1m?: number | string | null
}

interface RunResult {
  provider: string
  model: string
  ok: boolean
  output: string | null
  error: string | null
  latency_ms: number
  tokens_in: number | null
  tokens_out: number | null
  prompt_key?: PromptKey // injected client-side when running 'both'
}

// Best-effort extraction of a JSON object from a model response. The
// prompts ask for JSON but providers often wrap it in ```json fences,
// pad it with prose, or quote it differently. We strip fences and try
// to find the outermost {...} block before parsing.
function tryParseJson(raw: string): Record<string, unknown> | null {
  if (!raw) return null
  let s = raw.trim()
  // Strip ```json ... ``` or ``` ... ``` fences. Use a permissive
  // match: some providers don't actually close the fence, or emit
  // trailing whitespace / prose after the closing backticks. We grab
  // the largest plausible inner span.
  let fence = s.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/i)
  if (!fence) fence = s.match(/^```(?:json)?\s*([\s\S]+?)(?:```|$)/i)
  if (fence) s = fence[1].trim()
  // First try direct parse
  try {
    const v = JSON.parse(s)
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null
  } catch {
    // ignore
  }
  // Fall back: take the outermost {...}
  const first = s.indexOf('{')
  const last = s.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    try {
      const v = JSON.parse(s.slice(first, last + 1))
      return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null
    } catch {
      // ignore
    }
  }
  return null
}

export function ModelTestPanel({ authedFetch }: { authedFetch: AuthedFetch }) {
  const [catalog, setCatalog] = useState<CatalogRow[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mode, setMode] = useState<RunMode>('photo_cleanup')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<RunResult[] | null>(null)
  // Pass-2 hint inputs — mirror the production cleanup hint block in
  // services/global-bank/cleanup.service.ts. Only sent to the backend
  // when mode === 'photo_cleanup'. The backend ignores them otherwise.
  const [hintCountry, setHintCountry] = useState('')
  const [hintCity, setHintCity] = useState('')
  const [hintSearchQuery, setHintSearchQuery] = useState('')

  useEffect(() => {
    let mounted = true
    authedFetch(`${API_URL}/api/admin/ai-catalog`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const j = (await res.json()) as { rows: CatalogRow[] }
        if (mounted) setCatalog(j.rows)
      })
      .catch((e: unknown) => {
        if (mounted) toast.error('Failed to load model catalog')
        // eslint-disable-next-line no-console
        console.error(e)
      })
    return () => {
      mounted = false
    }
  }, [authedFetch])

  // file preview URL — clean up on change/unmount
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const visionModels = useMemo(
    () => (catalog ?? []).filter((c) => c.enabled),
    [catalog],
  )

  // Heat-map domain for picker tiles + result cards. Computed across
  // the enabled (visible) catalog so colours match what the operator
  // sees on /admin/models.
  const priceDomain = useMemo(() => {
    const xs = visionModels.map(avgPrice).filter((v): v is number => v != null)
    if (xs.length === 0) return null
    return { min: Math.min(...xs), max: Math.max(...xs) }
  }, [visionModels])

  const togglePick = useCallback(
    (id: string) => {
      setPicked((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else {
          // No artificial cap — visionModels is the universe of enabled
          // catalog rows; operator can tick all of them.

          next.add(id)
        }
        return next
      })
    },
    [],
  )

  const onPickFile = useCallback((f: File | null) => {
    if (!f) {
      setFile(null)
      return
    }
    if (!/^image\//.test(f.type)) {
      toast.error('That is not an image')
      return
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error('File too large (max 15 MB)')
      return
    }
    setFile(f)
    setResults(null)
  }, [])

  const run = useCallback(async () => {
    if (!file) {
      toast.error('Pick an image first')
      return
    }
    if (picked.size === 0) {
      toast.error('Pick at least one model')
      return
    }
    setRunning(true)
    setResults(null)
    try {
      const pickedRows = visionModels.filter((c) => picked.has(c.id))
      const modelsPayload = pickedRows.map((c) => ({
        provider: c.provider,
        model: c.model,
      }))
      // Pass order mirrors the production ai-worker: Pass-2 cleanup
      // runs first, Pass-1 classify second. Keeping the test tool in
      // step with the live pipeline means a side-by-side run reflects
      // what the worker actually does.
      const passes: PromptKey[] =
        mode === 'both' ? ['photo_cleanup', 'photo_bank_classify'] : [mode]
      const allResults: RunResult[] = []
      for (const promptKey of passes) {
        const fd = new FormData()
        fd.append('image', file)
        fd.append('models', JSON.stringify(modelsPayload))
        fd.append('prompt_key', promptKey)
        // Hint fields are scoped to Pass-2. We still only send them when
        // non-empty so the backend skips the hint block entirely on a
        // bare Pass-2 run, matching the live cleanup behaviour when the
        // collector didn't seed the row with target context.
        if (promptKey === 'photo_cleanup') {
          if (hintCountry.trim()) fd.append('hint_country', hintCountry.trim())
          if (hintCity.trim()) fd.append('hint_city', hintCity.trim())
          if (hintSearchQuery.trim())
            fd.append('hint_search_query', hintSearchQuery.trim())
        }
        const res = await authedFetch(`${API_URL}/api/admin/photo-bank/model-test`, {
          method: 'POST',
          body: fd,
        })
        const j = (await res.json()) as { results?: RunResult[]; error?: string }
        if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`)
        for (const r of j.results ?? []) {
          allResults.push({ ...r, prompt_key: promptKey })
        }
      }
      setResults(allResults)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Run failed')
    } finally {
      setRunning(false)
    }
  }, [authedFetch, file, mode, picked, visionModels, hintCountry, hintCity, hintSearchQuery])

  return (
    <div className="space-y-4">
      {/* ── Image upload + mode picker ─────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UploadCard file={file} previewUrl={previewUrl} onPickFile={onPickFile} />
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Prompt
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === 'photo_cleanup'}
                onChange={() => setMode('photo_cleanup')}
              />
              Pass-2: cleanup
              <span className="text-xs text-zinc-500">— keep or reject decision</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === 'photo_bank_classify'}
                onChange={() => setMode('photo_bank_classify')}
              />
              Pass-1: classify
              <span className="text-xs text-zinc-500">— description, tags, landmarks</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === 'both'}
                onChange={() => setMode('both')}
              />
              Both passes
              <span className="text-xs text-zinc-500">— runs each model twice</span>
            </label>
          </div>
          {(mode === 'photo_cleanup' || mode === 'both') && (
            <div className="mt-4 space-y-2 rounded border border-zinc-200 bg-zinc-50 p-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Hint (optional) — Pass-2 source context
              </div>
              <p className="text-xs text-zinc-600">
                Mirrors the live cleanup hint block — in production the collector
                always seeds Pass-2 with the target context. Fill in to reproduce
                that; leave blank to test the no-hint path. Hint is applied to the
                Pass-2 leg only, never to Pass-1.
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  value={hintCountry}
                  onChange={(e) => setHintCountry(e.target.value)}
                  placeholder="Country"
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  value={hintCity}
                  onChange={(e) => setHintCity(e.target.value)}
                  placeholder="City"
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  value={hintSearchQuery}
                  onChange={(e) => setHintSearchQuery(e.target.value)}
                  placeholder="Search query"
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
                />
              </div>
            </div>
          )}
          <div className="mt-4">
            <button
              type="button"
              disabled={!file || picked.size === 0 || running}
              onClick={run}
              className="inline-flex items-center gap-2 rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-40"
            >
              {running && <Loader2 className="h-4 w-4 animate-spin" />}
              Run {picked.size > 0 ? `(${picked.size} model${picked.size === 1 ? '' : 's'})` : ''}
            </button>
          </div>
        </div>
      </div>

      {/* ── Results (rendered above the picker so the operator can scroll
          comparison results without losing sight of which models were
          selected) ─────────────────────────────────────────────────────── */}
      {results !== null && (
        <ResultsGrid
          results={results}
          catalog={catalog ?? []}
          priceDomain={priceDomain}
          imageUrl={previewUrl}
          file={file}
        />
      )}

      {/* ── Model picker ───────────────────────────────────────── */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Models <span className="text-zinc-400">(catalog order)</span>
          </div>
          <span className="text-xs text-zinc-500">
            {picked.size}/{visionModels.length} picked
          </span>
        </div>
        {!catalog ? (
          <div className="py-6 text-center text-sm text-zinc-500">
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          </div>
        ) : visionModels.length === 0 ? (
          <div className="py-6 text-center text-sm text-zinc-500">
            No enabled models in the catalog. Add some on /admin/models.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visionModels.map((c) => {
              const v = avgPrice(c)
              const bg = heatmapBg(v, priceDomain)
              return (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-start gap-2 rounded border border-zinc-200 px-3 py-2 text-sm hover:brightness-95"
                  style={bg ? { background: bg } : undefined}
                  title={
                    v == null
                      ? 'No price set'
                      : `Avg $${v.toFixed(2)} / 1M tokens (input+output)`
                  }
                >
                  <input
                    type="checkbox"
                    checked={picked.has(c.id)}
                    onChange={() => togglePick(c.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-900">
                      {c.label ?? c.model}
                    </div>
                    <div className="font-mono text-xs text-zinc-600">
                      {c.provider} / {c.model}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Subcomponents
// ──────────────────────────────────────────────────────────────────

function UploadCard({
  file,
  previewUrl,
  onPickFile,
}: {
  file: File | null
  previewUrl: string | null
  onPickFile: (f: File | null) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  // Drag-and-drop wiring. preventDefault is required on dragenter +
  // dragover for the drop event to fire. We accept the first image
  // file from the drop payload and ignore the rest.
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragOver) setDragOver(true)
  }
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onPickFile(f)
  }

  return (
    <div
      className="rounded-lg border border-zinc-200 bg-white p-4"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Image
      </div>
      {!file ? (
        <label
          className={
            'flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed text-sm transition-colors ' +
            (dragOver
              ? 'border-zinc-700 bg-zinc-50 text-zinc-700'
              : 'border-zinc-300 text-zinc-500 hover:bg-zinc-50')
          }
        >
          <Upload className="h-5 w-5" />
          <span>{dragOver ? 'Drop to upload' : 'Drag-and-drop or click (≤15 MB)'}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <div
          className={
            'relative rounded ' + (dragOver ? 'outline outline-2 outline-zinc-700' : '')
          }
        >
          {previewUrl && (
            <img
              src={previewUrl}
              alt="preview"
              className="max-h-64 w-full rounded object-contain"
            />
          )}
          <button
            type="button"
            onClick={() => onPickFile(null)}
            className="absolute right-2 top-2 rounded bg-white/90 p-1 text-zinc-600 hover:bg-white"
            title="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mt-2 truncate text-xs text-zinc-500">
            {file.name} <span className="text-zinc-400">— drop another image to replace</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Results: equal-width side-by-side columns with aligned rows.
// ──────────────────────────────────────────────────────────────────

function ResultsGrid({
  results,
  catalog,
  priceDomain,
  imageUrl,
  file,
}: {
  results: RunResult[]
  catalog: CatalogRow[]
  priceDomain: { min: number; max: number } | null
  imageUrl: string | null
  file: File | null
}) {
  // Group by prompt_key so Pass-1 and Pass-2 render as separate side-
  // by-side strips when the operator picked "Both".
  const groups = useMemo(() => {
    const map = new Map<string, RunResult[]>()
    for (const r of results) {
      const k = r.prompt_key ?? 'unknown'
      const arr = map.get(k) ?? []
      arr.push(r)
      map.set(k, arr)
    }
    return Array.from(map.entries())
  }, [results])

  return (
    <div className="space-y-4">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Results
      </div>
      {groups.map(([promptKey, rows]) => (
        <ResultsStrip
          key={promptKey}
          promptKey={promptKey as PromptKey}
          rows={rows}
          catalog={catalog}
          priceDomain={priceDomain}
          imageUrl={imageUrl}
          file={file}
        />
      ))}
    </div>
  )
}

function ResultsStrip({
  promptKey,
  rows,
  catalog,
  priceDomain,
  imageUrl,
  file,
}: {
  promptKey: PromptKey | 'unknown'
  rows: RunResult[]
  catalog: CatalogRow[]
  priceDomain: { min: number; max: number } | null
  imageUrl: string | null
  file: File | null
}) {
  // Column width — fixed-ish so 5+ columns trigger horizontal scroll
  // while still keeping every column the same width as the others.
  // Up to 3 columns fit naturally on a wide screen.
  const colW = 'min-w-[280px]'
  const passLabel =
    promptKey === 'photo_bank_classify'
      ? 'Pass-1 classify'
      : promptKey === 'photo_cleanup'
      ? 'Pass-2 cleanup'
      : 'Result'

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-zinc-700">{passLabel}</div>
      <div className="overflow-x-auto">
        <div
          className="grid auto-cols-fr gap-3"
          style={{
            gridTemplateColumns: `repeat(${rows.length}, minmax(280px, 1fr))`,
            gridTemplateRows:
              'auto auto auto auto auto auto auto auto',
          }}
        >
          {/* Header row: provider/model + metrics */}
          {rows.map((r, i) => {
            const row = catalog.find((c) => c.provider === r.provider && c.model === r.model)
            const v = row ? avgPrice(row) : null
            const bg = heatmapBg(v, priceDomain)
            return (
              <div
                key={`h_${i}`}
                className="rounded-t border border-b-0 border-zinc-200 px-3 py-2 text-xs"
                style={bg ? { background: bg } : undefined}
              >
                <div className="font-medium text-zinc-900">
                  {row?.label ?? r.model}
                </div>
                <div className="font-mono text-zinc-700">
                  {r.provider} / {r.model}
                </div>
              </div>
            )
          })}

          {/* Image row — identical thumbnail in every column so rows
              below line up regardless of model output. */}
          {rows.map((_, i) => (
            <div key={`img_${i}`} className={`border-x border-zinc-200 ${colW}`}>
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={file?.name ?? 'photo'}
                  className="block h-32 w-full object-cover"
                />
              )}
            </div>
          ))}

          {/* Decision badge row (Pass-2 reads reject/keep; Pass-1
              shows status only). */}
          {rows.map((r, i) => (
            <div
              key={`badge_${i}`}
              className={`border-x border-zinc-200 px-3 py-2 ${colW}`}
            >
              <DecisionBadge result={r} promptKey={promptKey} />
            </div>
          ))}

          {/* Parsed/raw output row */}
          {rows.map((r, i) => (
            <div
              key={`out_${i}`}
              className={`border-x border-zinc-200 px-3 py-2 text-xs ${colW}`}
            >
              {r.ok ? (
                <ParsedOutput raw={r.output ?? ''} promptKey={promptKey} />
              ) : (
                <div className="whitespace-pre-wrap break-words rounded bg-rose-50 p-2 font-mono text-rose-800">
                  {r.error}
                </div>
              )}
            </div>
          ))}

          {/* Metrics row */}
          {rows.map((r, i) => {
            const row = catalog.find((c) => c.provider === r.provider && c.model === r.model)
            const cost = costFor1000Photos(
              r.tokens_in,
              r.tokens_out,
              coerceNum(row?.price_input_per_1m ?? null),
              coerceNum(row?.price_output_per_1m ?? null),
            )
            return (
              <div
                key={`m_${i}`}
                className={`flex flex-col gap-0.5 rounded-b border border-t-0 border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 ${colW}`}
              >
                <div>
                  <span className="text-zinc-500">Latency: </span>
                  {r.latency_ms} ms
                </div>
                <div>
                  <span className="text-zinc-500">Tokens: </span>
                  {r.tokens_in ?? '—'} in / {r.tokens_out ?? '—'} out
                </div>
                <div className="font-medium">
                  <span className="text-zinc-500 font-normal">Cost / 1k photos: </span>
                  {cost == null ? '—' : `$${cost.toFixed(2)}`}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Decision badge — surfaces reject/keep from Pass-2 prominently.
// ──────────────────────────────────────────────────────────────────

function DecisionBadge({
  result,
  promptKey,
}: {
  result: RunResult
  promptKey: PromptKey | 'unknown'
}) {
  if (!result.ok) {
    return (
      <span className="inline-block rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
        FAILED
      </span>
    )
  }
  const parsed = tryParseJson(result.output ?? '')
  if (promptKey === 'photo_cleanup') {
    // Pass-2 schema as defined in the prompt seed:
    //   { keep: true | false, reason: "..." }
    // Some earlier prompt revisions / model improvisations emit
    // { decision: "keep" | "reject" }, so we accept both shapes.
    const keepBool = parsed && typeof parsed.keep === 'boolean' ? parsed.keep : null
    const decision =
      parsed && typeof parsed.decision === 'string'
        ? parsed.decision.toLowerCase()
        : null
    const verdict: 'keep' | 'reject' | null =
      keepBool === true || decision === 'keep'
        ? 'keep'
        : keepBool === false || decision === 'reject'
        ? 'reject'
        : null
    if (verdict === 'reject') {
      return (
        <span className="inline-block rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
          REJECTED
        </span>
      )
    }
    if (verdict === 'keep') {
      return (
        <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
          KEPT
        </span>
      )
    }
    return (
      <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
        no decision parsed
      </span>
    )
  }
  return (
    <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
      OK
    </span>
  )
}

// ──────────────────────────────────────────────────────────────────
// Parsed output — renders well-known JSON fields as labelled blocks;
// falls back to raw text when parsing fails.
// ──────────────────────────────────────────────────────────────────

function ParsedOutput({
  raw,
  promptKey,
}: {
  raw: string
  promptKey: PromptKey | 'unknown'
}) {
  const parsed = tryParseJson(raw)
  if (!parsed) {
    return (
      <div className="whitespace-pre-wrap break-words rounded bg-zinc-50 p-2 font-mono text-zinc-800">
        {raw || <span className="italic text-zinc-400">(empty)</span>}
      </div>
    )
  }
  const desc = stringField(parsed, ['description', 'caption', 'summary'])
  const reason = stringField(parsed, ['reason', 'rationale', 'explanation'])
  const cats = arrayField(parsed, ['categories', 'category'])
  const tags = arrayField(parsed, ['tags', 'ai_tags'])
  const landmarks = arrayField(parsed, ['landmarks', 'ai_landmarks'])
  const quality = numberField(parsed, ['quality_score', 'quality', 'ai_quality_score'])
  const hero = boolField(parsed, ['is_hero_candidate', 'hero_candidate'])
  // v4-specific L1 fields
  const sceneType = stringField(parsed, ['scene_type'])
  const season = stringField(parsed, ['season'])
  const city = stringField(parsed, ['city'])
  const country = stringField(parsed, ['country'])

  // Track which fields we've consumed so any extras can be dumped
  // below as raw key/value pairs.
  const consumed = new Set([
    'description', 'caption', 'summary',
    'reason', 'rationale', 'explanation',
    'categories', 'category', 'tags', 'ai_tags',
    'landmarks', 'ai_landmarks',
    'quality_score', 'quality', 'ai_quality_score',
    'is_hero_candidate', 'hero_candidate',
    'scene_type', 'season', 'city', 'country',
    'decision', 'keep', // both forms of Pass-2 verdict — surfaced via the badge
  ])
  const extras = Object.entries(parsed).filter(([k]) => !consumed.has(k))

  // ── Pass-1 classify: render L1 (matcher signals) and L2 (shadow /
  //    fallback) as two visually separated blocks, matching the v4
  //    prompt's own tiering. Pass-2 cleanup falls through to the legacy
  //    layout below (description + reason + extras), which is what the
  //    operator already expects from the verdict-style output.
  if (promptKey === 'photo_bank_classify') {
    const hasL1 =
      sceneType != null ||
      season != null ||
      city != null ||
      country != null ||
      (landmarks && landmarks.length > 0) ||
      quality != null ||
      hero != null
    const hasL2 =
      desc != null || (cats && cats.length > 0) || (tags && tags.length > 0)
    return (
      <div className="space-y-2 text-zinc-800">
        {hasL1 && (
          <div className="space-y-2 rounded border border-sky-200 bg-sky-50 p-2">
            <div className="text-[10px] font-medium uppercase tracking-wider text-sky-700">
              L1 — matcher signals
            </div>
            {(sceneType || season) && (
              <div className="flex flex-wrap gap-2">
                {sceneType && (
                  <span className="inline-block rounded bg-white px-2 py-0.5 text-xs text-sky-800 ring-1 ring-sky-200">
                    scene: {sceneType}
                  </span>
                )}
                {season && (
                  <span className="inline-block rounded bg-white px-2 py-0.5 text-xs text-sky-800 ring-1 ring-sky-200">
                    season: {season}
                  </span>
                )}
              </div>
            )}
            {(city || country) && (
              <Field label="Place">
                <span className="text-xs">
                  {[city, country].filter(Boolean).join(', ')}
                </span>
              </Field>
            )}
            {landmarks && landmarks.length > 0 && (
              <Field label="Landmarks">
                <Chips items={landmarks} />
              </Field>
            )}
            {(quality != null || hero != null) && (
              <Field label="Quality">
                <div className="flex flex-wrap gap-2">
                  {quality != null && (
                    <span className="inline-block rounded bg-white px-2 py-0.5 text-xs ring-1 ring-sky-200">
                      score: {quality}
                    </span>
                  )}
                  {hero === true && (
                    <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      hero candidate
                    </span>
                  )}
                </div>
              </Field>
            )}
          </div>
        )}
        {hasL2 && (
          <div className="space-y-2 rounded border border-zinc-200 bg-zinc-50 p-2">
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              L2 — shadow / fallback
            </div>
            {desc && (
              <Field label="Description">
                <p className="leading-snug">{desc}</p>
              </Field>
            )}
            {cats && cats.length > 0 && (
              <Field label="Categories">
                <Chips items={cats} />
              </Field>
            )}
            {tags && tags.length > 0 && (
              <Field label="Tags">
                <Chips items={tags} />
              </Field>
            )}
          </div>
        )}
        {extras.length > 0 && (
          <Field label="Other fields">
            <dl className="space-y-1 text-xs">
              {extras.map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="font-medium text-zinc-600">{k}:</dt>
                  <dd className="text-zinc-800 break-words">{formatValue(v)}</dd>
                </div>
              ))}
            </dl>
          </Field>
        )}
      </div>
    )
  }

  // Pass-2 cleanup / unknown — legacy flat layout. The verdict badge
  // already surfaces keep/reject above this block; here we just show
  // the reason plus anything else the model decided to return.
  return (
    <div className="space-y-2 text-zinc-800">
      {desc && (
        <Field label="Description">
          <p className="leading-snug">{desc}</p>
        </Field>
      )}
      {promptKey === 'photo_cleanup' && reason && (
        <Field label="Reason">
          <p className="leading-snug">{reason}</p>
        </Field>
      )}
      {cats && cats.length > 0 && (
        <Field label="Categories">
          <Chips items={cats} />
        </Field>
      )}
      {tags && tags.length > 0 && (
        <Field label="Tags">
          <Chips items={tags} />
        </Field>
      )}
      {landmarks && landmarks.length > 0 && (
        <Field label="Landmarks">
          <Chips items={landmarks} />
        </Field>
      )}
      {(quality != null || hero != null) && (
        <Field label="Quality">
          <div className="flex flex-wrap gap-2">
            {quality != null && (
              <span className="inline-block rounded bg-zinc-100 px-2 py-0.5 text-xs">
                score: {quality}
              </span>
            )}
            {hero === true && (
              <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                hero candidate
              </span>
            )}
          </div>
        </Field>
      )}
      {extras.length > 0 && (
        <Field label="Other fields">
          <dl className="space-y-1 text-xs">
            {extras.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="font-medium text-zinc-600">{k}:</dt>
                <dd className="text-zinc-800 break-words">{formatValue(v)}</dd>
              </div>
            ))}
          </dl>
        </Field>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it, i) => (
        <span
          key={`${it}_${i}`}
          className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
        >
          {it}
        </span>
      ))}
    </div>
  )
}

// ── tiny helpers ─────────────────────────────────────────────────

function stringField(o: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

function arrayField(o: Record<string, unknown>, keys: string[]): string[] | null {
  for (const k of keys) {
    const v = o[k]
    if (Array.isArray(v)) {
      const arr = v.map((x) => (typeof x === 'string' ? x : String(x))).filter(Boolean)
      if (arr.length > 0) return arr
    }
    // Sometimes a stringified list is returned — split on commas.
    if (typeof v === 'string' && v.trim()) {
      const arr = v.split(',').map((s) => s.trim()).filter(Boolean)
      if (arr.length > 0) return arr
    }
  }
  return null
}

function numberField(o: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      if (Number.isFinite(n)) return n
    }
  }
  return null
}

function boolField(o: Record<string, unknown>, keys: string[]): boolean | null {
  for (const k of keys) {
    const v = o[k]
    if (typeof v === 'boolean') return v
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase()
      if (s === 'true') return true
      if (s === 'false') return false
    }
  }
  return null
}

function formatValue(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}
