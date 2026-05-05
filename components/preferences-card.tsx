'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { THEME_LABELS, type ThemeId } from '@/lib/themes'

/**
 * Themes shown in the user-facing default-theme selector. THEMES enum
 * stays full so legacy users with an old default_theme still see their
 * saved value (rendered as a disabled 'Legacy' row); only the active
 * choice list is filtered. Trip-page Pass C hides editorial / expedition
 * / compact and surfaces Magazine as the single default.
 */
const VISIBLE_THEMES: ReadonlyArray<ThemeId> = ['magazine']

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
  brand_terms: string | null
  default_quote_validity_days: number | null
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

  async function saveTerms(value: string): Promise<boolean> {
    return patchUser({ brandTerms: value || null })
  }

  async function saveQuoteValidity(days: number): Promise<boolean> {
    return patchUser({ defaultQuoteValidityDays: days })
  }

  // Hide the card while we're fetching so it doesn't briefly flash
  // an empty placeholder above the trip list.
  if (loading || !profile) return null

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6">
      <DefaultThemeRow value={profile.default_theme} onSave={saveDefaultTheme} />
      <div className="mt-2 pt-2 border-t border-border/50">
        <QuoteValidityRow
          value={profile.default_quote_validity_days}
          onSave={saveQuoteValidity}
        />
      </div>
      <div className="mt-2 pt-2 border-t border-border/50">
        <BrandTermsRow value={profile.brand_terms} onSave={saveTerms} />
      </div>
    </div>
  )
}

// ─── Default theme row ────────────────────────────────────────
//
// Mirrors the trip-page ThemeSwitcher (button trigger + dropdown with
// check marks + disabled "Make your own" placeholder), but persists to
// the user profile, not a single trip.

const DEFAULT_THEME_FALLBACK_LABEL = 'Use Magazine'

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
            {/* Legacy default-theme: surface as a disabled row so the
                operator can see why their saved selection isn't a
                clickable option in the new menu. */}
            {optimistic && !VISIBLE_THEMES.includes(optimistic) && (
              <button
                type="button"
                role="option"
                aria-disabled="true"
                disabled
                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm cursor-not-allowed opacity-50"
              >
                <Check className="w-4 h-4 flex-shrink-0 text-accent" />
                <span className="font-semibold">{THEME_LABELS[optimistic]}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-foreground/50">
                  Legacy
                </span>
              </button>
            )}
            {VISIBLE_THEMES.map((id) => {
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

            {/* Two more SOON placeholders for upcoming themes — kept
                in sync with theme-switcher.tsx. Static UI hints with
                no handler; when the themes ship they'll be added to
                THEMES and become real options. */}
            <button
              type="button"
              role="option"
              aria-disabled="true"
              disabled
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm cursor-not-allowed opacity-50"
            >
              <Check className="w-4 h-4 flex-shrink-0 text-transparent" />
              <span>Serene</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-foreground/50">
                Soon
              </span>
            </button>
            <button
              type="button"
              role="option"
              aria-disabled="true"
              disabled
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm cursor-not-allowed opacity-50"
            >
              <Check className="w-4 h-4 flex-shrink-0 text-transparent" />
              <span>Frontier</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-foreground/50">
                Soon
              </span>
            </button>

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

// ─── Default Terms row ─────────────────────────────────────
//
// Multi-paragraph default Terms paragraph that gets snapshotted onto
// trip_projects.terms at create time (DEFAULT_BRAND_TERMS seeds it for
// new accounts; operators can edit here and the change applies to all
// future trips). Per-trip overrides on the trip page take precedence.
//
// Display: single-row strip (truncated value, Edit affordance) — same
// rhythm as the other preference rows.
// Edit: full-width textarea + Save / Cancel.

type BrandTermsRowProps = {
  value: string | null
  onSave: (v: string) => Promise<boolean>
}

function BrandTermsRow({ value, onSave }: BrandTermsRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(value || '')
  }, [value, editing])

  async function commit() {
    if (saving) return
    const trimmed = draft.trim()
    if (trimmed === (value || '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    const ok = await onSave(trimmed)
    setSaving(false)
    if (ok) setEditing(false)
    else setDraft(value || '')
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full flex items-center gap-3 px-2 py-1.5 -mx-2 rounded text-left text-sm hover:bg-secondary/40 border border-transparent hover:border-border transition-colors"
      >
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-sm text-foreground">Default trip terms</span>
          <span
            className={`text-xs truncate ${
              value ? 'text-foreground/55' : 'text-foreground/40 italic'
            }`}
          >
            {value || 'Auto-applied to every new trip. Cancellation, deposit, etc.'}
          </span>
        </div>
        <span className="text-xs text-foreground/50 shrink-0">Edit</span>
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-2">
        <span className="text-xs uppercase tracking-wider text-foreground/50">
          Default trip terms
        </span>
      </div>
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            setDraft(value || '')
            setEditing(false)
          }
        }}
        disabled={saving}
        rows={10}
        placeholder="Cancellation policy, deposit, force majeure, etc."
        className="w-full bg-background border border-accent/40 rounded px-3 py-2 text-sm outline-none focus:border-accent resize-y"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setDraft(value || '')
            setEditing(false)
          }}
          disabled={saving}
          className="text-xs text-foreground/60 hover:text-foreground px-2 py-1"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={commit}
          disabled={saving}
          className="text-xs bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 px-3 py-1 rounded transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ─── Quote validity (days) row ─────────────────────────────────────
//
// Per-user override for how many days a freshly-created quote stays
// valid. Snapshotted into trip_projects.valid_until at create time.
//
// Display contract follows DefaultThemeRow: title + caption on the
// left, an always-visible compact control on the right — no Edit
// button, no two-step open/close. The numeric input is the control.
//
// The input always shows a number (program default 5 if backend
// returned NULL) — operators see "5" rather than empty placeholder
// noise. Saves on blur or Enter when the value actually changed and
// is in [1, 365]. Out-of-range or non-integer input is rejected with
// a toast and the input snaps back to the previous saved value.

const QUOTE_VALIDITY_PROGRAM_DEFAULT = 5

type QuoteValidityRowProps = {
  value: number | null
  onSave: (v: number) => Promise<boolean>
}

function QuoteValidityRow({ value, onSave }: QuoteValidityRowProps) {
  // Resolve NULL → program default for both display and the persisted
  // save target. The backend column stays nullable; we just hide that
  // distinction from the operator since they always see a concrete
  // number on screen.
  const effective = value ?? QUOTE_VALIDITY_PROGRAM_DEFAULT
  const [draft, setDraft] = useState<string>(String(effective))
  const [saving, setSaving] = useState(false)

  // Re-sync local draft when the parent profile reloads (post-save or
  // initial fetch). Without this, a stale draft could persist after
  // the parent state catches up.
  useEffect(() => {
    setDraft(String(value ?? QUOTE_VALIDITY_PROGRAM_DEFAULT))
  }, [value])

  async function commit() {
    if (saving) return
    const trimmed = draft.trim()
    const n = Number(trimmed)
    if (trimmed === '' || !Number.isInteger(n) || n < 1 || n > 365) {
      toast.error('Enter a whole number between 1 and 365')
      setDraft(String(effective))
      return
    }
    if (n === effective) return // no-op when value unchanged
    setSaving(true)
    const ok = await onSave(n)
    setSaving(false)
    if (!ok) setDraft(String(effective))
  }

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-1">
      <div className="flex flex-col">
        <span className="text-sm text-foreground">Quote validity</span>
        <span className="text-xs text-foreground/55">
          How long a new quote stays open before it expires
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={365}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.currentTarget as HTMLInputElement).blur()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setDraft(String(effective))
              ;(e.currentTarget as HTMLInputElement).blur()
            }
          }}
          disabled={saving}
          aria-label="Quote validity in days"
          className="w-16 bg-background border border-border rounded-full px-3 py-1.5 text-sm text-foreground/80 text-center outline-none focus:border-accent disabled:opacity-60"
        />
        <span className="text-sm text-foreground/60">days</span>
      </div>
    </div>
  )
}
