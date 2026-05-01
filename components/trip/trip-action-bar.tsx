'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { ChevronDown, Eye } from 'lucide-react'
import ShareMenu from '@/components/share-menu'
import { ActivateStubModal } from '@/components/activate-stub-modal'
import { apiFetch } from '@/lib/api'
import { getStatusMeta, buildTripMenu } from '@/lib/trip-status'
import { ThemeSwitcher } from '@/components/trip/theme-switcher'
import type { ThemeId } from '@/lib/themes'

type Props = {
  projectId: string
  status: string
  title: string
  shareUrl: string
  canShare: boolean
  /** Persisted design_theme from the project (null = default 'editorial'). */
  designTheme?: string | null
  onPreviewAsClient: () => void
  onStatusChanged?: () => void
  onRequestArchive: () => void
  onRequestDelete: () => void
  /** Showcase / demo plumbing — passed straight to ThemeSwitcher. */
  isShowcase?: boolean
  onLocalThemeChange?: (next: ThemeId) => void
  /**
   * Top offset (px) for the sticky position. Used in showcase mode to
   * push the action bar below the demo banner so both stay visible.
   * Default 0.
   */
  topOffset?: number
}

/**
 * Thin action bar shown under the global Header for owners (not previewing).
 * Uses `relative z-30` so dropdowns render above the hero section's
 * absolutely-positioned elements.
 *
 *   Left:  status pill — also a dropdown trigger that opens the action menu
 *          (Activate / Archive / Delete / Restore — depends on current status)
 *   Right: theme switcher · Preview as client · Share
 *
 * Hidden entirely in preview mode and for non-owners.
 */
export function TripActionBar({
  projectId,
  status,
  title,
  shareUrl,
  canShare,
  designTheme,
  onPreviewAsClient,
  onStatusChanged,
  onRequestArchive,
  onRequestDelete,
  isShowcase,
  onLocalThemeChange,
  topOffset = 0,
}: Props) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activateStubOpen, setActivateStubOpen] = useState(false)
  const triggerWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (triggerWrapRef.current && !triggerWrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [menuOpen])

  const changeStatus = async (next: string, verb: string) => {
    if (busy) return
    setBusy(true)
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Sign in again')
        return
      }
      const res = await apiFetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || `Could not ${verb}`)
        return
      }
      toast.success(`${title} — ${verb}d`)
      onStatusChanged?.()
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  const restoreFromArchive = async () => {
    if (busy) return
    setBusy(true)
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Sign in again')
        return
      }
      const res = await apiFetch(`/api/projects/${projectId}/restore`, {
        method: 'POST',
        token,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Could not restore')
        return
      }
      toast.success(`${title} — restored`)
      onStatusChanged?.()
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  const meta = getStatusMeta(status)

  const items = buildTripMenu(status, {
    changeStatus: (next) =>
      changeStatus(next, next === 'completed' ? 'complete' : next === 'active' ? 'reactivate' : next),
    requestArchive: onRequestArchive,
    requestDelete: onRequestDelete,
    restore: restoreFromArchive,
    onActivate: status === 'quoted' ? () => setActivateStubOpen(true) : undefined,
  })

  return (
    <>
      <div
        className="sticky z-30 w-full border-b border-border/60 bg-background/95 backdrop-blur-sm"
        style={{ top: topOffset }}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          {/* LEFT: status dropdown — pill shows current status, click reveals
              the actions list. Replaces what used to be three controls
              (chip + Activate/Restore button + ⋮ overflow). */}
          <div ref={triggerWrapRef} className="relative inline-block">
            <button
              type="button"
              onClick={() => items.length > 0 && setMenuOpen((v) => !v)}
              disabled={busy || items.length === 0}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-sans font-semibold uppercase tracking-wider rounded-full transition-opacity hover:opacity-80 disabled:opacity-60 ${meta.chipClass}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              {meta.hasDot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
              <span>{meta.label}</span>
              {items.length > 0 && <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {menuOpen && items.length > 0 && (
              <div
                role="menu"
                className="absolute left-0 mt-2 w-56 rounded-xl bg-background border border-border shadow-lg py-1 z-30"
              >
                {items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      item.onClick()
                    }}
                    disabled={busy}
                    className={
                      'block w-full text-left px-4 py-2 text-sm transition-colors disabled:opacity-60 ' +
                      (item.variant === 'danger'
                        ? 'text-destructive hover:bg-destructive/10'
                        : 'hover:bg-secondary')
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: agent tools */}
          <div className="flex items-center gap-2">
            <ThemeSwitcher
              projectId={projectId}
              value={designTheme}
              isShowcase={isShowcase}
              onLocalChange={onLocalThemeChange}
            />
            <div className="w-px h-5 bg-border/60 hidden sm:block" aria-hidden="true" />
            <button
              type="button"
              onClick={onPreviewAsClient}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview as client</span>
              <span className="sm:hidden">Preview</span>
            </button>
            {canShare && <ShareMenu title={title} url={shareUrl} publicStatus={status} />}
          </div>
        </div>
      </div>

      <ActivateStubModal open={activateStubOpen} onClose={() => setActivateStubOpen(false)} />
    </>
  )
}

