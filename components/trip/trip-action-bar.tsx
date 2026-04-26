'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Eye, RotateCcw } from 'lucide-react'
import ActivateButton from '@/components/activate-button'
import ShareMenu from '@/components/share-menu'
import ActionMenu from '@/components/action-menu'
import { apiFetch } from '@/lib/api'
import { getStatusMeta, buildTripMenu, type TripStatus } from '@/lib/trip-status'
import { ThemeSwitcher } from '@/components/trip/theme-switcher'

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
}

/**
 * Thin action bar shown under the global Header for owners (not previewing).
 * Uses `relative z-30` so the overflow menu dropdown renders above the hero
 * section's absolutely-positioned elements.
 *
 *   Left:  status pill + primary state action (Activate / Restore) + overflow menu
 *   Right: Preview-as-client + Share-with-client
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
}: Props) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [busy, setBusy] = useState(false)

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

  // Restore goes via the dedicated endpoint so the server can return the trip
  // to its actual previous status (quoted / active / completed) instead of
  // always defaulting to 'quoted'.
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

  const overflow = buildTripMenu(status, {
    changeStatus: (next) => changeStatus(next, next === 'completed' ? 'complete' : next === 'active' ? 'reactivate' : next),
    requestArchive: onRequestArchive,
    requestDelete: onRequestDelete,
    restore: restoreFromArchive,
  })

  return (
    <div className="relative z-30 w-full border-b border-border/60 bg-background/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        {/* LEFT: status + primary action + overflow */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-sans font-semibold uppercase tracking-wider rounded-full ${meta.chipClass}`}
          >
            {meta.hasDot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            {meta.label}
          </span>

          {status === 'quoted' && (
            <ActivateButton projectId={projectId} publicStatus={status} variant="compact" />
          )}

          {status === 'archived' && (
            <button
              type="button"
              onClick={restoreFromArchive}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold text-accent hover:bg-accent/10 transition-colors disabled:opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>
          )}

          {overflow.length > 0 && <ActionMenu items={overflow} align="left" />}
        </div>

        {/* RIGHT: agent tools */}
        <div className="flex items-center gap-2">
          <ThemeSwitcher projectId={projectId} value={designTheme} />
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
  )
}
