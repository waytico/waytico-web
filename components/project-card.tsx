'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiFetch } from '@/lib/api'

export type ProjectStatus = 'draft' | 'quoted' | 'active' | 'completed' | 'archived'

export type Project = {
  id: string
  slug: string
  title: string
  status: ProjectStatus
  region: string | null
  country: string | null
  updated_at: string
  created_at: string
}

type Props = {
  project: Project
  onUpdate: (p: Project) => void
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles: Record<string, string> = {
    quoted: 'bg-muted text-muted-foreground',
    active: 'bg-accent text-accent-foreground',
    completed: 'bg-green-600 text-white',
    draft: 'bg-muted text-muted-foreground',
    archived: 'bg-muted text-muted-foreground',
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

export default function ProjectCard({ project, onUpdate }: Props) {
  const { getToken } = useAuth()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(project.title)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep local title in sync when project updates externally
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

  return (
    <div className="border border-border rounded-lg p-4 bg-card hover:border-accent transition-colors">
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
  )
}
