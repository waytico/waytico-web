'use client'

/**
 * Admin Models page.
 *
 * TOP — Per-role configuration. One row per role. Auto-saves on field
 * blur / select change. No Save button, no Refresh, no Updated column.
 * Model is a real <select> (not a datalist) whose options are pulled
 * from the catalog, filtered to the currently chosen provider and to
 * non-archived enabled rows only.
 *
 * BOTTOM — AI model catalog. Drag-to-reorder list of all (provider,
 * model) pairs the platform knows about. Each row has a single Enabled
 * toggle (hide/show in pickers) and an Archive button (moves the row
 * to a separate archive section — hard delete is intentionally not
 * exposed because historical ai_call_log entries still reference the
 * pair). Columns are sortable; the price column is heat-mapped from
 * green (cheapest) to red (most expensive) so the operator can scan
 * cost at a glance.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { GripVertical, Loader2, Archive, RotateCcw, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

const DEFAULT_MAX_TOKENS = 2000

/**
 * Human-readable labels and grouping for the role table.
 *
 * Source of truth for roles is `config_ai_models` on the backend (returned
 * via /api/admin/models as `roles: string[]`). The map below is purely
 * presentational. If the backend adds a new role not listed here, it falls
 * through to the "Other" group with the raw role string as its label —
 * no UI breakage, just a missing nice name.
 */
const ROLE_LABELS: Record<string, string> = {
  // Trip Creation
  briefing: 'Briefing chat',
  pipeline_hero: 'Hero block',
  pipeline_days: 'Itinerary days',
  pipeline_accommodations: 'Accommodations',
  pipeline_overview: 'Trip overview',
  pipeline_section_subtitles: 'Section subtitles',
  pipeline_validate: 'Plan validation',
  pipeline_signal_extractor: 'Photo signal extractor',
  // Trip Editing & Activation
  trip_editor: 'AI trip editor',
  pipeline_what_to_bring: 'What to bring (dormant)',
  pipeline_tasks: 'Prep tasks (dormant)',
  // Document Parsing
  document_parser: 'Document parser',
  // Photo Bank
  photo_target_countries: 'Country targets (Pass 1)',
  photo_target_locations: 'Location targets (Pass 2)',
  photo_classifier: 'Photo classifier (Pass 1)',
  photo_cleanup: 'Photo cleanup (Pass 2)',
  // Internal
  showcase_chat: 'Showcase demo chat',
  eval_judge: 'Eval judge',
}

const ROLE_GROUPS: { title: string; roles: string[] }[] = [
  {
    title: 'Trip Creation',
    roles: [
      'briefing',
      'pipeline_hero',
      'pipeline_days',
      'pipeline_accommodations',
      'pipeline_overview',
      'pipeline_section_subtitles',
      'pipeline_validate',
      'pipeline_signal_extractor',
    ],
  },
  {
    title: 'Trip Editing & Activation',
    roles: ['trip_editor', 'pipeline_what_to_bring', 'pipeline_tasks'],
  },
  {
    title: 'Document Parsing',
    roles: ['document_parser'],
  },
  {
    title: 'Photo Bank',
    roles: [
      'photo_target_countries',
      'photo_target_locations',
      'photo_classifier',
      'photo_cleanup',
    ],
  },
  {
    title: 'Internal',
    roles: ['showcase_chat', 'eval_judge'],
  },
]

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

interface CatalogRow {
  id: string
  provider: string
  model: string
  label: string | null
  enabled: boolean
  sort_order: number
  notes: string | null
  price_input_per_1m: number | null
  price_output_per_1m: number | null
  archived: boolean
  archived_at: string | null
  created_at: string
  updated_at: string
}

interface RowDraft {
  provider: string
  model: string
  temperature: string
  maxTokens: string
  saving: boolean
  error: string | null
}

function tempToString(t: number | string | null): string {
  if (t === null || t === undefined || t === '') return ''
  return String(t)
}

function numToString(n: number | null | undefined): string {
  if (n === null || n === undefined) return ''
  return String(n)
}

function fmtPrice(n: number | string | null | undefined): string {
  // node-pg can return NUMERIC as a string. Coerce defensively so a
  // single typed-as-number value being a string at runtime doesn't
  // crash the whole page via `.toFixed is not a function`.
  if (n === null || n === undefined || n === '') return '—'
  const num = typeof n === 'number' ? n : parseFloat(String(n))
  if (!Number.isFinite(num)) return '—'
  return num.toFixed(2)
}

export default function AdminModelsPage() {
  const { getToken } = useAuth()
  const [data, setData] = useState<ModelsResponse | null>(null)
  const [catalog, setCatalog] = useState<CatalogRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({})

  const authFetch = useCallback(
    async (input: string, init?: RequestInit) => {
      const token = await getToken().catch(() => null)
      const headers: HeadersInit = {
        ...(init?.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      return fetch(`${API_URL}${input}`, { ...init, headers, cache: 'no-store' })
    },
    [getToken],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mRes, cRes] = await Promise.all([
        authFetch('/api/admin/models'),
        authFetch('/api/admin/ai-catalog?include_archived=1'),
      ])
      if (!mRes.ok) {
        const j = await mRes.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || `models HTTP ${mRes.status}`)
      }
      if (!cRes.ok) {
        const j = await cRes.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || `catalog HTTP ${cRes.status}`)
      }
      const mJ = (await mRes.json()) as ModelsResponse
      const cJ = (await cRes.json()) as { rows: CatalogRow[] }
      setData(mJ)
      setCatalog(cJ.rows)
      const next: Record<string, RowDraft> = {}
      for (const r of mJ.rows) {
        next[r.role] = {
          provider: r.provider,
          model: r.model,
          temperature: tempToString(r.temperature),
          // null max_tokens → pre-fill the operator-chosen default so
          // the first save persists a real value instead of NULL.
          maxTokens:
            r.max_tokens === null
              ? String(DEFAULT_MAX_TOKENS)
              : numToString(r.max_tokens),
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
  }, [authFetch])

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
          maxTokens: String(DEFAULT_MAX_TOKENS),
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

  // Save IF the draft is valid and differs from the persisted row.
  // Called from select onChange and input onBlur.
  const maybeSave = useCallback(
    async (role: string, draft: RowDraft) => {
      if (!draft.provider) return
      if (!draft.model.trim()) return
      const r = rowMap.get(role)
      const equal =
        r &&
        draft.provider === r.provider &&
        draft.model === r.model &&
        draft.temperature === tempToString(r.temperature) &&
        draft.maxTokens === numToString(r.max_tokens)
      if (equal) return

      setDraftField(role, { saving: true, error: null })
      try {
        const body: Record<string, unknown> = {
          provider: draft.provider,
          model: draft.model.trim(),
          temperature:
            draft.temperature.trim() === '' ? null : Number(draft.temperature),
          maxTokens:
            draft.maxTokens.trim() === ''
              ? DEFAULT_MAX_TOKENS
              : Number(draft.maxTokens),
        }
        const res = await authFetch(`/api/admin/models/${encodeURIComponent(role)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
        }
        const updated = (j as { row: ModelRow }).row
        setData((prev) => {
          if (!prev) return prev
          const rows = [...prev.rows]
          const idx = rows.findIndex((x) => x.role === updated.role)
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
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Save failed'
        setDraftField(role, { saving: false, error: msg })
        toast.error(`${role}: ${msg}`)
      }
    },
    [authFetch, rowMap, setDraftField],
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
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-medium text-zinc-900">Models</h1>
      </header>

      {/* ── Per-role configuration ───────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-zinc-700">Per-role configuration</h2>
          <p className="text-xs text-zinc-500">
            Saves automatically when you change a field. Changes apply within
            5 minutes (cache TTL) without redeploy. Model list comes from the
            catalog below — add a model there if it&apos;s missing.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2 text-left font-normal">Role</th>
                <th className="px-3 py-2 text-left font-normal">Provider</th>
                <th className="px-3 py-2 text-left font-normal">Model</th>
                <th className="px-3 py-2 text-left font-normal">Temp</th>
                <th className="px-3 py-2 text-left font-normal">Max tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(() => {
                // Build groups from the static map, intersected with the
                // roles actually returned by the backend. Roles not listed
                // in any group fall through to "Other" so a backend-only
                // addition still shows up (with raw key as label).
                const known = new Set<string>(ROLE_GROUPS.flatMap((g) => g.roles))
                const backendRoles = new Set(data.roles)
                const groups = ROLE_GROUPS.map((g) => ({
                  title: g.title,
                  roles: g.roles.filter((r) => backendRoles.has(r)),
                })).filter((g) => g.roles.length > 0)
                const other = data.roles.filter((r) => !known.has(r))
                if (other.length > 0) groups.push({ title: 'Other', roles: other })

                const renderRoleRow = (role: string) => {
                  const d = getDraft(role)
                  // Filter the dropdown by provider, enabled, and not
                  // archived. Operator controls which models are usable on
                  // each role from the catalog below (Enabled checkbox).
                  // Archived rows are kept in the catalog for historical
                  // ai_call_log references but must never appear as
                  // bindable options. If the persisted model is NOT in the
                  // catalog at all OR is currently disabled/archived,
                  // append it as "(disabled)" / "(not in catalog)" so it
                  // stays selectable until the operator chooses another.
                  const modelOptions =
                    d.provider && catalog
                      ? catalog.filter(
                          (c) => c.provider === d.provider && c.enabled && !c.archived,
                        )
                      : []
                  const modelOptionStrings = new Set(modelOptions.map((c) => c.model))
                  let orphanLabel: string | null = null
                  if (d.model && !modelOptionStrings.has(d.model)) {
                    const inCatalog = catalog?.find(
                      (c) => c.provider === d.provider && c.model === d.model,
                    )
                    orphanLabel = inCatalog
                      ? `${d.model} (disabled)`
                      : `${d.model} (not in catalog)`
                  }
                  return (
                    <tr key={role} className="align-middle">
                      <td className="px-3 py-2">
                        <div className="text-sm leading-tight text-zinc-900">
                          {ROLE_LABELS[role] ?? role}
                        </div>
                        <div className="font-mono text-[11px] leading-tight text-zinc-400">
                          {role}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={d.provider}
                          onChange={(e) => {
                            // Provider change resets model — operator must pick from new list.
                            // Do NOT auto-save until model is chosen.
                            setDraftField(role, { provider: e.target.value, model: '' })
                          }}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
                        >
                          <option value="">—</option>
                          {data.providers.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={d.model}
                          disabled={!d.provider}
                          onChange={(e) => {
                            const next = { ...d, model: e.target.value }
                            setDraftField(role, { model: e.target.value })
                            maybeSave(role, next)
                          }}
                          className="w-40 rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs disabled:bg-zinc-50"
                        >
                          <option value="">— pick —</option>
                          {modelOptions.map((c) => (
                            <option key={c.id} value={c.model}>
                              {c.label ?? c.model}
                            </option>
                          ))}
                          {orphanLabel && (
                            <option value={d.model}>{orphanLabel}</option>
                          )}
                        </select>
                        {d.provider && modelOptions.length === 0 && !orphanLabel && (
                          <div className="mt-0.5 text-xs text-zinc-400">
                            no enabled models for {d.provider} in catalog
                          </div>
                        )}
                        {d.saving && (
                          <span className="ml-2 inline-block align-middle text-xs text-zinc-400">
                            <Loader2 className="inline h-3 w-3 animate-spin" />
                          </span>
                        )}
                        {d.error && (
                          <div className="mt-0.5 text-xs text-rose-700">{d.error}</div>
                        )}
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
                          onBlur={() => maybeSave(role, getDraft(role))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          }}
                          className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step={100}
                          value={d.maxTokens}
                          onChange={(e) =>
                            setDraftField(role, { maxTokens: e.target.value })
                          }
                          onBlur={() => maybeSave(role, getDraft(role))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          }}
                          className="w-24 rounded border border-zinc-300 bg-white px-2 py-1 text-sm tabular-nums"
                        />
                      </td>
                    </tr>
                  )
                }

                return groups.flatMap((g) => [
                  <tr key={`__group_${g.title}`} className="bg-zinc-50">
                    <td
                      colSpan={5}
                      className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500"
                    >
                      {g.title}
                    </td>
                  </tr>,
                  ...g.roles.map((r) => renderRoleRow(r)),
                ])
              })()}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── AI model catalog ────────────────────────────────────── */}
      <ModelCatalogSection
        catalog={catalog}
        providers={data.providers}
        authFetch={authFetch}
        onChange={(next) => setCatalog(next)}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Catalog section — drag-to-reorder list with inline edit + add/delete.
// ──────────────────────────────────────────────────────────────────────

function ModelCatalogSection({
  catalog,
  providers,
  authFetch,
  onChange,
}: {
  catalog: CatalogRow[] | null
  providers: string[]
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
  onChange: (next: CatalogRow[]) => void
}) {
  const [addOpen, setAddOpen] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id || !catalog) return
      const oldIdx = catalog.findIndex((c) => c.id === active.id)
      const newIdx = catalog.findIndex((c) => c.id === over.id)
      if (oldIdx < 0 || newIdx < 0) return
      const next = arrayMove(catalog, oldIdx, newIdx)
      onChange(next)
      try {
        const res = await authFetch('/api/admin/ai-catalog/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: next.map((c) => c.id) }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch {
        toast.error('Failed to save order — reverting')
        onChange(catalog)
      }
    },
    [authFetch, catalog, onChange],
  )

  const patchRow = useCallback(
    async (id: string, body: Partial<CatalogRow>) => {
      try {
        const res = await authFetch(`/api/admin/ai-catalog/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
        }
        const row = (j as { row: CatalogRow }).row
        if (catalog) onChange(catalog.map((c) => (c.id === id ? row : c)))
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Save failed')
      }
    },
    [authFetch, catalog, onChange],
  )

  const archiveRow = useCallback(
    async (id: string) => {
      if (!confirm('Archive this model? It will be hidden from pickers but kept in the database.')) return
      try {
        const res = await authFetch(`/api/admin/ai-catalog/${id}/archive`, {
          method: 'POST',
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
        }
        const row = (j as { row?: CatalogRow }).row
        if (catalog && row) onChange(catalog.map((c) => (c.id === id ? row : c)))
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Archive failed')
      }
    },
    [authFetch, catalog, onChange],
  )

  const restoreRow = useCallback(
    async (id: string) => {
      try {
        const res = await authFetch(`/api/admin/ai-catalog/${id}/restore`, {
          method: 'POST',
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
        }
        const row = (j as { row?: CatalogRow }).row
        if (catalog && row) onChange(catalog.map((c) => (c.id === id ? row : c)))
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Restore failed')
      }
    },
    [authFetch, catalog, onChange],
  )

  const addRow = useCallback(
    async (body: {
      provider: string
      model: string
      label: string
      enabled: boolean
      notes: string
      priceIn: string
      priceOut: string
    }) => {
      try {
        const res = await authFetch('/api/admin/ai-catalog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: body.provider,
            model: body.model,
            label: body.label || null,
            enabled: body.enabled,
            notes: body.notes || null,
            price_input_per_1m: body.priceIn === '' ? null : Number(body.priceIn),
            price_output_per_1m: body.priceOut === '' ? null : Number(body.priceOut),
          }),
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
        }
        const row = (j as { row: CatalogRow }).row
        if (catalog) onChange([...catalog, row])
        setAddOpen(false)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Add failed')
      }
    },
    [authFetch, catalog, onChange],
  )

  // Sorting state for the live catalog list. `null` = use the operator
  // drag-to-reorder order (the catalog as returned by the API). Picking
  // a sortable column overrides drag order until the operator clears
  // it. Drag-to-reorder is only meaningful when sortKey === null, so
  // the GripVertical handles are hidden otherwise.
  type SortKey = 'provider' | 'price' | 'enabled' | null
  type SortDir = 'asc' | 'desc'
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [showArchive, setShowArchive] = useState(false)

  const toggleSort = (key: Exclude<SortKey, null>) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir('asc')
      return
    }
    if (sortDir === 'asc') {
      setSortDir('desc')
      return
    }
    // Third click: clear sort and return to drag order.
    setSortKey(null)
    setSortDir('asc')
  }

  // Average of input+output price; used both for sort and for the
  // heat-map gradient. Null treated as +Infinity in sort (pushed to
  // bottom) and skipped from the heat-map domain.
  const avgPrice = (r: CatalogRow): number | null => {
    if (r.price_input_per_1m == null || r.price_output_per_1m == null) return null
    return (r.price_input_per_1m + r.price_output_per_1m) / 2
  }

  const live = useMemo(
    () => (catalog ?? []).filter((c) => !c.archived),
    [catalog],
  )
  const archived = useMemo(
    () => (catalog ?? []).filter((c) => c.archived),
    [catalog],
  )

  // Sorted view of `live` for rendering. Original drag-order is preserved
  // in `live`; we only re-sort the rendered copy.
  const liveSorted = useMemo(() => {
    if (sortKey === null) return live
    const arr = [...live]
    const factor = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      if (sortKey === 'provider') {
        const cmp = a.provider.localeCompare(b.provider)
        return cmp !== 0 ? cmp * factor : a.model.localeCompare(b.model) * factor
      }
      if (sortKey === 'enabled') {
        const av = a.enabled ? 1 : 0
        const bv = b.enabled ? 1 : 0
        return (av - bv) * factor
      }
      // price
      const av = avgPrice(a)
      const bv = avgPrice(b)
      // Push nulls to the bottom regardless of direction.
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      return (av - bv) * factor
    })
    return arr
  }, [live, sortKey, sortDir])

  // Heat-map domain: min/max average price across *live* rows that
  // have a price. Re-computed whenever the catalog changes.
  const priceDomain = useMemo(() => {
    const xs = live
      .map((r) => avgPrice(r))
      .filter((v): v is number => v != null)
    if (xs.length === 0) return null
    return { min: Math.min(...xs), max: Math.max(...xs) }
  }, [live])

  const SortHeader = ({
    label,
    sk,
    align,
  }: {
    label: string
    sk: Exclude<SortKey, null>
    align?: 'left' | 'center' | 'right'
  }) => {
    const active = sortKey === sk
    const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown
    return (
      <button
        type="button"
        onClick={() => toggleSort(sk)}
        className={
          'flex items-center gap-1 text-xs uppercase tracking-wider ' +
          (active ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-700') +
          (align === 'center' ? ' justify-center' : '')
        }
        title={
          active
            ? sortDir === 'asc'
              ? 'Sorted ascending — click for descending'
              : 'Sorted descending — click to clear'
            : `Sort by ${label.toLowerCase()}`
        }
      >
        <span>{label}</span>
        <Icon className="h-3 w-3" />
      </button>
    )
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium text-zinc-700">Model catalog</h2>
        <p className="text-xs text-zinc-500">
          Full list of (provider, model) pairs across the platform. Drag rows
          to reorder (only when no column-sort is active). Untick Enabled to
          hide a model from the role dropdown and from the Photo Bank
          model-test picker. Archived rows move to a separate section
          below — historical AI-call logs still reference them, so the
          rows are kept rather than deleted.
        </p>
      </div>

      <div className="flex justify-start gap-2">
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
        >
          {addOpen ? 'Cancel' : '+ Add model'}
        </button>
        {archived.length > 0 && (
          <button
            type="button"
            onClick={() => setShowArchive((v) => !v)}
            className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            {showArchive ? 'Hide archive' : `Show archive (${archived.length})`}
          </button>
        )}
      </div>

      {addOpen && <CatalogAddForm providers={providers} onSubmit={addRow} />}

      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="grid grid-cols-[24px_140px_1fr_140px_1fr_72px_36px] gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2 text-xs uppercase tracking-wider text-zinc-500">
          <div></div>
          <SortHeader label="Provider" sk="provider" />
          <div>Model / Label</div>
          <SortHeader label="Price ($/1M)" sk="price" />
          <div>Notes</div>
          <div className="text-center">
            <SortHeader label="Enabled" sk="enabled" align="center" />
          </div>
          <div></div>
        </div>

        {!catalog ? (
          <div className="px-3 py-6 text-center text-sm text-zinc-500">
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          </div>
        ) : live.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-zinc-500">
            Catalog is empty. Add your first model with the button above.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={liveSorted.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="divide-y divide-zinc-100">
                {liveSorted.map((c) => (
                  <CatalogRowView
                    key={c.id}
                    row={c}
                    priceDomain={priceDomain}
                    dragDisabled={sortKey !== null}
                    onPatch={(b) => patchRow(c.id, b)}
                    onArchive={() => archiveRow(c.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {showArchive && archived.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50">
          <div className="border-b border-zinc-200 px-3 py-2 text-xs uppercase tracking-wider text-zinc-500">
            Archive
          </div>
          <div className="divide-y divide-zinc-200">
            {archived.map((c) => (
              <ArchivedRowView
                key={c.id}
                row={c}
                onRestore={() => restoreRow(c.id)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function CatalogRowView({
  row,
  priceDomain,
  dragDisabled,
  onPatch,
  onArchive,
}: {
  row: CatalogRow
  priceDomain: { min: number; max: number } | null
  dragDisabled: boolean
  onPatch: (body: Partial<CatalogRow>) => void
  onArchive: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: row.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Heat-map for the price cell. Nine discrete steps so the transition
  // from cheap → expensive reads at a glance. Logarithmic scale: the
  // catalog spans roughly $0.18..$15 (avg price/1M), and a linear
  // mapping pushes two-thirds of the models into the cheapest band.
  // Log spreads them out so the 9-band palette is actually visible.
  // Domain rebalances when prices change.
  const priceBg = (() => {
    if (!priceDomain) return undefined
    if (row.price_input_per_1m == null || row.price_output_per_1m == null) return undefined
    const v = (row.price_input_per_1m + row.price_output_per_1m) / 2
    if (v <= 0) return undefined
    if (priceDomain.max === priceDomain.min) {
      return 'hsl(130, 55%, 90%)'
    }
    const lo = Math.log(priceDomain.min)
    const hi = Math.log(priceDomain.max)
    const t = Math.max(0, Math.min(1, (Math.log(v) - lo) / (hi - lo)))
    const STEPS = 9
    const stepIdx = Math.min(STEPS - 1, Math.floor(t * STEPS))
    // 0 = cheapest (green), 8 = most expensive (red).
    const hue = 130 - (130 * stepIdx) / (STEPS - 1)
    const light = 93 - (15 * stepIdx) / (STEPS - 1)
    return `hsl(${hue.toFixed(0)}, 60%, ${light.toFixed(0)}%)`
  })()

  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(row.label ?? '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState(row.notes ?? '')
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInDraft, setPriceInDraft] = useState(
    row.price_input_per_1m?.toString() ?? '',
  )
  const [priceOutDraft, setPriceOutDraft] = useState(
    row.price_output_per_1m?.toString() ?? '',
  )

  const commitPrice = () => {
    setEditingPrice(false)
    const nextIn = priceInDraft.trim() === '' ? null : Number(priceInDraft)
    const nextOut = priceOutDraft.trim() === '' ? null : Number(priceOutDraft)
    const changed =
      nextIn !== row.price_input_per_1m || nextOut !== row.price_output_per_1m
    if (changed) {
      onPatch({
        price_input_per_1m: nextIn,
        price_output_per_1m: nextOut,
      })
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[24px_140px_1fr_140px_1fr_72px_36px] items-center gap-2 px-3 py-2 text-sm"
    >
      {dragDisabled ? (
        <span
          className="flex h-4 w-4 items-center justify-center text-zinc-200"
          title="Clear column sort to enable drag-reorder"
        >
          <GripVertical className="h-4 w-4" />
        </span>
      ) : (
        <button
          type="button"
          className="cursor-grab text-zinc-400 hover:text-zinc-700"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <div className="text-xs text-zinc-700">{row.provider}</div>

      <div className="min-w-0">
        <div className="truncate font-mono text-xs text-zinc-900">{row.model}</div>
        {editingLabel ? (
          <input
            autoFocus
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => {
              setEditingLabel(false)
              if ((labelDraft || null) !== (row.label || null)) {
                onPatch({ label: labelDraft.trim() || null })
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setLabelDraft(row.label ?? '')
                setEditingLabel(false)
              }
            }}
            className="mt-0.5 w-full rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs text-zinc-600"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setLabelDraft(row.label ?? '')
              setEditingLabel(true)
            }}
            className="mt-0.5 block max-w-full truncate text-left text-xs text-zinc-500 hover:text-zinc-900"
          >
            {row.label || <span className="italic text-zinc-400">add label</span>}
          </button>
        )}
      </div>

      <div
        className="-mx-1 min-w-0 rounded px-1"
        style={priceBg ? { background: priceBg } : undefined}
      >
        {editingPrice ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="number"
              step="0.01"
              min={0}
              value={priceInDraft}
              placeholder="in"
              onChange={(e) => setPriceInDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') {
                  setPriceInDraft(row.price_input_per_1m?.toString() ?? '')
                  setPriceOutDraft(row.price_output_per_1m?.toString() ?? '')
                  setEditingPrice(false)
                }
              }}
              onBlur={(e) => {
                // Only commit when focus leaves the whole pair.
                const next = e.relatedTarget as HTMLElement | null
                if (next?.dataset?.pricepair !== row.id) commitPrice()
              }}
              data-pricepair={row.id}
              className="w-16 rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs tabular-nums"
            />
            <span className="text-xs text-zinc-400">/</span>
            <input
              type="number"
              step="0.01"
              min={0}
              value={priceOutDraft}
              placeholder="out"
              onChange={(e) => setPriceOutDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') {
                  setPriceInDraft(row.price_input_per_1m?.toString() ?? '')
                  setPriceOutDraft(row.price_output_per_1m?.toString() ?? '')
                  setEditingPrice(false)
                }
              }}
              onBlur={(e) => {
                const next = e.relatedTarget as HTMLElement | null
                if (next?.dataset?.pricepair !== row.id) commitPrice()
              }}
              data-pricepair={row.id}
              className="w-16 rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs tabular-nums"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setPriceInDraft(row.price_input_per_1m?.toString() ?? '')
              setPriceOutDraft(row.price_output_per_1m?.toString() ?? '')
              setEditingPrice(true)
            }}
            className="block max-w-full truncate text-left text-xs tabular-nums text-zinc-700 hover:text-zinc-900"
            title="Price per 1M tokens (input / output)"
          >
            {row.price_input_per_1m !== null && row.price_output_per_1m !== null ? (
              <>
                ${fmtPrice(row.price_input_per_1m)}{' '}
                <span className="text-zinc-400">/</span> ${fmtPrice(row.price_output_per_1m)}
              </>
            ) : (
              <span className="italic text-zinc-400">set price</span>
            )}
          </button>
        )}
      </div>

      <div className="min-w-0">
        {editingNotes ? (
          <input
            autoFocus
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => {
              setEditingNotes(false)
              if ((notesDraft || null) !== (row.notes || null)) {
                onPatch({ notes: notesDraft.trim() || null })
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setNotesDraft(row.notes ?? '')
                setEditingNotes(false)
              }
            }}
            className="w-full rounded border border-zinc-300 bg-white px-1 py-0.5 text-xs text-zinc-600"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setNotesDraft(row.notes ?? '')
              setEditingNotes(true)
            }}
            className="block max-w-full truncate text-left text-xs text-zinc-500 hover:text-zinc-900"
          >
            {row.notes || <span className="italic text-zinc-400">add note</span>}
          </button>
        )}
      </div>

      <div className="text-center">
        <input
          type="checkbox"
          checked={row.enabled}
          onChange={(e) => onPatch({ enabled: e.target.checked })}
        />
      </div>
      <button
        type="button"
        onClick={onArchive}
        className="text-zinc-400 hover:text-amber-600"
        title="Archive (hide from pickers; history is kept)"
      >
        <Archive className="h-4 w-4" />
      </button>
    </div>
  )
}

function ArchivedRowView({
  row,
  onRestore,
}: {
  row: CatalogRow
  onRestore: () => void
}) {
  const ts = row.archived_at
    ? new Date(row.archived_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-sm">
      <div className="w-[140px] text-xs text-zinc-500">{row.provider}</div>
      <div className="flex-1 min-w-0">
        <div className="truncate font-mono text-xs text-zinc-700">{row.model}</div>
        {row.label && (
          <div className="truncate text-xs text-zinc-500">{row.label}</div>
        )}
      </div>
      {ts && (
        <div className="text-xs text-zinc-400" title={row.archived_at ?? undefined}>
          archived {ts}
        </div>
      )}
      <button
        type="button"
        onClick={onRestore}
        className="flex items-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
        title="Restore — bring back to the live catalog"
      >
        <RotateCcw className="h-3 w-3" />
        Restore
      </button>
    </div>
  )
}

function CatalogAddForm({
  providers,
  onSubmit,
}: {
  providers: string[]
  onSubmit: (body: {
    provider: string
    model: string
    label: string
    enabled: boolean
    notes: string
    priceIn: string
    priceOut: string
  }) => void
}) {
  const [provider, setProvider] = useState(providers[0] ?? '')
  const [model, setModel] = useState('')
  const [label, setLabel] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [notes, setNotes] = useState('')
  const [priceIn, setPriceIn] = useState('')
  const [priceOut, setPriceOut] = useState('')

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Provider
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            {providers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Model
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g. gemini-2.5-flash-lite"
            className="rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Label (optional)
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Gemini 2.5 Flash-Lite"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Notes (optional)
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Input price ($/1M tokens)
          <input
            type="number"
            step="0.01"
            min={0}
            value={priceIn}
            onChange={(e) => setPriceIn(e.target.value)}
            placeholder="0.20"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600">
          Output price ($/1M tokens)
          <input
            type="number"
            step="0.01"
            min={0}
            value={priceOut}
            onChange={(e) => setPriceOut(e.target.value)}
            placeholder="1.25"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums"
          />
        </label>
      </div>

      <div className="flex items-center gap-5">
        <label className="flex items-center gap-2 text-xs text-zinc-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enabled
        </label>
        <div className="ml-auto">
          <button
            type="button"
            disabled={!provider || !model.trim()}
            onClick={() =>
              onSubmit({
                provider,
                model: model.trim(),
                label: label.trim(),
                enabled,
                notes: notes.trim(),
                priceIn: priceIn.trim(),
                priceOut: priceOut.trim(),
              })
            }
            className="rounded bg-zinc-900 px-4 py-2 text-xs text-white hover:bg-zinc-700 disabled:opacity-40"
          >
            Add to catalog
          </button>
        </div>
      </div>
    </div>
  )
}
