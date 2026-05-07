'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { apiFetch, clearImpersonation, getImpersonationToken } from '@/lib/api'

interface ImpersonationInfo {
  email: string | null
  name: string | null
}

/**
 * Persistent banner shown on every page while an admin is impersonating
 * another user. Reads sessionStorage on mount; stays in sync via the
 * `storage` event so the banner reflects state across tabs/windows in
 * the same session.
 *
 * The banner itself doesn't fetch — the admin page that started
 * impersonation hands the target's email/name through query params and
 * we cache them in sessionStorage alongside the token.
 */
export default function ImpersonationBanner() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [info, setInfo] = useState<ImpersonationInfo | null>(null)
  const [exiting, setExiting] = useState(false)

  // Sync from sessionStorage on mount and on storage events (other tabs).
  useEffect(() => {
    const read = () => {
      const token = getImpersonationToken()
      if (!token) {
        setInfo(null)
        return
      }
      try {
        const meta = sessionStorage.getItem('waytico:impersonation-meta')
        setInfo(meta ? JSON.parse(meta) : { email: null, name: null })
      } catch {
        setInfo({ email: null, name: null })
      }
    }
    read()
    const handler = (e: StorageEvent) => {
      if (e.key?.startsWith('waytico:impersonation-')) read()
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  async function exit() {
    if (exiting) return
    setExiting(true)
    try {
      // Best-effort audit log. The token is about to be cleared, so we
      // grab a fresh Clerk JWT to authenticate as the admin again.
      const adminToken = await getToken()
      // Need to clear impersonation token BEFORE the request so the
      // backend sees the admin's Clerk JWT, not the soon-to-be-revoked
      // impersonation token.
      clearImpersonation()
      try {
        sessionStorage.removeItem('waytico:impersonation-meta')
      } catch {}
      await apiFetch('/api/admin/impersonate/end', {
        method: 'POST',
        token: adminToken,
      }).catch(() => {})
    } finally {
      setInfo(null)
      // Send the admin back to /admin so they don't continue staring at
      // the impersonated user's stale dashboard.
      router.replace('/admin?tab=users')
    }
  }

  if (!info) return null

  const label = info.name || info.email || 'a user'

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 border-b border-amber-600 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="font-medium">
          ⚠ Viewing as <strong>{label}</strong>{' '}
          <span className="font-normal opacity-75">
            (admin support session)
          </span>
        </div>
        <button
          type="button"
          onClick={exit}
          disabled={exiting}
          className="px-3 h-7 rounded-md bg-amber-950 text-amber-100 text-xs font-medium hover:bg-amber-900 transition-colors disabled:opacity-60"
        >
          {exiting ? 'Exiting…' : 'Exit impersonation'}
        </button>
      </div>
    </div>
  )
}
