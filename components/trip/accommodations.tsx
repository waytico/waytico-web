'use client'

import { useState, useRef } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { ImagePlus, Loader2 } from 'lucide-react'
import { UI } from '@/lib/ui-strings'
import type { Accommodation, Mutations } from './trip-types'
import { uploadAccommodationPhoto, ALLOWED_MIME, MAX_FILE_SIZE } from '@/lib/upload-photo'
import type { ThemeId } from '@/lib/themes'

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
  /** When 'magazine', renders the Magazine variant — 3-up grid with
   *  square photos, mono eyebrow per card, no rounded chrome. Other
   *  values keep the editorial layout. */
  theme?: ThemeId
  /** Magazine-only narrative subtitle slot under the eyebrow. */
  subtitleSlot?: ReactNode
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
  theme,
  subtitleSlot,
}: Props) {
  const hasAny = accommodations.length > 0
  if (!editable && !hasAny) return null

  if (theme === 'magazine') {
    return (
      <AccommodationsMagazine
        accommodations={accommodations}
        editable={editable}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
        interceptUpload={interceptUpload}
        subtitleSlot={subtitleSlot}
      />
    )
  }

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
        toast.error('Sign up to edit')
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

/* ── Magazine variant ─────────────────────────────────────────────── */

/**
 * Magazine variant — 3-up grid on desktop, single column on mobile.
 *
 * Re-uses the same uploadAccommodationPhoto helper as the editorial
 * card so the S3 presign path is shared (TZ pass-B decision #9 — no
 * stub uploads). Inline name / description editing is preserved with
 * the same blur-on-Enter / Esc-cancel behaviour. Card uses square
 * corners, mono eyebrow `STAY` over the name, hairline rule below.
 */
function AccommodationsMagazine({
  accommodations,
  editable,
  onCreate,
  onUpdate,
  onDelete,
  interceptUpload,
  subtitleSlot,
}: {
  accommodations: Accommodation[]
  editable: boolean
  onCreate?: Mutations['saveAccommodationCreate']
  onUpdate?: Mutations['saveAccommodationPatch']
  onDelete?: Mutations['saveAccommodationDelete']
  interceptUpload?: () => void
  subtitleSlot?: ReactNode
}) {
  const hasAny = accommodations.length > 0
  return (
    <section className="tp-mag-section tp-mag-acc" id="accommodations">
      <div className="tp-mag-container">
        <header className="tp-mag-acc__header">
          <hr className="tp-mag-rule" />
          <p className="tp-mag-eyebrow tp-mag-acc__eyebrow">STAYS</p>
          {subtitleSlot && (
            <h2 className="tp-mag-display tp-mag-section-subtitle">
              {subtitleSlot}
            </h2>
          )}
        </header>

        {hasAny && (
          <div className="tp-mag-acc__grid">
            {accommodations.map((a) => (
              <MagazineAccommodationCard
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

        {editable && onCreate && (
          <div className="tp-mag-acc__add">
            <AddAccommodationButton onCreate={onCreate} />
          </div>
        )}
      </div>
    </section>
  )
}

function MagazineAccommodationCard({
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
  // I-LOST-006 mitigation: keep the local draft state in sync with the
  // canonical `item` prop, so that edit-toggle (or a backend agent
  // reorder) doesn't carry stale text from a previous selection.
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [draftName, setDraftName] = useState(item.name)
  const [draftDesc, setDraftDesc] = useState(item.description || '')
  // Sync drafts when the canonical item changes (server PATCH or AI edit).
  if (!editingName && draftName !== item.name) setDraftName(item.name)
  if (!editingDesc && draftDesc !== (item.description || '')) {
    setDraftDesc(item.description || '')
  }

  return (
    <article className="tp-mag-acc__card">
      <MagazineAccommodationPhoto
        item={item}
        editable={editable}
        interceptUpload={interceptUpload}
        onChange={async (cdnUrl) => {
          if (onUpdate) await onUpdate(item.id, { imageUrl: cdnUrl })
        }}
      />
      <div className="tp-mag-acc__body">
        <p className="tp-mag-acc__card-eyebrow">STAY</p>

        {editingName ? (
          <input
            className="tp-mag-acc__name-input"
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
            className="tp-mag-acc__name"
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
            className="tp-mag-acc__desc-input"
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
            className="tp-mag-acc__desc"
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
            className="tp-mag-acc__desc tp-mag-acc__desc--placeholder"
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
            className="tp-mag-acc__delete"
            onClick={async () => {
              if (typeof window !== 'undefined' && !window.confirm(`Delete ${item.name}?`)) return
              await onDelete(item.id)
            }}
            aria-label={`Delete ${item.name}`}
          >
            Remove
          </button>
        )}
      </div>
    </article>
  )
}

function MagazineAccommodationPhoto({
  item,
  editable,
  onChange,
  interceptUpload,
}: {
  item: Accommodation
  editable: boolean
  onChange: (cdnUrl: string) => Promise<void>
  interceptUpload?: () => void
}) {
  const { getToken } = useAuth()
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  if (!editable) {
    if (!item.image_url) return null
    return (
      <div
        className="tp-mag-acc__photo"
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
        toast.error('Sign up to edit')
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

  if (hasPhoto) {
    return (
      <div
        className={`tp-mag-acc__photo${dragOver ? ' tp-mag-acc__photo--drag' : ''}`}
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
          <div className="tp-mag-acc__photo-hint">
            {busy ? 'UPLOADING…' : 'REPLACE PHOTO'}
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
      className={
        'tp-mag-acc__photo-empty' +
        (dragOver ? ' tp-mag-acc__photo-empty--drag' : '')
      }
      aria-label={`Add photo for ${item.name}`}
    >
      {busy ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>UPLOADING…</span>
        </>
      ) : (
        <>
          <ImagePlus className="h-5 w-5" />
          <span>+ ADD PHOTO</span>
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
