/**
 * Admin shell — Stage 11 Block A (security fix).
 *
 * Server-side auth gate. Two-layer defense in depth:
 *   1. middleware.ts redirects anonymous visitors before this renders.
 *   2. This layout double-checks auth and additionally enforces the
 *      ADMIN_EMAILS allowlist (which middleware can't — it requires a
 *      backend round-trip).
 *
 * Resolution order:
 *   - userId === null  → redirect to /sign-in?redirect_url=/admin
 *   - is_admin === false → redirect to /dashboard (no admin shell HTML)
 *   - else → render shell
 *
 * Backend /api/admin/* endpoints are independently gated by
 * requireAdmin (ADMIN_EMAILS allowlist on the server). This layout's
 * sole job is to prevent the shell HTML (sidebar nav structure) from
 * being delivered to unauthorized visitors.
 *
 * The sidebar moved to ./_components/admin-sidebar.tsx because it
 * needs usePathname for active-link styling — that's a client concern.
 */

import type { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { AdminSidebar } from './_components/admin-sidebar'

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

async function isAdminUser(): Promise<boolean> {
  const { getToken } = auth()
  const token = await getToken().catch(() => null)
  if (!token) return false
  try {
    const res = await fetch(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return false
    const j = (await res.json()) as { user?: { is_admin?: boolean } }
    return !!j.user?.is_admin
  } catch {
    return false
  }
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const { userId } = auth()
  if (!userId) {
    redirect('/sign-in?redirect_url=/admin')
  }

  const ok = await isAdminUser()
  if (!ok) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
          <aside className="md:w-56 shrink-0">
            <AdminSidebar />
          </aside>
          <section className="flex-1 min-w-0">{children}</section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
