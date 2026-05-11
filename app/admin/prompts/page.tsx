'use client'

/**
 * Admin Prompts — list + inline editor for config_prompts.
 *
 * Two-column layout: left rail with prompt keys, right pane with the
 * selected prompt's description (single-line input) and prompt_text
 * (mono textarea, autoresize-by-content). Save sends a PATCH and
 * updates the row in place; Reset reverts to last-loaded values
 * without a network round-trip.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

interface PromptRow {
  key: string
  version: number
  prompt_text: string
  description: string | null
  is_active: boolean
  updated_at: string
}

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffSec = Math.max(0, Math.floor((now - then) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  const m = Math.floor(diffSec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export default function AdminPromptsPage() {
  const { getToken } = useAuth()
  const [prompts, setPrompts] = useState<PromptRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken().catch(() => null)
      const res = await fetch(`${API_URL}/api/admin/prompts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { prompts: PromptRow[] }
      setPrompts(j.prompts)
      setActiveKey((prev) => prev ?? j.prompts[0]?.key ?? null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  const active = useMemo(() => {
    if (!prompts || !activeKey) return null
    return prompts.find((p) => p.key === activeKey) ?? null
  }, [prompts, activeKey])

  // Reset drafts when active prompt changes.
  useEffect(() => {
    if (active) {
      setDraftText(active.prompt_text)
      setDraftDescription(active.description ?? '')
      setSaveError(null)
    } else {
      setDraftText('')
      setDraftDescription('')
    }
  }, [active])

  const dirty = useMemo(() => {
    if (!active) return false
    return (
      draftText !== active.prompt_text ||
      draftDescription !== (active.description ?? '')
    )
  }, [active, draftText, draftDescription])

  const save = useCallback(async () => {
    if (!active) return
    setSaving(true)
    setSaveError(null)
    try {
      const token = await getToken().catch(() => null)
      const res = await fetch(
        `${API_URL}/api/admin/prompts/${encodeURIComponent(active.key)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            content: draftText,
            description: draftDescription || null,
          }),
        },
      )
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
      }
      const updated = (j as { prompt: PromptRow }).prompt
      setPrompts((prev) =>
        prev
          ? prev.map((p) =>
              p.key === updated.key ? { ...p, ...updated } : p,
            )
          : prev,
      )
      toast.success(`Saved ${active.key}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Save failed'
      setSaveError(msg)
      toast.error(`Save failed: ${msg}`)
    } finally {
      setSaving(false)
    }
  }, [active, draftText, draftDescription, getToken])

  const reset = useCallback(() => {
    if (!active) return
    setDraftText(active.prompt_text)
    setDraftDescription(active.description ?? '')
    setSaveError(null)
  }, [active])

  if (loading && !prompts) {
    return (
      <div className="flex items-center justify-center rounded border border-zinc-200 bg-white py-16 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm">Loading prompts…</span>
      </div>
    )
  }

  if (error && !prompts) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Failed to load prompts: {error}
        <button
          type="button"
          onClick={load}
          className="ml-3 rounded border border-amber-400 bg-white px-2 py-0.5 text-xs"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-zinc-900">Prompts</h1>
        <button
          type="button"
          onClick={load}
          className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </header>

      <div className="flex flex-col gap-4 md:flex-row">
        <aside className="md:w-64 shrink-0 rounded-lg border border-zinc-200 bg-white">
          <ul className="divide-y divide-zinc-100">
            {prompts && prompts.length === 0 && (
              <li className="p-4 text-sm text-zinc-500">No prompts.</li>
            )}
            {prompts?.map((p) => {
              const isActive = p.key === activeKey
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    onClick={() => setActiveKey(p.key)}
                    className={
                      'w-full px-3 py-2 text-left transition-colors ' +
                      (isActive
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-700 hover:bg-zinc-100')
                    }
                  >
                    <div className="font-mono text-xs">{p.key}</div>
                    <div
                      className={
                        'text-[11px] ' +
                        (isActive ? 'text-zinc-300' : 'text-zinc-500')
                      }
                    >
                      v{p.version} · {fmtRelative(p.updated_at)}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        <section className="flex-1 rounded-lg border border-zinc-200 bg-white p-4">
          {!active ? (
            <p className="text-sm text-zinc-500">Select a prompt.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-mono text-sm text-zinc-900">
                    {active.key}
                  </div>
                  <div className="text-xs text-zinc-500">
                    v{active.version} · updated {fmtRelative(active.updated_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={reset}
                    disabled={!dirty || saving}
                    className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={!dirty || saving}
                    className="inline-flex items-center gap-1 rounded bg-zinc-900 px-3 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                    Save
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="text-xs text-zinc-500">Description</span>
                <input
                  type="text"
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs text-zinc-500">Prompt text</span>
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  rows={Math.max(20, Math.ceil(draftText.length / 80))}
                  className="mt-1 min-h-[400px] w-full rounded border border-zinc-300 bg-white p-3 font-mono text-xs leading-relaxed focus:border-zinc-500 focus:outline-none"
                  spellCheck={false}
                />
              </label>

              {saveError && (
                <div className="rounded border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800">
                  {saveError}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
