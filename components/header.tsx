'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { SignedIn, SignedOut, UserButton, useAuth } from '@clerk/nextjs'

export default function Header() {
  const { isSignedIn } = useAuth()

  // Sticky for signed-in operators so the top nav stays reachable while
  // they scroll long trip pages. Public pages keep the static header so
  // the hero gets the full vertical canvas. The 64px figure matches
  // py-4 + contents — other sticky elements on trip-page (action bar,
  // preview banner, anon banner) are offset by the same value to stack
  // cleanly under it.
  const stickyClasses = isSignedIn
    ? 'sticky top-0 z-30 bg-background/95 backdrop-blur'
    : 'bg-background/80 backdrop-blur-sm'

  return (
    <header className={`w-full border-b border-border/50 ${stickyClasses}`}>
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold font-serif tracking-tight hover:opacity-80 transition-opacity">
          Waytico
        </Link>
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
              href="/"
              className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium border border-accent/40 text-accent hover:bg-accent/10 transition-colors rounded-md"
            >
              <Plus className="w-3.5 h-3.5" /> New quote
            </Link>
            <Link
              href="/dashboard"
              className="text-foreground/70 hover:text-foreground transition-colors font-medium"
            >
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  )
}


