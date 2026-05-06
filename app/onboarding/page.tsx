'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

/**
 * One-screen onboarding for newly registered operators.
 *
 * - Pulls /api/users/me to seed initial values (Clerk webhook may have
 *   already populated email/name).
 * - On Continue: PATCH /api/users/me with the entered fields and
 *   onboarded=true, then redirect to /dashboard.
 * - Skip simply marks onboarded=true and redirects — operators can
 *   always come back via Settings.
 *
 * Already-onboarded users get bounced straight to /dashboard so this
 * page never shows twice.
 */
export default function OnboardingPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [brandTagline, setBrandTagline] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace('/sign-in')
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        const res = await apiFetch('/api/users/me', { token, cache: 'no-store' })
        if (!res.ok) {
          if (active) setLoaded(true)
          return
        }
        const data = await res.json()
        const u = data.user
        if (!active) return
        // Already onboarded → skip the screen entirely.
        if (u?.onboarded) {
          router.replace('/dashboard')
          return
        }
        setBusinessName(u?.business_name ?? '')
        setContactEmail(u?.contact_email ?? '')
        setBrandTagline(u?.brand_tagline ?? '')
        setLoaded(true)
      } catch {
        if (active) setLoaded(true)
      }
    })()
    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, getToken, router])

  async function save(markOnboarded: boolean) {
    if (saving) return
    setSaving(true)
    try {
      const token = await getToken()
      const body: Record<string, unknown> = { onboarded: markOnboarded }
      if (businessName.trim()) body.businessName = businessName.trim()
      if (contactEmail.trim()) body.contactEmail = contactEmail.trim()
      if (brandTagline.trim()) body.brandTagline = brandTagline.trim()
      const res = await apiFetch('/api/users/me', {
        token,
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || `HTTP ${res.status}`)
      }
      router.replace('/dashboard')
    } catch (err: any) {
      toast.error(err?.message || "Couldn't save — try again")
      setSaving(false)
    }
  }

  if (!isLoaded || !isSignedIn || !loaded) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <Header />
        <main className="flex-1" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/55 mb-3">
            Welcome
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-3">
            Let&apos;s set up your brand
          </h1>
          <p className="text-base text-foreground/65 max-w-md mx-auto">
            These show up on every quote you send. You can edit any of this
            later from Settings.
          </p>
        </div>

        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            save(true)
          }}
        >
          <div>
            <label
              htmlFor="business-name"
              className="block text-sm font-medium mb-1.5"
            >
              Business name
            </label>
            <input
              id="business-name"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Maison Voyage"
              maxLength={200}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="text-xs text-foreground/50 mt-1">
              Appears in the header of every trip page you send.
            </p>
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="block text-sm font-medium mb-1.5"
            >
              Public contact email
            </label>
            <input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="hello@yourbusiness.com"
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="text-xs text-foreground/50 mt-1">
              Shown to clients on the trip page. Different from your login
              email — keep that one private.
            </p>
          </div>

          <div>
            <label
              htmlFor="brand-tagline"
              className="block text-sm font-medium mb-1.5"
            >
              One-line tagline <span className="text-foreground/40">(optional)</span>
            </label>
            <input
              id="brand-tagline"
              type="text"
              value={brandTagline}
              onChange={(e) => setBrandTagline(e.target.value)}
              placeholder="Bespoke travel for curious travellers."
              maxLength={200}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-md bg-foreground text-background h-10 px-5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Continue'}
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={saving}
              className="text-sm text-foreground/60 hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  )
}
