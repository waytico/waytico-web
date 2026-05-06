'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useClerk, useUser } from '@clerk/nextjs'
import BrandCard from '@/components/brand-card'
import PreferencesCard from '@/components/preferences-card'
import Header from '@/components/header'
import Footer from '@/components/footer'

/**
 * Operator account & profile settings.
 *
 * Brand and Preferences cards are the same components shown on the
 * dashboard; both fetch /api/users/me independently. Account section
 * surfaces Clerk's hosted UserProfile flow via the modal-style
 * `openUserProfile()` so we don't have to embed it inline.
 *
 * Danger zone (account deletion) is an explicit support contact for
 * now — actual self-serve delete needs a backend cascade we haven't
 * built yet (trip_projects, clients, media, email_log etc.).
 */
export default function SettingsPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { openUserProfile, signOut } = useClerk()
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/sign-in')
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <main className="flex-1" />
        <Footer />
      </div>
    )
  }

  const primaryEmail = user?.primaryEmailAddress?.emailAddress

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-1">
            Settings
          </h1>
          <p className="text-sm text-foreground/60">
            Manage your account, brand, and preferences.
          </p>
        </div>

        {/* Account section. Clerk owns email/password/MFA; we just give
            the operator a button to open Clerk's hosted profile UI. */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/55 mb-3">
            Account
          </h2>
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {user?.fullName || user?.firstName || 'Your account'}
                </div>
                {primaryEmail && (
                  <div className="text-sm text-foreground/60 truncate">
                    {primaryEmail}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openUserProfile()}
                  className="text-sm px-3 h-8 rounded-md border border-border hover:bg-secondary/50 transition-colors"
                >
                  Manage account
                </button>
                <button
                  type="button"
                  onClick={() => signOut({ redirectUrl: '/' })}
                  className="text-sm px-3 h-8 rounded-md border border-border hover:bg-secondary/50 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
            <p className="text-xs text-foreground/50">
              Email, password, and two-factor authentication are managed in
              the account dialog.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/55 mb-3">
            Brand
          </h2>
          <BrandCard />
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/55 mb-3">
            Preferences
          </h2>
          <PreferencesCard />
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-destructive/70 mb-3">
            Danger zone
          </h2>
          <div className="rounded-lg border border-destructive/30 bg-card p-5">
            <div className="text-sm font-medium text-foreground mb-1">
              Delete account
            </div>
            <p className="text-sm text-foreground/65 mb-3">
              Permanently removes your account and all trips. This isn&apos;t
              reversible. To proceed, email us at{' '}
              <a
                href="mailto:hello@waytico.com?subject=Delete%20my%20account"
                className="underline hover:no-underline"
              >
                hello@waytico.com
              </a>{' '}
              and we&apos;ll process it within one business day.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
