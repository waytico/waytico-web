'use client'

/**
 * Admin AI log — recent ai_call_log rows for debug / replay oversight.
 *
 * GET /api/admin/ai-log returns the most recent rows (filtered by
 * role/status/projectId/limit). Rows are compact by default; clicking
 * a row reveals the long fields (user_input, output, tool_calls plus
 * IDs and prompt metadata). Cleanup button triggers
 * POST /api/admin/ai-log/cleanup with a confirm.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

// Hardcoded role list (matches src/services/ai/types.ts ROLES). Kept
// local so this page doesn't need an extra round-trip to /api/admin/models.
const ROLES = [
  'briefing',
  'pipeline_hero',
  'pipeline_days',
  'pipeline_overview',
  'pipeline_section_subtitles',
  'pipeline_accommodations',
  'pipeline_validate',
  'pipeline_what_to_bring',
  'pipeline_tasks',
  'pipeline_signal_extractor',
  'trip_editor',
  'document_parser',
  'photo_classifier',
  'photo_cleanup',
  'showcase_chat',
  'eval_judge',
]

const STATUS_OPTIONS = ['', 'ok', 'retry', 'failed', 'parse_error']
const LIMIT_OPTIONS = [25, 50, 100, 200]
const MAX_FIELD = 4000

interface AiLogRow {
  id: string
  created_at: string
  role: string | null
  provider: string | null
  model: string | null
  prompt_key: string | null
  prompt_version: number | null
  system_prompt_hash: string | null
  user_input: string | null
  output: string | null
  tool_calls: unknown
  tokens_in: number | null
  tokens_out: number | null
  latency_ms: number | null
  status: string | null
  attempt: number | null
  error_message: string | null
  project_id: string | null
  user_id: string | null
  session_id: string | null
  correlation_id: string | null
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

function truncate(s: string, max = MAX_FIELD): string {
  if (s.length <= max) return s
  return s.slice(0, max) + '…'
}

function statusPill(status: string | null): string {
  if (status === 'ok') return 'bg-emerald-100 text-emerald-800'
  if (status === 'retry') return 'bg-amber-100 text-amber-800'
  if (status === 'failed' || status === 'parse_error')
    return 'bg-rose-100 text-rose-800'
  return 'bg-zinc-100 text-zinc-600'
}

export default function AdminAiLogPage() {
  const { getToken } = useAuth()
  const [rows, setRows] = useState<AiLogRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [projectId, setProjectId] = useState('')
  const [limit, setLimit] = useState(50)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [cleaning, setCleaning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken().catch(() => null)
      const params = new URLSearchParams()
      if (roleFilter) params.set('role', roleFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (projectId.trim()) params.set('projectId', projectId.trim())
      params.set('limit', String(limit))
      const res = await fetch(
        `${API_URL}/api/admin/ai-log?${params.toString()}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        },
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { rows: AiLogRow[] }
      setRows(j.rows)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [getToken, roleFilter, statusFilter, projectId, limit])

  useEffect(() => {
    load()
    // intentionally only on first render; filter changes go through Apply
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const runCleanup = useCallback(async () => {
    const ok = window.confirm(
      'Run AI log cleanup now? This will delete old rows according to the configured retention/size caps.',
    )
    if (!ok) return
    setCleaning(true)
    try {
      const token = await getToken().catch(() => null)
      const res = await fetch(`${API_URL}/api/admin/ai-log/cleanup`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
      }
      toast.success(`Cleanup ran: ${JSON.stringify(j)}`)
      await load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Cleanup failed'
      toast.error(`Cleanup failed: ${msg}`)
    } finally {
      setCleaning(false)
    }
  }, [getToken, load])

  if (loading && !rows) {
    return (
      <div className="flex items-center justify-center rounded border border-zinc-200 bg-white py-16 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm">Loading AI log…</span>
      </div>
    )
  }

  if (error && !rows) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Failed to load AI log: {error}
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
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-medium text-zinc-900">AI log</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runCleanup}
            disabled={cleaning}
            className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {cleaning && <Loader2 className="h-3 w-3 animate-spin" />}
            Run cleanup
          </button>
          <button
            type="button"
            onClick={load}
            className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-1 text-xs text-zinc-600">
            Role
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
            >
              <option value="">(All)</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1 text-xs text-zinc-600">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === '' ? '(All)' : s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1 text-xs text-zinc-600">
            Project ID
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="UUID"
              className="w-72 rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs"
            />
          </label>

          <label className="flex items-center gap-1 text-xs text-zinc-600">
            Limit
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={load}
            className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Apply
          </button>

          <span className="ml-auto text-xs text-zinc-500">
            {rows?.length ?? 0} rows
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        {!rows || rows.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">No log entries.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2 text-left font-normal">Time</th>
                <th className="px-3 py-2 text-left font-normal">Role</th>
                <th className="px-3 py-2 text-left font-normal">Status</th>
                <th className="px-3 py-2 text-left font-normal">
                  Provider · Model
                </th>
                <th className="px-3 py-2 text-right font-normal">
                  Tokens (in/out)
                </th>
                <th className="px-3 py-2 text-right font-normal">Latency</th>
                <th className="px-3 py-2 text-left font-normal">Project</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => {
                const isOpen = expanded.has(r.id)
                return (
                  <ExpandableRow
                    key={r.id}
                    r={r}
                    isOpen={isOpen}
                    onToggle={() => toggle(r.id)}
                  />
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function ExpandableRow({
  r,
  isOpen,
  onToggle,
}: {
  r: AiLogRow
  isOpen: boolean
  onToggle: () => void
}) {
  const projectShort = r.project_id ? r.project_id.slice(0, 8) : '—'
  const toolCalls =
    r.tool_calls === null || r.tool_calls === undefined
      ? null
      : JSON.stringify(r.tool_calls, null, 2)
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-zinc-50"
      >
        <td
          className="px-3 py-2 text-xs text-zinc-700"
          title={r.created_at}
        >
          {fmtRelative(r.created_at)}
        </td>
        <td className="px-3 py-2 font-mono text-xs text-zinc-900">
          {r.role || '—'}
        </td>
        <td className="px-3 py-2">
          <span
            className={
              'inline-block rounded-full px-2 py-0.5 text-xs ' +
              statusPill(r.status)
            }
          >
            {r.status || '—'}
          </span>
          {r.attempt && r.attempt > 1 && (
            <span className="ml-1 text-[10px] text-zinc-500">
              att {r.attempt}
            </span>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-zinc-700">
          <span className="text-zinc-500">{r.provider || '—'}</span>
          {' · '}
          <span className="font-mono">{r.model || '—'}</span>
        </td>
        <td className="px-3 py-2 text-right text-xs tabular-nums text-zinc-700">
          {(r.tokens_in ?? 0)} / {(r.tokens_out ?? 0)}
        </td>
        <td className="px-3 py-2 text-right text-xs tabular-nums text-zinc-700">
          {r.latency_ms != null ? `${r.latency_ms}ms` : '—'}
        </td>
        <td className="px-3 py-2 font-mono text-xs text-zinc-600">
          {projectShort}
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-zinc-50">
          <td colSpan={7} className="px-3 py-3">
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                <DetailField label="prompt_key" value={r.prompt_key} />
                <DetailField
                  label="prompt_version"
                  value={r.prompt_version}
                />
                <DetailField
                  label="system_prompt_hash"
                  value={r.system_prompt_hash}
                  mono
                />
                <DetailField
                  label="correlation_id"
                  value={r.correlation_id}
                  mono
                />
                <DetailField label="attempt" value={r.attempt} />
                <DetailField label="session_id" value={r.session_id} mono />
                <DetailField label="user_id" value={r.user_id} mono />
                <DetailField label="project_id" value={r.project_id} mono />
              </div>

              {r.error_message && (
                <div className="rounded border border-rose-300 bg-rose-50 p-2 text-xs text-rose-800">
                  <div className="font-medium">error_message</div>
                  <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px]">
                    {r.error_message}
                  </pre>
                </div>
              )}

              <LongField label="user_input" value={r.user_input} />
              <LongField label="output" value={r.output} />
              {toolCalls && (
                <LongField label="tool_calls" value={toolCalls} />
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string
  value: string | number | null | undefined
  mono?: boolean
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div
        className={
          'break-all text-zinc-800 ' + (mono ? 'font-mono text-[11px]' : '')
        }
      >
        {value === null || value === undefined || value === '' ? '—' : value}
      </div>
    </div>
  )
}

function LongField({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <pre className="mt-1 max-h-96 overflow-auto rounded border border-zinc-200 bg-white p-2 font-mono text-[11px] leading-relaxed text-zinc-800">
        {truncate(value)}
      </pre>
    </div>
  )
}
