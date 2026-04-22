'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Eye, Archive, RotateCcw, MoreVertical } from 'lucide-react'
import ActivateButton from '@/components/activate-button'
import ShareMenu from '@/components/share-menu'
import ActionMenu from '@/components/action-menu'
import { apiFetch } from '@/lib/api'

type Props = {
  projectId: string
  status: string
  title: string
  shareUrl: string
  canShare: boolean // owner or anon-creator
  onPreviewAsClient: () => void
  onStatusChanged?: () => void
}

/**
 * Thin action bar shown under the global Header for owners (not previewing).
 * Groups page-level actions:
 *   Left:  status pill + primary state action (Activate / Archive / Restore)
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

  const changeStatus = async (next: string, optimisticLabel: string) => {
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
        toast.error(err?.error || `Could not ${optimisticLabel}`)
        return
      }
      toast.success(`${title} — ${optimisticLabel}d`)
      onStatusChanged?.()
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  // Map status → chip label
  const statusLabel =
    status === 'quoted'
      ? 'Quote'
      : status === 'active'
      ? 'Active'
      : status === 'completed'
      ? 'Completed'
      : status === 'archived'
      ? 'Archived'
      : status === 'draft'
      ? 'Draft'
      : status === 'generating'
      ? 'Generating'
      : status

  const chipClass =
    status === 'active'
      ? 'bg-success/15 text-success'
      : status === 'quoted'
      ? 'bg-accent/10 text-accent'
      : status === 'archived' || status === 'completed'
      ? 'bg-secondary text-foreground/70'
      : 'bg-secondary text-foreground/70'

  // Overflow items (for menu) — archive from active, restore from archived, etc.
  const overflow: {
    label: string
    onClick: () => void
    variant?: 'default' | 'danger'
  }[] = []
  if (status === 'active') {
    overflow.push({
      label: 'Mark as completed',
      onClick: () => changeStatus('completed', 'complete'),
    })
    overflow.push({
      label: 'Archive',
      onClick: () => changeStatus('archived', 'archive'),
    })
  } else if (status === 'quoted') {
    overflow.push({
      label: 'Archive',
      onClick: () => changeStatus('archived', 'archive'),
    })
  } else if (status === 'archived') {
    overflow.push({
      label: 'Restore',
      onClick: () => changeStatus('quoted', 'restore'),
    })
  }

  return (
    <div className="w-full border-b border-border/60 bg-background/70 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* LEFT: status + primary action */}
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full ${chipClass}`}
          >
            {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            {statusLabel}
          </span>

          {status === 'quoted' && (
            <ActivateButton projectId={projectId} publicStatus={status} />
          )}

          {status === 'archived' && (
            <button
              type="button"
              onClick={() => changeStatus('quoted', 'restore')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-accent hover:bg-accent/10 transition-colors disabled:opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>
          )}

          {overflow.length > 0 && <ActionMenu items={overflow} />}
        </div>

        {/* RIGHT: agent tools */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPreviewAsClient}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-foreground/80 hover:bg-secondary transition-colors"
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
