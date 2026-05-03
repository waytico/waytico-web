'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

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
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
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
          max-w-7xl mx-auto px-4 py-1.5
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

/** Left global slot: Waytico wordmark + "+ New quote" pill (signed-in only). */
function GlobalLeft() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/"
        className="text-xl font-semibold font-serif tracking-tight hover:opacity-80 transition-opacity"
      >
        Waytico
      </Link>
      <SignedIn>
        <Link
          href="/"
          className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium border border-accent/40 text-accent hover:bg-accent/10 transition-colors rounded-md whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          New<span className="hidden sm:inline">&nbsp;quote</span>
        </Link>
      </SignedIn>
    </div>
  )
}

/** Right global slot: Log-in link (signed-out) or Dashboard + avatar (signed-in). */
function GlobalRight() {
  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <Link
          href="/sign-in"
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
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  )
}
