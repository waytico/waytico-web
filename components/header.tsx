'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs'

export default function Header() {
  return (
    <header className="w-full border-b border-border/50 bg-background/80 backdrop-blur-sm">
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
              href="/dashboard"
              className="text-foreground/70 hover:text-foreground transition-colors font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-sm font-medium bg-accent text-accent-foreground hover:opacity-90 transition-opacity rounded-md"
            >
              <Plus className="w-4 h-4" /> New quote
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  )
}

