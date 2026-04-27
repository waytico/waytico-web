'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { UI } from '@/lib/ui-strings'
import type { Accommodation, Mutations } from './trip-types'
import { uploadAccommodationPhoto, ALLOWED_MIME, MAX_FILE_SIZE } from '@/lib/upload-photo'

type Props = {
  accommodations: Accommodation[]
  editable: boolean
  /** Owner-mode handlers — only required when `editable` is true. */
  onCreate?: Mutations['saveAccommodationCreate']
  onUpdate?: Mutations['saveAccommodationPatch']
  onDelete?: Mutations['saveAccommodationDelete']
}

/**
 * Accommodations — top-level block (not nested per-day). Cards show name +
 * optional photo + optional description. Hidden from the public client view
 * when there are no accommodations; in owner mode the empty state shows an
 * "Add accommodation" button so an operator can seed cards manually
 * alongside the editor agent's create_accommodation tool.
 */
export function TripAccommodations({
  accommodations,
  editable,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const hasAny = accommodations.length > 0
  if (!editable && !hasAny) return null

  return (
    <section className="tp-section" id="accommodations">
      <div className="tp-container">
        <header className="tp-section-head">
          <h2 className="tp-display tp-section-title">{UI.sectionLabels.accommodations}</h2>
        </header>

        {hasAny && (
          <div className="tp-acc-grid">
            {accommodations.map((a) => (
              <AccommodationCard
                key={a.id}
                item={a}
                editable={editable}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}

        {editable && onCreate && <AddAccommodationButton onCreate={onCreate} />}
      </div>
    </section>
  )
}

/* ── Card ── */

function AccommodationCard({
  item,
  editable,
  onUpdate,
  onDelete,
}: {
  item: Accommodation
  editable: boolean
  onUpdate?: Mutations['saveAccommodationPatch']
  onDelete?: Mutations['saveAccommodationDelete']
}) {
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [draftName, setDraftName] = useState(item.name)
  const [draftDesc, setDraftDesc] = useState(item.description || '')

  return (
    <article className="tp-acc-card">
      <AccommodationPhoto
        item={item}
        editable={editable}
        onChange={async (cdnUrl) => {
          if (onUpdate) await onUpdate(item.id, { imageUrl: cdnUrl })
        }}
      />

      <div className="tp-acc-body">
        {editingName ? (
          <input
            className="tp-acc-name-input"
            value={draftName}
            autoFocus
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={async () => {
              const v = draftName.trim()
              if (v && v !== item.name && onUpdate) {
                await onUpdate(item.id, { name: v })
              } else {
                setDraftName(item.name)
              }
              setEditingName(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                setDraftName(item.name)
                setEditingName(false)
              }
            }}
          />
        ) : (
          <h3
            className="tp-acc-name"
            onClick={() => editable && setEditingName(true)}
            style={editable ? { cursor: 'text' } : undefined}
          >
            {item.name}
          </h3>
        )}

        {editingDesc ? (
          <textarea
            className="tp-acc-desc-input"
            value={draftDesc}
            autoFocus
            rows={4}
            onChange={(e) => setDraftDesc(e.target.value)}
            onBlur={async () => {
              const v = draftDesc.trim()
              const next = v.length > 0 ? v : null
              if (next !== (item.description || null) && onUpdate) {
                await onUpdate(item.id, { description: next })
              }
              setEditingDesc(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDraftDesc(item.description || '')
                setEditingDesc(false)
              }
            }}
          />
        ) : item.description ? (
          <p
            className="tp-acc-desc"
            onClick={() => editable && setEditingDesc(true)}
            style={editable ? { cursor: 'text' } : undefined}
          >
            {item.description}
          </p>
        ) : editable ? (
          <p
            className="tp-acc-desc tp-acc-desc--placeholder"
            onClick={() => setEditingDesc(true)}
          >
            Add description
          </p>
        ) : null}

        {editable && onDelete && (
          <button
            type="button"
            className="tp-acc-delete"
            onClick={async () => {
              if (typeof window !== 'undefined' && !window.confirm(`Delete ${item.name}?`)) return
              await onDelete(item.id)
            }}
            aria-label={`Delete ${item.name}`}
          >
            ×
          </button>
        )}
      </div>
    </article>
  )
}

/* ── Photo (click + drop to upload) ── */

function AccommodationPhoto({
  item,
  editable,
  onChange,
}: {
  item: Accommodation
  editable: boolean
  onChange: (cdnUrl: string) => Promise<void>
}) {
  const { getToken } = useAuth()
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Public mode: render the photo as-is, or hide the block when there's none.
  if (!editable) {
    if (!item.image_url) return null
    return (
      <div
        className="tp-acc-photo"
        style={{ backgroundImage: `url(${item.image_url})` }}
        aria-label={item.name}
      />
    )
  }

  const handleFile = async (file: File) => {
    if (busy) return
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error('Use JPEG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB).`)
      return
    }
    setBusy(true)
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Sign in to upload')
        return
      }
      const { cdnUrl } = await uploadAccommodationPhoto(item.id, file, token)
      await onChange(cdnUrl)
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const onClick = () => {
    if (!busy) inputRef.current?.click()
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const hasPhoto = !!item.image_url

  return (
    <div
      className={`tp-acc-photo${hasPhoto ? '' : ' tp-acc-photo--empty'}${
        dragOver ? ' tp-acc-photo--drag' : ''
      }`}
      style={hasPhoto ? { backgroundImage: `url(${item.image_url})` } : undefined}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      aria-label={hasPhoto ? `Replace photo for ${item.name}` : `Add photo for ${item.name}`}
    >
      {/* Hint overlay — shown when empty (always) or when busy/hovering with a photo. */}
      {(!hasPhoto || busy || dragOver) && (
        <div className="tp-acc-photo-hint">
          {busy ? 'Uploading…' : hasPhoto ? 'Replace photo' : '+ Add photo'}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

/* ── Add ── */

function AddAccommodationButton({
  onCreate,
}: {
  onCreate: NonNullable<Mutations['saveAccommodationCreate']>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  if (!open) {
    return (
      <button type="button" className="tp-acc-add" onClick={() => setOpen(true)}>
        + Add accommodation
      </button>
    )
  }

  return (
    <div className="tp-acc-add-form">
      <input
        className="tp-acc-name-input"
        value={name}
        autoFocus
        placeholder="Hotel / lodge / camp name"
        onChange={(e) => setName(e.target.value)}
        onKeyDown={async (e) => {
          if (e.key === 'Enter') {
            const v = name.trim()
            if (v) {
              await onCreate({ name: v })
              setName('')
              setOpen(false)
            }
          }
          if (e.key === 'Escape') {
            setName('')
            setOpen(false)
          }
        }}
        onBlur={async () => {
          const v = name.trim()
          if (v) {
            await onCreate({ name: v })
          }
          setName('')
          setOpen(false)
        }}
      />
    </div>
  )
}
