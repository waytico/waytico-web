'use client'

/**
 * Admin Stats — landing dashboard.
 *
 * Single fetch to /api/admin/stats/overview returns everything this
 * page renders: KPI tiles, the four-step funnel, a 30-day daily bar
 * chart, top users, recent activity feed, and a photo-bank
 * mini-snapshot. The endpoint is read-only and cheap (a handful of
 * COUNT / FILTER queries) so we don't paginate or stream.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

type StatusKey = 'draft' | 'quoted' | 'active' | 'completed' | 'archived'

interface RecentEvent {
  id: string
  event_type: string
  actor: string | null
  created_at: string
  payload: Record<string, unknown> | null
  project_id: string
  project_slug: string | null
  project_title: string | null
  project_status: string | null
  owner_email: string | null
  owner_name: string | null
  owner_business_name: string | null
}

interface StatsOverview {
  generatedAt: string
  users: { total: number; new7d: number; new30d: number }
  trips: {
    total: number
    new7d: number
    new30d: number
    byStatus: Record<StatusKey, number>
  }
  funnel: {
    created: number
    viewed: number
    activated: number
    completed: number
  }
  rates: { view: number; activation: number; completion: number }
  timeSeries: {
    day: string
    created: number
    viewed: number
    activated: number
  }[]
  topUsers: {
    id: string
    email: string | null
    name: string | null
    business_name: string | null
    trips_count: number
    created_at: string
  }[]
  recentEvents: RecentEvent[]
  photoBank: { total: number; approved: number; pendingReview: number }
}

function fmtPct(n: number): string {
  if (!isFinite(n) || n <= 0) return '—'
  return `${(n * 100).toFixed(0)}%`
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function fmtRelative(iso: string): string {
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

const EVENT_LABELS: Record<string, string> = {
  created: 'created',
  edited: 'edited',
  status_change: 'changed status',
  activated: 'activated',
  day_edited: 'edited day',
  segment_edited: 'edited segment',
  what_to_bring_edited: 'edited "what to bring"',
  highlight_edited: 'edited highlight',
  quote_generation_started: 'started quote generation',
  prep_generation_started: 'started prep generation',
}

function eventLabel(e: RecentEvent): string {
  return EVENT_LABELS[e.event_type] ?? e.event_type
}

function eventDetail(e: RecentEvent): string | null {
  const p = e.payload
  if (!p) return null
  if (e.event_type === 'status_change') {
    const from = (p as { from?: string }).from
    const to = (p as { to?: string }).to
    if (from && to) return `${from} → ${to}`
  }
  return null
}

function StatTile({
  label,
  primary,
  delta,
}: {
  label: string
  primary: string | number
  delta?: string
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-zinc-900">{primary}</span>
        {delta && (
          <span className="text-xs font-medium text-emerald-600">{delta}</span>
        )}
      </div>
    </div>
  )
}

function FunnelStep({
  label,
  value,
  pctOfPrev,
  isFirst,
}: {
  label: string
  value: number
  pctOfPrev?: number
  isFirst?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      {!isFirst && (
        <div className="flex flex-col items-center text-xs text-zinc-500">
          <span>→</span>
          <span>{pctOfPrev != null ? fmtPct(pctOfPrev) : '—'}</span>
        </div>
      )}
      <div className="rounded border border-zinc-200 bg-white px-4 py-3 min-w-[110px] text-center">
        <div className="text-xs uppercase tracking-wider text-zinc-500">
          {label}
        </div>
        <div className="mt-1 text-xl font-semibold text-zinc-900">{value}</div>
      </div>
    </div>
  )
}

function TimeSeriesChart({
  data,
}: {
  data: StatsOverview['timeSeries']
}) {
  const max = useMemo(() => {
    let m = 1
    for (const d of data) {
      const t = d.created + d.viewed + d.activated
      if (t > m) m = t
    }
    return m
  }, [data])

  if (data.length === 0) {
    return <div className="text-sm text-zinc-500">No data.</div>
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-3 text-xs text-zinc-600">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-zinc-900" />
          Created
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" />
          Viewed
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-emerald-600" />
          Activated
        </span>
      </div>
      <div className="flex h-32 items-end gap-[2px]">
        {data.map((d) => {
          const h = (n: number) => `${(n / max) * 100}%`
          const total = d.created + d.viewed + d.activated
          const tip = `${d.day}\n${d.created} created · ${d.viewed} viewed · ${d.activated} activated`
          return (
            <div
              key={d.day}
              className="flex h-full flex-1 flex-col-reverse"
              title={tip}
            >
              {d.created > 0 && (
                <div
                  className="bg-zinc-900"
                  style={{ height: h(d.created) }}
                />
              )}
              {d.viewed > 0 && (
                <div
                  className="bg-amber-500"
                  style={{ height: h(d.viewed) }}
                />
              )}
              {d.activated > 0 && (
                <div
                  className="bg-emerald-600"
                  style={{ height: h(d.activated) }}
                />
              )}
              {total === 0 && (
                <div className="bg-zinc-100" style={{ height: '2px' }} />
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
        <span>{fmtDate(data[0]?.day ?? '')}</span>
        <span>{fmtDate(data[data.length - 1]?.day ?? '')}</span>
      </div>
    </div>
  )
}

export default function AdminStatsPage() {
  const { getToken } = useAuth()
  const [data, setData] = useState<StatsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken().catch(() => null)
      const res = await fetch(`${API_URL}/api/admin/stats/overview`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
      }
      const j = (await res.json()) as StatsOverview
      setData(j)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center rounded border border-zinc-200 bg-white py-16 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm">Loading stats…</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Failed to load stats: {error}
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

  const {
    users,
    trips,
    funnel,
    rates,
    timeSeries,
    topUsers,
    recentEvents,
    photoBank,
  } = data
  const fmtDelta = (n: number) => (n > 0 ? `+${n} this week` : '—')

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-zinc-900">Stats</h1>
        <button
          type="button"
          onClick={load}
          className="rounded border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Operators"
          primary={users.total}
          delta={fmtDelta(users.new7d)}
        />
        <StatTile
          label="Quotes alive"
          primary={trips.total}
          delta={fmtDelta(trips.new7d)}
        />
        <StatTile label="Active trips" primary={trips.byStatus.active} />
        <StatTile label="Activation rate" primary={fmtPct(rates.activation)} />
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-900">Funnel</h2>
        <div className="flex flex-wrap items-stretch gap-2">
          <FunnelStep label="Created" value={funnel.created} isFirst />
          <FunnelStep
            label="Viewed"
            value={funnel.viewed}
            pctOfPrev={
              funnel.created > 0 ? funnel.viewed / funnel.created : 0
            }
          />
          <FunnelStep
            label="Activated"
            value={funnel.activated}
            pctOfPrev={
              funnel.viewed > 0 ? funnel.activated / funnel.viewed : 0
            }
          />
          <FunnelStep
            label="Completed"
            value={funnel.completed}
            pctOfPrev={
              funnel.activated > 0 ? funnel.completed / funnel.activated : 0
            }
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Created = quotes alive in quoted/active/completed. Viewed = ever
          opened publicly. Activated = stripe activation reached. Completed =
          trip marked completed.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-900">Last 30 days</h2>
        <TimeSeriesChart data={timeSeries} />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-900">
            Top operators
          </h2>
          {topUsers.length === 0 ? (
            <p className="text-sm text-zinc-500">No operators yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="pb-2 text-left font-normal">Operator</th>
                  <th className="pb-2 text-right font-normal">Trips</th>
                  <th className="pb-2 text-right font-normal">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {topUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="py-1.5">
                      <div className="font-medium text-zinc-900">
                        {u.business_name ||
                          u.name ||
                          u.email ||
                          u.id.slice(0, 8)}
                      </div>
                      {u.business_name && u.email && (
                        <div className="text-xs text-zinc-500">{u.email}</div>
                      )}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {u.trips_count}
                    </td>
                    <td className="py-1.5 text-right text-xs text-zinc-500">
                      {fmtDate(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-zinc-900">
            Recent activity
          </h2>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-zinc-500">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recentEvents.map((e) => {
                const who =
                  e.owner_business_name ||
                  e.owner_name ||
                  e.owner_email ||
                  (e.actor === 'system' ? 'system' : 'unknown')
                const detail = eventDetail(e)
                return (
                  <li key={e.id} className="py-1.5 text-sm">
                    <div>
                      <span className="text-zinc-900">{who}</span>{' '}
                      <span className="text-zinc-600">{eventLabel(e)}</span>{' '}
                      {e.project_slug ? (
                        <Link
                          href={`/t/${e.project_slug}`}
                          className="text-zinc-900 underline-offset-2 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {e.project_title || e.project_slug}
                        </Link>
                      ) : (
                        <span className="text-zinc-700">
                          {e.project_title || e.project_id.slice(0, 8)}
                        </span>
                      )}
                      {detail && (
                        <span className="ml-1 text-xs text-zinc-500">
                          ({detail})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {fmtRelative(e.created_at)}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-900">Photo bank</h2>
          <Link
            href="/admin/photo-bank"
            className="text-xs text-zinc-600 underline-offset-2 hover:underline"
          >
            Open photo bank →
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <StatTile label="Total" primary={photoBank.total} />
          <StatTile label="Approved" primary={photoBank.approved} />
          <StatTile label="Pending review" primary={photoBank.pendingReview} />
        </div>
      </section>

      <p className="text-xs text-zinc-400">
        Generated {fmtRelative(data.generatedAt)}.
      </p>
    </div>
  )
}
