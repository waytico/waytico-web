'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import ActionMenu from './action-menu'
import { ArchiveDialog } from './trip/archive-dialog'
import { buildTripMenu, getStatusMeta } from '@/lib/trip-status'
import { attentionReason } from '@/lib/trip-grouping'
import type { Project } from './project-card'

type Props = {
  project: Project
  /** When true, the trip is rendered in a 'completed/archive' style: dimmed. */
  dimmed?: boolean
  /** When true, render the contextual attention pill instead of the plain status pill. */
  showAttention?: boolean
  onUpdate: (p: Project) => void
  onDelete: (id: string) => void
}

function fmtDateRange(start: string | null | undefined, end: string | null | undefined): string | null {
  if (!start) return null
  try {
    const s = new Date(start)
    const e = end ? new Date(end) : null
    const sStr = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!e) return sStr
    const sameYear = s.getFullYear() === e.getFullYear()
    const eStr = e.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: sameYear ? undefined : 'numeric',
    })
    return `${sStr} – ${eStr}`
  } catch {
    return null
  }
}

function fmtPrice(perPerson: number | null | undefined, total: number | null | undefined, currency: string | null | undefined): string | null {
  const amount = total ?? perPerson
  if (!amount || amount <= 0) return null
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'
  return `${sym}${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export default function TripRow({ project, dimmed, showAttention, onUpdate, onDelete }: Props) {
  const { getToken } = useAuth()
  const [busy, setBusy] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  async function patchStatus(status: string) {
    setBusy(true)
    try {
      const token = await getToken()
      const res = await apiFetch(`/api/projects/${project.id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onUpdate({ ...project, ...data.project } as Project)
    } catch {
      toast.error('Status change failed')
    } finally {
      setBusy(false)
    }
  }

  async function restore() {
    setBusy(true)
    try {
      const token = await getToken()
      const res = await apiFetch(`/api/projects/${project.id}/restore`, {
        method: 'POST',
        token,
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onUpdate({ ...project, ...data.project } as Project)
    } catch {
      toast.error('Restore failed')
    } finally {
      setBusy(false)
    }
  }

  async function deleteProject() {
    if (!confirm('Delete this trip permanently? This cannot be undone.')) return
    setBusy(true)
    try {
      const token = await getToken()
      const res = await apiFetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        token,
      })
      if (!res.ok) throw new Error()
      onDelete(project.id)
      toast.success('Trip deleted')
    } catch {
      toast.error('Delete failed')
      setBusy(false)
    }
  }

  const menuItems = buildTripMenu(project.status, {
    changeStatus: (next) => patchStatus(next),
    requestArchive: () => setArchiveOpen(true),
    requestDelete: deleteProject,
    restore,
  })

  const reason = attentionReason(project)
  const datesStr = fmtDateRange(project.dates_start, project.dates_end)
  const groupStr = project.group_size && project.group_size > 0
    ? `${project.group_size} ${project.group_size === 1 ? 'guest' : 'guests'}`
    : null
  const priceStr = fmtPrice(project.price_per_person, project.price_total, project.currency)
  const region = [project.region, project.country].filter(Boolean).join(', ')

  // Status pill — contextual when showAttention, default otherwise
  const statusMeta = getStatusMeta(project.status)
  const pillText = showAttention && reason ? reason : statusMeta.label
  const pillClass = showAttention && reason
    ? project.status === 'active'
      ? 'bg-destructive/10 text-destructive'
      : 'bg-accent/15 text-accent'
    : statusMeta.chipClass

  return (
    <>
      <div
        className={`flex items-center gap-3 px-4 py-3 border-t border-border/50 hover:bg-secondary/40 transition-colors ${dimmed ? 'opacity-70' : ''}`}
      >
        <Link
          href={`/t/${project.slug}`}
          className="flex items-center gap-3 flex-1 min-w-0 group"
        >
          {/* Thumb */}
          <div className="w-12 h-8 rounded-md overflow-hidden flex-shrink-0 bg-secondary">
            {project.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.cover_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                draggable={false}
              />
            ) : null}
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-sm font-medium truncate group-hover:underline">
                {project.title || 'Untitled'}
              </span>
              {region && (
                <span className="text-xs text-foreground/50 truncate hidden sm:inline">
                  {region}
                </span>
              )}
            </div>
            <div className="text-xs text-foreground/60 mt-0.5 truncate">
              {[datesStr, groupStr, priceStr].filter(Boolean).join('  ·  ') || (
                <span className="italic text-foreground/40">No details yet</span>
              )}
            </div>
          </div>
        </Link>

        {/* Status pill */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full whitespace-nowrap flex-shrink-0 ${pillClass}`}
        >
          {statusMeta.hasDot && !showAttention && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
          {pillText}
        </span>

        {/* Action menu */}
        <ActionMenu items={menuItems} />
      </div>

      <ArchiveDialog
        open={archiveOpen}
        projectId={project.id}
        projectTitle={project.title || 'this trip'}
        currentContact={{
          name: project.client_name,
          email: project.client_email,
          phone: project.client_phone,
        }}
        onClose={() => setArchiveOpen(false)}
        onArchived={() => {
          setArchiveOpen(false)
          onUpdate({ ...project, status: 'archived' })
        }}
      />
    </>
  )
}
