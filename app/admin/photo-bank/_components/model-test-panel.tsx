'use client'

/**
 * Photo Bank → Model test panel.
 *
 * Operator workflow:
 *   1. Upload one image (file input or drag-and-drop)
 *   2. Pick which prompt to run: Pass-1 classify, Pass-2 cleanup, or both
 *   3. Tick up to 8 models from the catalog (only vision-capable
 *      enabled rows show up)
 *   4. Run → server fires all calls in parallel → results render
 *      side-by-side as cards: provider, model, latency, tokens, raw
 *      output text (or error)
 *
 * The image is held in memory only — never written to S3 or DB.
 * Costs aren't shown here intentionally — operator sees tokens_in /
 * tokens_out and converts using current provider rates.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import type { AuthedFetch } from '@/hooks/use-admin-photo-review'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

const MAX_PICK = 8

type PromptKey = 'photo_bank_classify' | 'photo_cleanup'
type RunMode = PromptKey | 'both'

interface CatalogRow {
  id: string
  provider: string
  model: string
  label: string | null
  enabled: boolean
  sort_order: number
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

export function ModelTestPanel({ authedFetch }: { authedFetch: AuthedFetch }) {
  const [catalog, setCatalog] = useState<CatalogRow[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mode, setMode] = useState<RunMode>('photo_bank_classify')
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<RunResult[] | null>(null)

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

  const togglePick = useCallback(
    (id: string) => {
      setPicked((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else {
          if (next.size >= MAX_PICK) {
            toast.error(`At most ${MAX_PICK} models per run`)
            return prev
          }
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
      const passes: PromptKey[] =
        mode === 'both' ? ['photo_bank_classify', 'photo_cleanup'] : [mode]

      const aggregated: RunResult[] = []
      for (const pk of passes) {
        const fd = new FormData()
        fd.append('image', file)
        fd.append('prompt_key', pk)
        fd.append(
          'models',
          JSON.stringify(pickedRows.map((r) => ({ provider: r.provider, model: r.model }))),
        )
        const res = await authedFetch(`${API_URL}/api/admin/photo-bank/model-test`, {
          method: 'POST',
          body: fd,
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(
            (j as { error?: string }).error || `HTTP ${res.status} on ${pk}`,
          )
        }
        const r = (j as { results: RunResult[] }).results
        for (const row of r) aggregated.push({ ...row, prompt_key: pk })
      }
      setResults(aggregated)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Run failed')
    } finally {
      setRunning(false)
    }
  }, [authedFetch, file, mode, picked, visionModels])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium text-zinc-700">Model test</h2>
        <p className="text-xs text-zinc-500">
          Run one image through several vision models side-by-side. Image is
          held in memory only — nothing is stored.
        </p>
      </div>

      {/* ── Input row: image + prompt mode ──────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Image
          </div>
          {previewUrl ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="preview"
                className="max-h-64 w-full rounded object-contain"
              />
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>
                  {file?.name} — {Math.round((file?.size ?? 0) / 1024)} KB
                </span>
                <button
                  type="button"
                  onClick={() => onPickFile(null)}
                  className="flex items-center gap-1 text-zinc-500 hover:text-rose-600"
                >
                  <X className="h-3 w-3" /> remove
                </button>
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-zinc-300 px-4 py-10 text-xs text-zinc-500 hover:bg-zinc-50">
              <Upload className="h-4 w-4" />
              Click to pick an image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Run mode
          </div>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                checked={mode === 'photo_bank_classify'}
                onChange={() => setMode('photo_bank_classify')}
              />
              Pass-1: classify
              <span className="text-xs text-zinc-500">— tags, landmarks, quality, description</span>
            </label>
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
                checked={mode === 'both'}
                onChange={() => setMode('both')}
              />
              Both passes
              <span className="text-xs text-zinc-500">— runs each model twice</span>
            </label>
          </div>
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

      {/* ── Model picker ───────────────────────────────────────── */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Models <span className="text-zinc-400">(catalog order)</span>
          </div>
          <span className="text-xs text-zinc-500">
            {picked.size}/{MAX_PICK} picked
          </span>
        </div>
        {!catalog ? (
          <div className="py-6 text-center text-sm text-zinc-500">
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          </div>
        ) : visionModels.length === 0 ? (
          <div className="py-6 text-center text-sm text-zinc-500">
            No vision-capable models in the catalog. Add some on /admin/models.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visionModels.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-start gap-2 rounded border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
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
                  <div className="font-mono text-xs text-zinc-500">
                    {c.provider} / {c.model}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ── Results ─────────────────────────────────────────────── */}
      {results !== null && (
        <div className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Results
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {results.map((r, idx) => (
              <article
                key={`${r.provider}_${r.model}_${r.prompt_key}_${idx}`}
                className={
                  'rounded-lg border bg-white p-3 ' +
                  (r.ok ? 'border-zinc-200' : 'border-rose-300 bg-rose-50')
                }
              >
                <header className="mb-2 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium text-zinc-900">
                      {r.provider} / {r.model}
                    </div>
                    {r.prompt_key && (
                      <div className="text-zinc-500">
                        {r.prompt_key === 'photo_bank_classify'
                          ? 'Pass-1 classify'
                          : 'Pass-2 cleanup'}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-zinc-500">
                    <div>{r.latency_ms} ms</div>
                    <div>
                      {r.tokens_in ?? '—'} in / {r.tokens_out ?? '—'} out
                    </div>
                  </div>
                </header>
                {r.ok ? (
                  <pre className="whitespace-pre-wrap break-words rounded bg-zinc-50 p-2 font-mono text-xs text-zinc-800">
                    {r.output}
                  </pre>
                ) : (
                  <pre className="whitespace-pre-wrap break-words rounded bg-white p-2 font-mono text-xs text-rose-800">
                    {r.error}
                  </pre>
                )}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
