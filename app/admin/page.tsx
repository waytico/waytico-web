'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { apiFetch } from '@/lib/api'

type Tab = 'users' | 'projects' | 'prompts'

interface AdminUser {
  id: string
  email: string | null
  contact_email: string | null
  name: string | null
  business_name: string | null
  onboarded: boolean
  created_at: string
  trips_count: number
}

interface AdminProject {
  id: string
  slug: string
  title: string
  status: string
  region: string | null
  country: string | null
  created_at: string
  deleted_at: string | null
  viewed_first_time_at: string | null
  activated_at: string | null
  owner_id: string | null
  owner_email: string | null
  owner_name: string | null
  owner_business_name: string | null
}

interface AdminPrompt {
  key: string
  version: number
  prompt_text: string
  description: string | null
  updated_at: string
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'users', label: 'Users' },
  { key: 'projects', label: 'Projects' },
  { key: 'prompts', label: 'Prompts' },
]

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toISOString().slice(0, 10)
}

export default function AdminPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [adminConfirmed, setAdminConfirmed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get('tab')
    return t === 'projects' || t === 'prompts' ? t : 'users'
  })

  // Persist tab in URL.
  useEffect(() => {
    const params = new URLSearchParams()
    if (tab !== 'users') params.set('tab', tab)
    const qs = params.toString()
    router.replace(qs ? `/admin?${qs}` : '/admin', { scroll: false })
  }, [tab, router])

  // Auth + admin check. Bounce non-admins to /dashboard.
  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.replace('/sign-in')
      return
    }
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiFetch('/api/admin/whoami', { token, cache: 'no-store' })
        if (!active) return
        if (res.ok) {
          setAdminConfirmed(true)
        } else {
          setAdminConfirmed(false)
          router.replace('/dashboard')
        }
      } catch {
        if (active) {
          setAdminConfirmed(false)
          router.replace('/dashboard')
        }
      }
    })()
    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, getToken, router])

  if (!isLoaded || !isSignedIn || adminConfirmed !== true) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
          <div className="text-sm text-foreground/60">Checking access…</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-1">
            Admin
          </h1>
          <p className="text-sm text-foreground/60">
            Internal oversight. Visible only to ADMIN_EMAILS allowlist.
          </p>
        </div>

        <div
          className="border-b border-border flex items-center gap-1 overflow-x-auto"
          role="tablist"
        >
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`relative py-2.5 px-3 text-sm whitespace-nowrap transition-colors ${
                  active
                    ? 'text-foreground font-medium'
                    : 'text-foreground/55 hover:text-foreground/85'
                }`}
              >
                {t.label}
                {active && (
                  <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-foreground rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        {tab === 'users' && <UsersTab getToken={getToken} />}
        {tab === 'projects' && <ProjectsTab getToken={getToken} />}
        {tab === 'prompts' && <PromptsTab getToken={getToken} />}
      </main>
      <Footer />
    </div>
  )
}

// ─── Users tab ────────────────────────────────────────────────

function UsersTab({ getToken }: { getToken: () => Promise<string | null> }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiFetch('/api/admin/users', { token, cache: 'no-store' })
        if (!res.ok) {
          if (active) setUsers([])
          return
        }
        const data = await res.json()
        if (active) setUsers(data.users ?? [])
      } catch {
        if (active) setUsers([])
      }
    })()
    return () => {
      active = false
    }
  }, [getToken])

  const visible = useMemo(() => {
    if (!users) return null
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const hay = [u.email, u.contact_email, u.name, u.business_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [users, search])

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, name, business…"
          className="h-8 px-3 text-sm w-64 max-w-full bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="text-xs text-foreground/55">
          {visible ? `${visible.length} of ${users?.length ?? 0}` : 'Loading…'}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-foreground/55 uppercase tracking-wider">
            <tr className="border-b border-border/70">
              <th className="text-left font-semibold p-3">Email</th>
              <th className="text-left font-semibold p-3">Name / Brand</th>
              <th className="text-right font-semibold p-3">Trips</th>
              <th className="text-left font-semibold p-3">Onb.</th>
              <th className="text-right font-semibold p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {!visible &&
              [0, 1, 2].map((i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td colSpan={5} className="p-3">
                    <div className="h-5 bg-secondary/50 rounded animate-pulse" />
                  </td>
                </tr>
              ))}
            {visible && visible.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-sm text-foreground/55"
                >
                  Nothing matched.
                </td>
              </tr>
            )}
            {visible?.map((u) => (
              <tr key={u.id} className="border-b border-border/50 last:border-0">
                <td className="p-3 font-mono text-xs">
                  {u.email || '—'}
                  {u.contact_email && u.contact_email !== u.email && (
                    <div className="text-foreground/45">{u.contact_email}</div>
                  )}
                </td>
                <td className="p-3">
                  <div>{u.business_name || u.name || '—'}</div>
                  {u.business_name && u.name && (
                    <div className="text-xs text-foreground/45">{u.name}</div>
                  )}
                </td>
                <td className="p-3 text-right tabular-nums">{u.trips_count}</td>
                <td className="p-3">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      u.onboarded ? 'bg-emerald-500' : 'bg-foreground/30'
                    }`}
                  />
                </td>
                <td className="p-3 text-right text-xs tabular-nums text-foreground/65">
                  {fmtDate(u.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Projects tab ─────────────────────────────────────────────

function ProjectsTab({ getToken }: { getToken: () => Promise<string | null> }) {
  const [projects, setProjects] = useState<AdminProject[] | null>(null)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const reload = async () => {
    try {
      const token = await getToken()
      const params = new URLSearchParams()
      if (includeDeleted) params.set('include_deleted', '1')
      const url = `/api/admin/projects${params.toString() ? '?' + params.toString() : ''}`
      const res = await apiFetch(url, { token, cache: 'no-store' })
      if (!res.ok) {
        setProjects([])
        return
      }
      const data = await res.json()
      setProjects(data.projects ?? [])
    } catch {
      setProjects([])
    }
  }

  useEffect(() => {
    setProjects(null)
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted, getToken])

  async function restore(id: string) {
    try {
      const token = await getToken()
      const res = await apiFetch(`/api/admin/projects/${id}/restore`, {
        token,
        method: 'POST',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.restored) {
        toast.success('Trip restored')
        reload()
      } else {
        toast.message('Already live, nothing to restore')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Restore failed')
    }
  }

  const visible = useMemo(() => {
    if (!projects) return null
    const q = search.trim().toLowerCase()
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (!q) return true
      const hay = [
        p.title,
        p.slug,
        p.region,
        p.country,
        p.owner_email,
        p.owner_name,
        p.owner_business_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [projects, search, statusFilter])

  return (
    <section>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search trips, owners…"
          className="h-8 px-3 text-sm w-64 max-w-full bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 px-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="quoted">Quoted</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-foreground/70">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          Show deleted
        </label>
        <div className="ml-auto text-xs text-foreground/55">
          {visible ? `${visible.length} of ${projects?.length ?? 0}` : 'Loading…'}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-foreground/55 uppercase tracking-wider">
            <tr className="border-b border-border/70">
              <th className="text-left font-semibold p-3">Trip</th>
              <th className="text-left font-semibold p-3">Owner</th>
              <th className="text-left font-semibold p-3">Status</th>
              <th className="text-right font-semibold p-3">Created</th>
              <th className="text-right font-semibold p-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {!visible &&
              [0, 1, 2].map((i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td colSpan={5} className="p-3">
                    <div className="h-5 bg-secondary/50 rounded animate-pulse" />
                  </td>
                </tr>
              ))}
            {visible && visible.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-sm text-foreground/55"
                >
                  Nothing matched.
                </td>
              </tr>
            )}
            {visible?.map((p) => {
              const isDeleted = !!p.deleted_at
              return (
                <tr
                  key={p.id}
                  className={`border-b border-border/50 last:border-0 ${
                    isDeleted ? 'opacity-50' : ''
                  }`}
                >
                  <td className="p-3">
                    <a
                      href={`/t/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {p.title}
                    </a>
                    <div className="text-xs text-foreground/45 font-mono">
                      {p.slug}
                    </div>
                    {(p.region || p.country) && (
                      <div className="text-xs text-foreground/55 mt-0.5">
                        {[p.region, p.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    <div>{p.owner_business_name || p.owner_name || '—'}</div>
                    {p.owner_email && (
                      <div className="text-foreground/45 font-mono">
                        {p.owner_email}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-xs">
                      {isDeleted ? (
                        <span className="text-destructive">deleted</span>
                      ) : (
                        p.status
                      )}
                    </span>
                  </td>
                  <td className="p-3 text-right text-xs tabular-nums text-foreground/65">
                    {fmtDate(p.created_at)}
                  </td>
                  <td className="p-3 text-right">
                    {isDeleted && (
                      <button
                        type="button"
                        onClick={() => restore(p.id)}
                        className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-secondary/60 transition-colors"
                      >
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Prompts tab ──────────────────────────────────────────────

function PromptsTab({ getToken }: { getToken: () => Promise<string | null> }) {
  const [prompts, setPrompts] = useState<AdminPrompt[] | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiFetch('/api/admin/prompts', { token, cache: 'no-store' })
        if (!res.ok) {
          if (active) setPrompts([])
          return
        }
        const data = await res.json()
        if (active) setPrompts(data.prompts ?? [])
      } catch {
        if (active) setPrompts([])
      }
    })()
    return () => {
      active = false
    }
  }, [getToken])

  function startEdit(p: AdminPrompt) {
    setEditing(p.key)
    setDraft(p.prompt_text)
  }

  async function save(key: string) {
    if (saving) return
    setSaving(true)
    try {
      const token = await getToken()
      const res = await apiFetch(`/api/admin/prompts/${encodeURIComponent(key)}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ content: draft }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPrompts((prev) =>
        prev ? prev.map((p) => (p.key === key ? { ...p, ...data.prompt } : p)) : prev,
      )
      setEditing(null)
      toast.success('Prompt saved')
    } catch (err: any) {
      toast.error(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-3">
      {!prompts &&
        [0, 1].map((i) => (
          <div
            key={i}
            className="h-24 bg-secondary/30 rounded-md animate-pulse"
          />
        ))}
      {prompts &&
        prompts.map((p) => (
          <div key={p.key} className="rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-3 border-b border-border/70">
              <div>
                <div className="font-mono text-sm">{p.key}</div>
                <div className="text-xs text-foreground/55">
                  v{p.version} · updated {fmtDate(p.updated_at)}
                </div>
              </div>
              {editing === p.key ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-secondary/60 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving || draft.trim().length < 20}
                    onClick={() => save(p.key)}
                    className="text-xs px-2.5 py-1 rounded-md bg-foreground text-background disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-secondary/60 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
            {p.description && (
              <div className="px-4 py-2 text-xs text-foreground/55 border-b border-border/50 bg-secondary/20">
                {p.description}
              </div>
            )}
            <div className="p-4">
              {editing === p.key ? (
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={Math.min(40, draft.split('\n').length + 2)}
                  className="w-full font-mono text-xs p-3 rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-accent resize-y"
                />
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-xs text-foreground/80 max-h-96 overflow-auto">
                  {p.prompt_text}
                </pre>
              )}
            </div>
          </div>
        ))}
    </section>
  )
}
