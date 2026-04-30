'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { ImagePlus, Loader2 } from 'lucide-react'
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
  /**
   * If set, the photo upload (click + drag-drop) is short-circuited
   * with this callback instead of running an actual S3 upload. Used
   * for the anon-creator state — see PhotosBlock for the pattern.
   */
  interceptUpload?: () => void
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
  interceptUpload,
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
                interceptUpload={interceptUpload}
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
  interceptUpload,
}: {
  item: Accommodation
  editable: boolean
  onUpdate?: Mutations['saveAccommodationPatch']
  onDelete?: Mutations['saveAccommodationDelete']
  interceptUpload?: () => void
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
        interceptUpload={interceptUpload}
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
            onClick={() => {
              if (!editable) return
              setDraftName(item.name)
              setEditingName(true)
            }}
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
            onClick={() => {
              if (!editable) return
              setDraftDesc(item.description || '')
              setEditingDesc(true)
            }}
            style={editable ? { cursor: 'text' } : undefined}
          >
            {item.description}
          </p>
        ) : editable ? (
          <p
            className="tp-acc-desc tp-acc-desc--placeholder"
            onClick={() => {
              setDraftDesc(item.description || '')
              setEditingDesc(true)
            }}
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
  interceptUpload,
}: {
  item: Accommodation
  editable: boolean
  onChange: (cdnUrl: string) => Promise<void>
  /** Anon-mode short-circuit. See PhotosBlock for the shape. */
  interceptUpload?: () => void
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
        toast.error('Sign in to edit')
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
    if (interceptUpload) {
      interceptUpload()
      return
    }
    if (!busy) inputRef.current?.click()
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (interceptUpload) {
      interceptUpload()
      return
    }
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const hasPhoto = !!item.image_url

  // With a photo: render the image and surface a "Replace" hint on hover/drop.
  if (hasPhoto) {
    return (
      <div
        className={`tp-acc-photo${dragOver ? ' tp-acc-photo--drag' : ''}`}
        style={{ backgroundImage: `url(${item.image_url})` }}
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
        aria-label={`Replace photo for ${item.name}`}
      >
        {(busy || dragOver) && (
          <div className="tp-acc-photo-hint">
            {busy ? 'Uploading…' : 'Replace photo'}
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

  // Empty state: dashed drop-zone styled to match the day-level Add photos
  // block (photos-block.tsx). aspect-ratio matches the loaded photo so the
  // card height doesn't jump after upload.
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent ${
        dragOver ? 'border-accent text-accent' : ''
      }`}
      style={{ aspectRatio: '4 / 3' }}
      aria-label={`Add photo for ${item.name}`}
    >
      {busy ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-xs">Uploading…</span>
        </>
      ) : (
        <>
          <ImagePlus className="h-6 w-6" />
          <span className="text-xs">Add photo</span>
        </>
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
    </button>
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
