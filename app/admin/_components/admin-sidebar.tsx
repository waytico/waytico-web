'use client'

/**
 * Admin sidebar — Stage 11 Block A.
 *
 * Extracted from app/admin/layout.tsx so the layout can be a server
 * component (where Clerk auth() runs and unauthorized visitors are
 * redirected before any HTML is generated). The sidebar still needs
 * usePathname for active-link styling, so it lives here as a small
 * client island.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/admin', label: 'Stats' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/photo-bank', label: 'Photo bank' },
]

export function AdminSidebar() {
  const pathname = usePathname() || '/admin'
  return (
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
  )
}
