'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiFetch } from '@/lib/api'
import ActionMenu, { type ActionItem } from './action-menu'

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
}

type Props = {
  project: Project
  onUpdate: (p: Project) => void
  onDelete: (id: string) => void
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles: Record<string, string> = {
    quoted: 'bg-muted text-muted-foreground',
    active: 'bg-accent text-accent-foreground',
    completed: 'bg-green-600 text-white',
    draft: 'bg-muted text-muted-foreground',
    archived: 'bg-muted/60 text-muted-foreground',
  }
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${styles[status] || styles.draft}`}
    >
      {label}
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

  // Build menu items based on status
  const items: ActionItem[] = []
  if (project.status === 'draft') {
    items.push({ label: 'Publish', onClick: () => changeStatus('quoted') })
    items.push({ label: 'Archive', onClick: () => changeStatus('archived') })
    items.push({ label: 'Delete', onClick: hardDelete, variant: 'danger' })
  } else if (project.status === 'quoted') {
    items.push({ label: 'Archive', onClick: () => changeStatus('archived') })
    items.push({ label: 'Delete', onClick: hardDelete, variant: 'danger' })
  } else if (project.status === 'active') {
    items.push({ label: 'Mark completed', onClick: () => changeStatus('completed') })
    items.push({ label: 'Archive', onClick: () => changeStatus('archived') })
  } else if (project.status === 'completed') {
    items.push({ label: 'Archive', onClick: () => changeStatus('archived') })
  } else if (project.status === 'archived') {
    items.push({ label: 'Restore', onClick: restore })
    items.push({ label: 'Delete forever', onClick: hardDelete, variant: 'danger' })
  }

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
    </div>
  )
}
