'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { THEMES, THEME_LABELS, type ThemeId } from '@/lib/themes'

/**
 * PreferencesCard — operator-level settings that aren't part of the
 * brand identity (which lives in BrandCard). Today: just the default
 * trip-page design that gets snapshotted onto every new quote.
 *
 * Shape mirrors BrandCard's expanded panel (white surface, border,
 * stacked rows). New preferences plug in as additional rows under
 * the same heading; if it grows past ~3 the whole card can take a
 * collapsed strip state like BrandCard.
 *
 * Owns its own GET /api/users/me — keeps coupling with BrandCard
 * loose at the cost of one extra dashboard fetch.
 */

type UserProfile = {
  id: string
  default_theme: ThemeId | null
}

export default function PreferencesCard() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const res = await apiFetch('/api/users/me', { token })
        if (!res.ok) throw new Error()
        const { user } = await res.json()
        if (!cancelled) setProfile(user)
      } catch {
        if (!cancelled) toast.error('Could not load preferences')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, getToken])

  async function patchUser(patch: Record<string, unknown>): Promise<boolean> {
    try {
      const token = await getToken()
      if (!token) return false
      const res = await apiFetch('/api/users/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        toast.error('Could not save')
        return false
      }
      const { user } = await res.json()
      setProfile(user)
      return true
    } catch {
      toast.error('Network error')
      return false
    }
  }

  async function saveDefaultTheme(
    value: ThemeId | null,
  ): Promise<boolean> {
    return patchUser({ defaultTheme: value })
  }

  // Hide the card while we're fetching so it doesn't briefly flash
  // an empty placeholder above the trip list.
  if (loading || !profile) return null

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6">
      <DefaultThemeRow value={profile.default_theme} onSave={saveDefaultTheme} />
    </div>
  )
}

// ─── Default theme row ────────────────────────────────────────
//
// Mirrors the trip-page ThemeSwitcher (button trigger + dropdown with
// check marks + disabled "Make your own" placeholder), but persists to
// the user profile, not a single trip.

const DEFAULT_THEME_FALLBACK_LABEL = 'Use Classic'

function DefaultThemeRow({
  value,
  onSave,
}: {
  value: ThemeId | null
  onSave: (next: ThemeId | null) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [optimistic, setOptimistic] = useState<ThemeId | null>(value)
  const ref = useRef<HTMLDivElement>(null)

  // Keep optimistic state in sync with parent re-fetches (e.g. after
  // first save). Without this the dropdown could keep showing a stale
  // value if the parent reloaded the profile with the latest data.
  useEffect(() => {
    setOptimistic(value)
  }, [value])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  async function pick(next: ThemeId | null) {
    if (busy) {
      setOpen(false)
      return
    }
    if (next === optimistic) {
      setOpen(false)
      return
    }
    const previous = optimistic
    setOptimistic(next)
    setOpen(false)
    setBusy(true)
    const ok = await onSave(next)
    setBusy(false)
    if (!ok) setOptimistic(previous)
  }

  const triggerLabel = optimistic
    ? THEME_LABELS[optimistic]
    : DEFAULT_THEME_FALLBACK_LABEL

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-1">
      <div className="flex flex-col">
        <span className="text-sm text-foreground">Default trip design</span>
        <span className="text-xs text-foreground/55">
          Applied to every new quote you create
        </span>
      </div>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-foreground/80 border border-border hover:bg-secondary transition-colors disabled:opacity-60"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span>{triggerLabel}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {open && (
          <div
            role="listbox"
            aria-label="Default trip design"
            className="absolute right-0 mt-2 w-56 rounded-xl bg-background border border-border shadow-lg py-1 z-30"
          >
            {THEMES.map((id) => {
              const active = id === optimistic
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(id)}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  <Check
                    className={
                      'w-4 h-4 flex-shrink-0 ' +
                      (active ? 'text-accent' : 'text-transparent')
                    }
                  />
                  <span className={active ? 'font-semibold' : ''}>
                    {THEME_LABELS[id]}
                  </span>
                </button>
              )
            })}

            {/* Custom — disabled placeholder for the future custom-theme builder. */}
            <button
              type="button"
              role="option"
              aria-disabled="true"
              disabled
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm cursor-not-allowed opacity-50"
            >
              <Check className="w-4 h-4 flex-shrink-0 text-transparent" />
              <span>Make your own</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-foreground/50">
                Soon
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
