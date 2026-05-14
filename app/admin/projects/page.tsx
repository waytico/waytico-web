'use client'

/**
 * Admin Projects — cross-operator trip list with restore action.
 *
 * GET /api/admin/projects with optional status / include_deleted /
 * limit query params; client-side search across title / slug /
 * owner_*. Restore button (POST /api/admin/projects/:id/restore) shown
 * only for soft-deleted rows.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { NotifyToggle } from '../_components/notify-toggle'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'


interface AdminProject {
  id: string
  slug: string | null
  title: string | null
  status: string | null
  region: string | null
  country: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  viewed_first_time_at: string | null
  activated_at: string | null
  owner_id: string | null
  owner_email: string | null
  owner_name: string | null
  owner_business_name: string | null
}

const STATUS_OPTIONS = ['', 'draft', 'quoted', 'active', 'completed', 'archived']
const LIMIT_OPTIONS = [100, 200, 500, 1000]

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function statusPill(status: string | null, deleted: boolean): string {
  let base = 'bg-zinc-100 text-zinc-700'
  if (status === 'draft' || status === 'quoted')
    base = 'bg-amber-100 text-amber-800'
  else if (status === 'active') base = 'bg-emerald-100 text-emerald-800'
  else if (status === 'archived')
    base = 'bg-zinc-200 text-zinc-500 line-through'
  return base + (deleted ? ' opacity-60' : '')
}

function ownerLabel(p: AdminProject): string {
  return (
    p.owner_business_name ||
    p.owner_name ||
    p.owner_email ||
    '—'
  )
}

function titleLabel(p: AdminProject): string {
  return p.title || p.slug || p.id.slice(0, 8)
}

export default function AdminProjectsPage() {
  const { getToken } = useAuth()
  const [projects, setProjects] = useState<AdminProject[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [limit, setLimit] = useState<number>(200)
  const [search, setSearch] = useState('')
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken().catch(() => null)
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (includeDeleted) params.set('include_deleted', '1')
      params.set('limit', String(limit))
      const res = await fetch(
        `${API_URL}/api/admin/projects?${params.toString()}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        },
      )
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { projects: AdminProject[] }
      setProjects(j.projects)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [getToken, statusFilter, includeDeleted, limit])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!projects) return []
    const q = search.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) => {
      const hay = [
        p.title,
        p.slug,
        p.owner_email,
        p.owner_name,
        p.owner_business_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [projects, search])

  const doRestore = useCallback(
    async (p: AdminProject) => {
      const ok = window.confirm(
        `Restore "${titleLabel(p)}"? It will reappear in the operator's list.`,
      )
      if (!ok) return
      setRestoringId(p.id)
      try {
        const token = await getToken().catch(() => null)
        const res = await fetch(
          `${API_URL}/api/admin/projects/${p.id}/restore`,
          {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        )
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
        }
        toast.success('Restored.')
        await load()
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Restore failed'
        toast.error(`Restore failed: ${msg}`)
      } finally {
        setRestoringId(null)
      }
    },
    [getToken, load],
  )

  if (loading && !projects) {
    return (
      <div className="flex items-center justify-center rounded border border-zinc-200 bg-white py-16 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm">Loading projects…</span>
      </div>
    )
  }

  if (error && !projects) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Failed to load projects: {error}
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
        <h1 className="text-xl font-medium text-zinc-900">Projects</h1>
        <div className="flex items-center gap-4">
          <NotifyToggle
            field="newDraft"
            label="Notify admin in Telegram on new draft"
          />
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
            <input
              type="checkbox"
              checked={includeDeleted}
              onChange={(e) => setIncludeDeleted(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Include deleted
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

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, slug, owner…"
            className="w-full max-w-xs rounded border border-zinc-300 bg-white px-3 py-1 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
          />

          <button
            type="button"
            onClick={load}
            className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Apply
          </button>

          <span className="ml-auto text-xs text-zinc-500">
            {filtered.length} of {projects?.length ?? 0}
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">No projects match.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-2 text-left font-normal">Title</th>
                <th className="px-4 py-2 text-left font-normal">Status</th>
                <th className="px-4 py-2 text-left font-normal">Owner</th>
                <th className="px-4 py-2 text-left font-normal">Country</th>
                <th className="px-4 py-2 text-right font-normal">Created</th>
                <th className="px-4 py-2 text-right font-normal">Activated</th>
                <th className="px-4 py-2 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((p) => {
                const deleted = !!p.deleted_at
                return (
                  <tr key={p.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-zinc-900">
                        {titleLabel(p)}
                      </div>
                      {p.slug && p.title && (
                        <div className="text-xs text-zinc-500">{p.slug}</div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          'inline-block rounded-full px-2 py-0.5 text-xs ' +
                          statusPill(p.status, deleted)
                        }
                      >
                        {p.status || '—'}
                      </span>
                      {deleted && (
                        <span className="ml-1 text-xs text-rose-600">
                          (deleted)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-zinc-900">{ownerLabel(p)}</td>
                    <td className="px-4 py-2 text-zinc-700">
                      {p.country || p.region || '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-zinc-500">
                      {fmtDate(p.created_at)}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-zinc-500">
                      {fmtDate(p.activated_at)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.slug && (
                          <a
                            href={`https://waytico.com/t/${p.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                          >
                            Open
                          </a>
                        )}
                        {deleted && (
                          <button
                            type="button"
                            onClick={() => doRestore(p)}
                            disabled={restoringId === p.id}
                            className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                          >
                            {restoringId === p.id && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
