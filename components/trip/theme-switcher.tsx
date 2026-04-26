'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Check, ChevronDown } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { THEMES, THEME_LABELS, resolveTheme, type ThemeId } from '@/lib/themes'

type Props = {
  projectId: string
  /** Current persisted value from the project — null defaults to 'editorial'. */
  value: string | null | undefined
}

/**
 * Dropdown theme selector. Owner-only — placed in the trip action bar,
 * clients never see it.
 *
 * Items: the 3 selectable themes (Editorial / Expedition / Compact) plus
 * a 4th disabled "Make your own" placeholder with a "Coming soon" hint.
 *
 * Save flow (unchanged from the previous segmented variant):
 *   1. Optimistic UI update (set local state immediately)
 *   2. PATCH /api/projects/:id with { designTheme: '...' }
 *   3. On 200 — router.refresh() so SSR re-fetches with the new theme
 *   4. On error — revert + toast
 */
export function ThemeSwitcher({ projectId, value }: Props) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [optimistic, setOptimistic] = useState<ThemeId>(resolveTheme(value))
  const [isPending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  const handleSelect = async (next: ThemeId) => {
    if (busy || next === optimistic) {
      setOpen(false)
      return
    }
    const previous = optimistic
    setOptimistic(next) // optimistic
    setOpen(false)
    setBusy(true)
    try {
      const token = await getToken()
      if (!token) {
        setOptimistic(previous)
        toast.error('Sign in again')
        return
      }
      const res = await apiFetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ designTheme: next }),
      })
      if (!res.ok) {
        setOptimistic(previous)
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || `Could not switch theme (${res.status})`)
        return
      }
      // Success — let SSR re-fetch the project so server state is fresh.
      startTransition(() => router.refresh())
    } catch {
      setOptimistic(previous)
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy || isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>Pick a design</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Trip page design"
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
                onClick={() => handleSelect(id)}
                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
              >
                <Check
                  className={
                    'w-4 h-4 flex-shrink-0 ' + (active ? 'text-accent' : 'text-transparent')
                  }
                />
                <span className={active ? 'font-semibold' : ''}>{THEME_LABELS[id]}</span>
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
  )
}
