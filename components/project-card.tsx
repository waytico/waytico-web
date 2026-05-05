'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiFetch } from '@/lib/api'
import ActionMenu, { type ActionItem } from './action-menu'
import { ArchiveDialog } from './trip/archive-dialog'
import { getStatusMeta, buildTripMenu } from '@/lib/trip-status'

export type ProjectStatus = 'draft' | 'quoted' | 'active' | 'completed' | 'archived'

export type Project = {
  id: string
  slug: string
  title: string
  status: ProjectStatus
  region: string | null
  country: string | null
  cover_url: string | null
  updated_at: string
  created_at: string
  client_id?: string | null
  /** Embedded client roster row when the dashboard endpoint joins
   *  clients. Drives the bold primary heading on cards/rows. */
  client?: {
    id: string
    nickname: string | null
    name: string | null
    email: string | null
    phone: string | null
  } | null
  // Used by TripRow for compact dashboard rows
  dates_start?: string | null
  dates_end?: string | null
  duration_days?: number | null
  group_size?: number | null
  price_per_person?: number | null
  price_total?: number | null
  currency?: string | null
  // Quote lifecycle dates — surfaced in the dashboard's Issued / Expires
  // columns and used by the issued/expires sort modes. Both come from
  // tripsService listByUser which selects them on every project row.
  proposal_date?: string | null
  valid_until?: string | null
}

type Props = {
  project: Project
  onUpdate: (p: Project) => void
  onDelete: (id: string) => void
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const meta = getStatusMeta(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full ${meta.chipClass}`}
    >
      {meta.hasDot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {meta.label}
    </span>
  )
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function ProjectCard({ project, onUpdate, onDelete }: Props) {
  const { getToken } = useAuth()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(project.title)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setTitle(project.title)
  }, [project.title, editing])

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  async function save() {
    const trimmed = title.trim()
    if (!trimmed) {
      setTitle(project.title)
      setEditing(false)
      return
    }
    if (trimmed === project.title) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      const token = await getToken()
      const res = await apiFetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ title: trimmed }),
      })
      if (res.ok) {
        const data = await res.json()
        const updated: Project = data.project ?? data
        onUpdate(updated)
      } else {
        setTitle(project.title)
      }
    } catch {
      setTitle(project.title)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  function cancel() {
    setTitle(project.title)
    setEditing(false)
  }

  async function changeStatus(newStatus: ProjectStatus) {
    setBusy(true)
    try {
      const token = await getToken()
      const res = await apiFetch(`/api/projects/${project.id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const data = await res.json()
        const updated: Project = data.project ?? data
        onUpdate(updated)
      }
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
      if (res.ok) {
        const data = await res.json()
        const updated: Project = data.project ?? data
        onUpdate(updated)
      }
    } finally {
      setBusy(false)
    }
  }

  async function hardDelete() {
    const confirmMsg =
      project.status === 'archived'
        ? `Delete "${project.title}" forever? This cannot be undone.`
        : `Delete "${project.title}"? This cannot be undone.`
    if (!window.confirm(confirmMsg)) return
    setBusy(true)
    try {
      const token = await getToken()
      const res = await apiFetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        token,
      })
      if (res.ok) {
        onDelete(project.id)
      }
    } finally {
      setBusy(false)
    }
  }

  // Build menu items via shared registry — stays in sync with trip page.
  const items: ActionItem[] = buildTripMenu(project.status, {
    changeStatus: (next) => changeStatus(next as ProjectStatus),
    requestArchive: () => setArchiveOpen(true),
    requestDelete: hardDelete,
    restore,
  })

  return (
    <div
      className={
        'border border-border rounded-lg bg-card hover:border-accent transition-colors relative overflow-hidden ' +
        (busy ? 'opacity-60 pointer-events-none' : '')
      }
    >
      {/* Cover thumbnail (only if there's a hero / cover image) */}
      {project.cover_url && (
        <Link
          href={`/t/${project.slug}`}
          className="block aspect-[16/9] w-full overflow-hidden bg-secondary"
          aria-label={`Open ${project.title}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.cover_url}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </Link>
      )}

      {/* Action menu — on top of cover if present, else top-right of text area */}
      <div className={project.cover_url ? 'absolute top-2 right-2 z-10' : 'absolute top-2 right-2'}>
        <ActionMenu items={items} />
      </div>

      <div className="p-4">
        <div className="pr-8">
          {editing ? (
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  ;(e.target as HTMLInputElement).blur()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  cancel()
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              disabled={saving}
              className="font-serif text-xl w-full border-b border-accent bg-transparent outline-none disabled:opacity-60"
              aria-label="Edit project title"
            />
          ) : project.client?.nickname ? (
            // Two-line heading: nickname (bold operator-facing label)
            // on top, trip title as secondary line underneath. The
            // inline title editor still edits project.title only —
            // nickname is managed from the trip page's service block.
            <>
              <h3 className="font-serif text-xl leading-tight">
                {project.client.nickname}
              </h3>
              <div
                onClick={() => setEditing(true)}
                className="text-sm text-foreground/60 cursor-text leading-snug mt-0.5 truncate"
                title="Click to rename"
              >
                {project.title}
              </div>
            </>
          ) : (
            <h3
              onClick={() => setEditing(true)}
              className="font-serif text-xl cursor-text leading-tight"
              title="Click to rename"
            >
              {project.title}
            </h3>
          )}
        </div>

        <Link
          href={`/t/${project.slug}`}
          className="block mt-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
        >
          <div>{[project.region, project.country].filter(Boolean).join(', ') || '—'}</div>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={project.status} />
            <span>Updated {formatDate(project.updated_at)}</span>
          </div>
        </Link>
      </div>

      <ArchiveDialog
        open={archiveOpen}
        projectId={project.id}
        projectTitle={project.title}
        currentContact={{
          name: project.client?.name ?? null,
          email: project.client?.email ?? null,
          phone: project.client?.phone ?? null,
        }}
        onClose={() => setArchiveOpen(false)}
        onArchived={() => {
          onUpdate({ ...project, status: 'archived' })
        }}
      />
    </div>
  )
}

