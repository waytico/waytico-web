'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { SignedIn, SignedOut, UserButton, useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

type Props = {
  /**
   * When provided, the bar reflows to host trip-level actions in
   * addition to the global nav.
   *
   *  ≥ sm: 3-column grid — [global-left] [trip-actions] [global-right].
   *  < sm: 2-row grid — top row is the global nav (Waytico + Dashboard +
   *        avatar), the actions row spans the full width below.
   *
   * Pass plain JSX (e.g. `<TripActionBar … />`). The same node is
   * placed once in the DOM and CSS-grid moves it between rows /
   * columns, so there is no duplicated React state for dropdowns.
   *
   * Leave undefined on every page that isn't the owner's trip view —
   * the bar collapses back to its single-row default layout.
   */
  tripActions?: ReactNode
}

/**
 * Global app header. Sticky on every page so the nav (and, on the
 * owner's trip view, the trip actions) stays reachable as the user
 * scrolls. Padding is intentionally tight: 8px top + 8px bottom +
 * 28px controls ≈ 44px on desktop. The mobile two-row variant runs
 * about 84px including row gap.
 */
export default function Header({ tripActions }: Props) {
  // Plain global header — used by every non-trip page (home, dashboard,
  // info pages) and by the owner trip view when there are no trip-level
  // actions to host (the owner is mid-creation, etc.).
  if (!tripActions) {
    return (
      <header className="sticky top-0 z-30 w-full border-b border-border/50 bg-background/95 backdrop-blur-sm">
        <div className="w-full px-4 sm:px-8 lg:px-12 py-1.5 flex items-center justify-between">
          <GlobalLeft />
          <GlobalRight />
        </div>
      </header>
    )
  }

  // Combined header — global nav + trip actions in one sticky bar.
  // Single DOM node for tripActions; CSS grid handles the layout swap.
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/50 bg-background/95 backdrop-blur-sm">
      <div
        className="
          w-full px-4 sm:px-8 lg:px-12 py-1.5
          grid items-center
          grid-cols-[auto_1fr] grid-rows-[auto_auto] gap-x-3 gap-y-1.5
          sm:grid-cols-[auto_1fr_auto] sm:grid-rows-1 sm:gap-y-0 sm:gap-x-3
        "
      >
        <div className="row-start-1 col-start-1 justify-self-start">
          <GlobalLeft />
        </div>
        <div className="row-start-1 col-start-2 justify-self-end sm:col-start-3">
          <GlobalRight />
        </div>
        <div className="row-start-2 col-span-2 sm:row-start-1 sm:col-start-2 sm:col-span-1 sm:justify-self-center min-w-0">
          {tripActions}
        </div>
      </div>
    </header>
  )
}

/** Left global slot: Waytico wordmark (links to home). */
function GlobalLeft() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/"
        aria-label="Waytico — home"
        className="inline-block hover:opacity-80 transition-opacity"
      >
        <Image
          src="/waytico-wordmark.svg"
          alt="Waytico"
          width={103}
          height={22}
          priority
          unoptimized
        />
      </Link>
    </div>
  )
}

/** Right global slot: Log-in link (signed-out) or Dashboard + avatar (signed-in).
 *
 *  Trip-page Log-in carries a redirect_url back to the page the visitor
 *  was on, so an operator who lands on their own trip-page as a
 *  guest (or any signed-out viewer who clicks Log-in) returns to the
 *  same trip after authenticating, instead of being dumped at /
 *  (Clerk's default). On non-trip pages the link stays plain — the
 *  default fallback (/) is the right destination from / about /
 *  pricing / etc., where the user is most likely heading to /dashboard
 *  next anyway. Clerk's redirect_url query-param is the documented
 *  mechanism for this and is honoured by <SignIn /> out of the box. */
function GlobalRight() {
  const pathname = usePathname() || '/'
  const signInHref = pathname.startsWith('/t/')
    ? `/sign-in?redirect_url=${encodeURIComponent(pathname)}`
    : '/sign-in'
  const { getToken, isSignedIn } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (!isSignedIn) {
      setIsAdmin(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken().catch(() => null)
        const headers = new Headers()
        if (token) headers.set('Authorization', `Bearer ${token}`)
        const res = await fetch(`${API_URL}/api/users/me`, { headers })
        if (!res.ok) return
        const j = (await res.json()) as { user?: { is_admin?: boolean } }
        if (!cancelled) setIsAdmin(!!j.user?.is_admin)
      } catch {
        // ignore — admin link just won't render
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isSignedIn, getToken])
  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <Link
          href={signInHref}
          className="text-foreground/70 hover:text-foreground transition-colors font-medium"
        >
          Log in
        </Link>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="text-foreground/70 hover:text-foreground transition-colors font-medium"
        >
          Dashboard
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="text-foreground/70 hover:text-foreground transition-colors font-medium"
          >
            Admin
          </Link>
        )}
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  )
}

