'use client'

/**
 * Admin shell — TZ Photo Bank Stage 10 Block D.
 *
 * Sidebar nav for admin tools. Routes:
 *   /admin            — Stats landing (placeholder)
 *   /admin/photo-bank — Review queue
 *   /admin/photo-bank/crawl — Ad-hoc crawler
 *
 * Auth gate is server-side: every backend admin endpoint sits behind
 * `requireAdmin` (ADMIN_EMAILS allowlist). The frontend doesn't try to
 * pre-render anything sensitive — list/crawl/edit calls are made
 * client-side with the operator's Clerk Bearer token; non-admin users
 * see 401/403 and the empty UI gracefully.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Header from '@/components/header'
import Footer from '@/components/footer'

const NAV_ITEMS = [
  { href: '/admin', label: 'Stats' },
  { href: '/admin/photo-bank', label: 'Photo bank' },
  { href: '/admin/photo-bank/crawl', label: 'Ad-hoc crawl' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin'
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
          <aside className="md:w-56 shrink-0">
            <nav className="flex flex-col gap-1 text-sm">
              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      'rounded px-3 py-2 transition-colors ' +
                      (active
                        ? 'bg-zinc-900 text-white'
                        : 'text-zinc-700 hover:bg-zinc-100')
                    }
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </aside>
          <section className="flex-1 min-w-0">{children}</section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
