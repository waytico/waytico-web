'use client'

/**
 * Admin Models — per-role provider/model config editor.
 *
 * GET /api/admin/models returns { rows, roles, providers }. We render
 * one row per role in `roles[]` (filling fields from `rows[]` when
 * the role is configured, otherwise leaving them empty). PATCH per
 * row — no bulk save. Cache is invalidated server-side after a
 * successful save, so a fresh getModelConfig call picks the new value
 * up immediately.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

interface ModelRow {
  role: string
  provider: string
  model: string
  temperature: number | string | null
  max_tokens: number | null
  updated_at: string | null
}

interface ModelsResponse {
  rows: ModelRow[]
  roles: string[]
  providers: string[]
}

interface RowDraft {
  provider: string
  model: string
  temperature: string
  maxTokens: string
  saving: boolean
  error: string | null
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

function tempToString(t: number | string | null): string {
  if (t === null || t === undefined || t === '') return ''
  return String(t)
}

function numToString(n: number | null | undefined): string {
  if (n === null || n === undefined) return ''
  return String(n)
}

export default function AdminModelsPage() {
  const { getToken } = useAuth()
  const [data, setData] = useState<ModelsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken().catch(() => null)
      const res = await fetch(`${API_URL}/api/admin/models`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
      }
      const j = (await res.json()) as ModelsResponse
      setData(j)
      // Initialise drafts from rows (configured roles only — un-configured rows render with placeholders).
      const next: Record<string, RowDraft> = {}
      for (const r of j.rows) {
        next[r.role] = {
          provider: r.provider,
          model: r.model,
          temperature: tempToString(r.temperature),
          maxTokens: numToString(r.max_tokens),
          saving: false,
          error: null,
        }
      }
      setDrafts(next)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  const rowMap = useMemo(() => {
    const m = new Map<string, ModelRow>()
    if (data) for (const r of data.rows) m.set(r.role, r)
    return m
  }, [data])

  const getDraft = useCallback(
    (role: string): RowDraft => {
      return (
        drafts[role] ?? {
          provider: '',
          model: '',
          temperature: '',
          maxTokens: '',
          saving: false,
          error: null,
        }
      )
    },
    [drafts],
  )

  const setDraftField = useCallback(
    (role: string, patch: Partial<RowDraft>) => {
      setDrafts((prev) => ({
        ...prev,
        [role]: { ...getDraft(role), ...patch },
      }))
    },
    [getDraft],
  )

  const isDirty = useCallback(
    (role: string): boolean => {
      const d = getDraft(role)
      const r = rowMap.get(role)
      if (!r) {
        // Un-configured: dirty when anything is filled in.
        return (
          d.provider !== '' ||
          d.model !== '' ||
          d.temperature !== '' ||
          d.maxTokens !== ''
        )
      }
      return (
        d.provider !== r.provider ||
        d.model !== r.model ||
        d.temperature !== tempToString(r.temperature) ||
        d.maxTokens !== numToString(r.max_tokens)
      )
    },
    [getDraft, rowMap],
  )

  const save = useCallback(
    async (role: string) => {
      const d = getDraft(role)
      if (!d.provider) {
        setDraftField(role, { error: 'Provider is required' })
        return
      }
      if (!d.model.trim()) {
        setDraftField(role, { error: 'Model is required' })
        return
      }
      setDraftField(role, { saving: true, error: null })
      try {
        const token = await getToken().catch(() => null)
        const body: Record<string, unknown> = {
          provider: d.provider,
          model: d.model.trim(),
          temperature:
            d.temperature.trim() === '' ? null : Number(d.temperature),
          maxTokens:
            d.maxTokens.trim() === '' ? null : Number(d.maxTokens),
        }
        const res = await fetch(
          `${API_URL}/api/admin/models/${encodeURIComponent(role)}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(body),
          },
        )
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
        }
        const updated = (j as { row: ModelRow }).row
        setData((prev) => {
          if (!prev) return prev
          const rows = [...prev.rows]
          const idx = rows.findIndex((r) => r.role === updated.role)
          if (idx >= 0) rows[idx] = updated
          else rows.push(updated)
          return { ...prev, rows }
        })
        setDraftField(role, {
          provider: updated.provider,
          model: updated.model,
          temperature: tempToString(updated.temperature),
          maxTokens: numToString(updated.max_tokens),
          saving: false,
          error: null,
        })
        toast.success(`Saved ${role}`)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Save failed'
        setDraftField(role, { saving: false, error: msg })
      }
    },
    [getDraft, getToken, setDraftField],
  )

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center rounded border border-zinc-200 bg-white py-16 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm">Loading models…</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Failed to load models: {error}
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

  if (!data) return null

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-zinc-900">Models</h1>
        <button
          type="button"
          onClick={load}
          className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </header>

      <p className="text-xs text-zinc-500">
        One row per role. Changes apply within 5 minutes (cache TTL) without
        redeploy. The row&apos;s provider must have its API key in ENV.
      </p>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2 text-left font-normal">Role</th>
              <th className="px-3 py-2 text-left font-normal">Provider</th>
              <th className="px-3 py-2 text-left font-normal">Model</th>
              <th className="px-3 py-2 text-left font-normal">Temp</th>
              <th className="px-3 py-2 text-left font-normal">Max tokens</th>
              <th className="px-3 py-2 text-right font-normal">Updated</th>
              <th className="px-3 py-2 text-right font-normal">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {data.roles.map((role) => {
              const row = rowMap.get(role)
              const d = getDraft(role)
              const dirty = isDirty(role)
              return (
                <tr key={role} className="align-top">
                  <td className="px-3 py-2 font-mono text-xs text-zinc-900">
                    {role}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={d.provider}
                      onChange={(e) =>
                        setDraftField(role, { provider: e.target.value })
                      }
                      className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
                    >
                      <option value="">{row ? '—' : '(not set)'}</option>
                      {data.providers.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={d.model}
                      onChange={(e) =>
                        setDraftField(role, { model: e.target.value })
                      }
                      className="w-56 rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={2}
                      value={d.temperature}
                      onChange={(e) =>
                        setDraftField(role, { temperature: e.target.value })
                      }
                      className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={d.maxTokens}
                      onChange={(e) =>
                        setDraftField(role, { maxTokens: e.target.value })
                      }
                      className="w-24 rounded border border-zinc-300 bg-white px-2 py-1 text-sm tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-zinc-500">
                    {fmtRelative(row?.updated_at)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => save(role)}
                      disabled={!dirty || d.saving}
                      className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      {d.saving && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      Save
                    </button>
                    {d.error && (
                      <div className="mt-1 text-xs text-rose-700">
                        {d.error}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
