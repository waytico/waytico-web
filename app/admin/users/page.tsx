'use client'

/**
 * Admin Users — operator list with impersonation.
 *
 * GET /api/admin/users returns every operator with a per-user trips
 * count. Client-side search filters across email / contact_email /
 * name / business_name. The Impersonate action mints a short-lived
 * token (POST /api/admin/impersonate/:id), drops it into
 * sessionStorage via lib/api's setImpersonationToken, then routes to
 * /dashboard so the admin sees the world as the target user.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { setImpersonationToken } from '@/lib/api'
import { NotifyToggle } from '../_components/notify-toggle'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

interface AdminUser {
  id: string
  email: string | null
  contact_email: string | null
  name: string | null
  business_name: string | null
  onboarded: boolean
  created_at: string
  updated_at: string
  trips_count: number
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function operatorLabel(u: AdminUser): string {
  return (
    u.business_name ||
    u.name ||
    (u.email ? u.email.split('@')[0] : u.id.slice(0, 8))
  )
}

export default function AdminUsersPage() {
  const { getToken } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [confirmFor, setConfirmFor] = useState<AdminUser | null>(null)
  const [impersonating, setImpersonating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken().catch(() => null)
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
      }
      const j = (await res.json()) as { users: AdminUser[] }
      setUsers(j.users)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!users) return []
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

  const doImpersonate = useCallback(
    async (u: AdminUser) => {
      setImpersonating(true)
      try {
        const token = await getToken().catch(() => null)
        const res = await fetch(`${API_URL}/api/admin/impersonate/${u.id}`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const j = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error((j as { error?: string }).error || `HTTP ${res.status}`)
        }
        const impToken = (j as { token?: string }).token
        if (!impToken) throw new Error('No token in response')
        setImpersonationToken(impToken)
        setConfirmFor(null)
        router.push('/dashboard')
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Impersonation failed'
        toast.error(`Impersonation failed: ${msg}`)
      } finally {
        setImpersonating(false)
      }
    },
    [getToken, router],
  )

  if (loading && !users) {
    return (
      <div className="flex items-center justify-center rounded border border-zinc-200 bg-white py-16 text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm">Loading users…</span>
      </div>
    )
  }

  if (error && !users) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Failed to load users: {error}
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
        <h1 className="text-xl font-medium text-zinc-900">Users</h1>
        <div className="flex items-center gap-4">
          <NotifyToggle
            field="newUser"
            label="Notify admin in Telegram on new user"
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

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, name, business…"
          className="w-full max-w-md rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none"
        />
        <span className="text-xs text-zinc-500">
          {filtered.length} of {users?.length ?? 0}
        </span>
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">No users match.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-2 text-left font-normal">Operator</th>
                <th className="px-4 py-2 text-left font-normal">Email</th>
                <th className="px-4 py-2 text-right font-normal">Trips</th>
                <th className="px-4 py-2 text-center font-normal">Onboarded</th>
                <th className="px-4 py-2 text-right font-normal">Joined</th>
                <th className="px-4 py-2 text-right font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((u) => {
                const showContact =
                  u.contact_email && u.contact_email !== u.email
                return (
                  <tr key={u.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-zinc-900">
                        {operatorLabel(u)}
                      </div>
                      {u.name && u.business_name && (
                        <div className="text-xs text-zinc-500">{u.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-zinc-900">{u.email || '—'}</div>
                      {showContact && (
                        <div className="text-xs text-zinc-500">
                          {u.contact_email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-900">
                      {u.trips_count}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {u.onboarded ? (
                        <span className="text-emerald-600">✓</span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-zinc-500">
                      {fmtDate(u.created_at)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setConfirmFor(u)}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                      >
                        Impersonate
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {confirmFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl">
            <h2 className="text-base font-medium text-zinc-900">
              Impersonate user
            </h2>
            <p className="mt-2 text-sm text-zinc-700">
              Impersonate{' '}
              <span className="font-medium">
                {confirmFor.email || operatorLabel(confirmFor)}
              </span>
              ? Your session will switch until you click Exit impersonation.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmFor(null)}
                disabled={impersonating}
                className="rounded border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => doImpersonate(confirmFor)}
                disabled={impersonating}
                className="inline-flex items-center gap-1 rounded bg-zinc-900 px-3 py-1 text-sm text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {impersonating && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
