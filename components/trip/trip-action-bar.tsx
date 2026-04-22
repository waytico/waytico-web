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

type Props = {
  projectId: string
  status: string
  title: string
  shareUrl: string
  canShare: boolean
  onPreviewAsClient: () => void
  onStatusChanged?: () => void
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
  onPreviewAsClient,
  onStatusChanged,
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

  // Status → chip label + colour
  const statusMeta: Record<string, { label: string; cls: string }> = {
    quoted: { label: 'Quote', cls: 'bg-accent/10 text-accent' },
    active: { label: 'Active', cls: 'bg-success/15 text-success' },
    completed: { label: 'Completed', cls: 'bg-secondary text-foreground/60' },
    archived: { label: 'Archived', cls: 'bg-secondary text-foreground/60' },
    draft: { label: 'Draft', cls: 'bg-secondary text-foreground/60' },
    generating: { label: 'Generating', cls: 'bg-secondary text-foreground/60' },
  }
  const meta = statusMeta[status] || { label: status, cls: 'bg-secondary text-foreground/60' }

  // Overflow items
  const overflow: {
    label: string
    onClick: () => void
    variant?: 'default' | 'danger'
  }[] = []
  if (status === 'active') {
    overflow.push({ label: 'Mark as completed', onClick: () => changeStatus('completed', 'complete') })
    overflow.push({ label: 'Archive', onClick: () => changeStatus('archived', 'archive') })
  } else if (status === 'quoted') {
    overflow.push({ label: 'Archive', onClick: () => changeStatus('archived', 'archive') })
  } else if (status === 'archived') {
    overflow.push({ label: 'Restore', onClick: () => changeStatus('quoted', 'restore') })
  }

  return (
    <div className="relative z-30 w-full border-b border-border/60 bg-background/70 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        {/* LEFT: status + primary action + overflow */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-sans font-semibold uppercase tracking-wider rounded-full ${meta.cls}`}
          >
            {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            {meta.label}
          </span>

          {status === 'quoted' && (
            <ActivateButton projectId={projectId} publicStatus={status} variant="compact" />
          )}

          {status === 'archived' && (
            <button
              type="button"
              onClick={() => changeStatus('quoted', 'restore')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold text-accent hover:bg-accent/10 transition-colors disabled:opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>
          )}

          {overflow.length > 0 && <ActionMenu items={overflow} />}
        </div>

        {/* RIGHT: agent tools */}
        <div className="flex items-center gap-1">
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
