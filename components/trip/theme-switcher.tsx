'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { THEMES, THEME_LABELS, resolveTheme, type ThemeId } from '@/lib/themes'

type Props = {
  projectId: string
  /** Current persisted value from the project — null defaults to 'editorial'. */
  value: string | null | undefined
}

/**
 * Three-segment theme selector ("Editorial · Expedition · Compact"), per
 * TZ-6 §5.3:
 *   1. Optimistic UI update (set local state immediately)
 *   2. PATCH /api/projects/:id with { designTheme: '...' }
 *   3. On 200 — router.refresh() so SSR re-fetches with the new theme
 *   4. On error — revert + toast
 *
 * Owner-only — placed in the trip action bar; clients never see it.
 */
export function ThemeSwitcher({ projectId, value }: Props) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [optimistic, setOptimistic] = useState<ThemeId>(resolveTheme(value))
  const [isPending, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)

  const handleSelect = async (next: ThemeId) => {
    if (busy || next === optimistic) return
    const previous = optimistic
    setOptimistic(next) // optimistic
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
    <div
      className="inline-flex items-center rounded-full border border-border bg-background p-0.5 text-xs font-sans"
      role="radiogroup"
      aria-label="Trip page theme"
    >
      {THEMES.map((id) => {
        const active = id === optimistic
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={busy || isPending}
            onClick={() => handleSelect(id)}
            className={
              'rounded-full px-3 py-1 transition-colors disabled:opacity-60 ' +
              (active
                ? 'bg-accent text-accent-foreground font-semibold'
                : 'text-foreground/70 hover:text-foreground hover:bg-secondary')
            }
          >
            {THEME_LABELS[id]}
          </button>
        )
      })}
    </div>
  )
}
