/**
 * Magazine — single Day component.
 *
 * Source: magazine-trip.jsx lines 190–223, MAGAZINE-SPEC §E.
 *
 * Mobile + desktop sizing per §R.2 lives in layout.css. Owner-mode:
 *   - Title + description edit through EditableField (saveDayPatch).
 *   - Photo upload: picker pill below the eyebrow when no photo, top-
 *     right delete pill on the photo when one exists. Drag-drop on the
 *     section itself uploads to this day's day_id.
 *   - drag handle for itinerary reorder is supplied by the parent
 *     Itinerary component (it owns @dnd-kit context and passes
 *     {dragHandleProps} via the `dragHandle` slot).
 */
'use client'

import { useRef, useState, type ReactNode } from 'react'
import { ImagePlus, Trash2, GripVertical } from 'lucide-react'
import type { Day, MediaLite } from '@/types/theme-v2'
import { fmtDate } from '@/lib/trip-format'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { Hairline } from './styles'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024

type Props = {
  day: Day
  media: MediaLite[]
  isLast: boolean
  /** When provided (owner mode + dnd active), wraps a drag handle next
   *  to the eyebrow. The Itinerary parent owns the @dnd-kit context. */
  dragHandle?: ReactNode
}

export function MagazineDay({ day, media, isLast, dragHandle }: Props) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable

  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const num = String(day.dayNumber).padStart(2, '0')
  const dayDate = fmtDate(day.date ?? null)
  const eyebrowText = dayDate ? `DAY ${num} · ${dayDate.toUpperCase()}` : `DAY ${num}`

  const dayPhotos = media
    .filter((m) => m.day_id === day.id)
    .filter((m) => (m.type ?? 'photo') === 'photo')
    .filter((m) => m.visible_to_client !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const photo = dayPhotos[0]

  const paragraphs = (day.description || '')
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const validateFiles = (files: FileList | File[]): File[] =>
    Array.from(files).filter((f) => ALLOWED_MIMES.includes(f.type) && f.size <= MAX_SIZE)

  const onPickClick = () => {
    if (ctx?.interceptPhotoAction) {
      ctx.interceptPhotoAction()
      return
    }
    fileInputRef.current?.click()
  }

  return (
    <section
      className={'mag-day' + (isLast ? ' mag-day--last' : '')}
      onDragOver={(e) => {
        if (!editable) return
        e.preventDefault()
        if (ctx?.interceptPhotoAction) return
        if (e.dataTransfer?.types?.includes('Files')) setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!editable) return
        if (e.currentTarget === e.target) setDragOver(false)
      }}
      onDrop={(e) => {
        if (!editable) return
        e.preventDefault()
        setDragOver(false)
        if (ctx?.interceptPhotoAction) {
          ctx.interceptPhotoAction()
          return
        }
        const list = validateFiles(e.dataTransfer?.files ?? [])
        if (list.length) void ctx!.photo.handleUpload(list, day.id)
      }}
    >
      <Hairline />

      {dragOver && (
        <div className="mag-day__drop-overlay">
          <div className="mag-day__drop-pill">DROP TO ADD TO DAY {num}</div>
        </div>
      )}

      <div className="mag-shell mag-day__head">
        <div className="mag-day__eyebrow-row">
          {dragHandle && (
            <span aria-label="Reorder" className="mag-day__handle">
              {dragHandle}
            </span>
          )}
          <div className="mag-eyebrow mag-eyebrow--accent">{eyebrowText}</div>
        </div>

        {editable ? (
          <EditableField
            as="text"
            value={day.title}
            editable
            placeholder="Day title"
            onSave={(v) => ctx!.mutations.saveDayPatch(day.id, { title: v })}
            renderDisplay={(v) => <h2 className="mag-day__title">{v}</h2>}
          />
        ) : (
          day.title && <h2 className="mag-day__title">{day.title}</h2>
        )}
      </div>

      {photo?.url ? (
        <div className="mag-shell--wide mag-day__photo-wrap">
          <img className="mag-day__photo" src={photo.url} alt={day.title ?? `Day ${num}`} />
          {editable && (
            <button
              type="button"
              onClick={() => {
                if (ctx?.interceptPhotoAction) {
                  ctx.interceptPhotoAction()
                  return
                }
                void ctx!.photo.handleDelete(photo.id)
              }}
              aria-label="Remove photo"
              className="mag-btn-overlay-icon mag-btn-overlay-icon--small mag-day__photo-delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ) : (
        editable && (
          <div className="mag-shell mag-day__placeholder-wrap">
            <button type="button" onClick={onPickClick} className="mag-btn-add">
              <ImagePlus size={14} />
              ADD PHOTO TO DAY {num}
            </button>
          </div>
        )
      )}

      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIMES.join(',')}
          hidden
          onChange={(e) => {
            const list = validateFiles(e.target.files ?? [])
            if (list.length) void ctx!.photo.handleUpload(list, day.id)
            if (e.target) e.target.value = ''
          }}
        />
      )}

      {/* Description */}
      {editable ? (
        <div className="mag-shell mag-day__prose">
          <EditableField
            as="multiline"
            value={day.description}
            editable
            rows={5}
            placeholder="Describe the day — paragraph breaks render as separate paragraphs."
            onSave={(v) => ctx!.mutations.saveDayPatch(day.id, { description: v })}
            renderDisplay={(v) => {
              const paras = v.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
              return (
                <>
                  {paras.map((p, i) => (
                    <p key={i} className="mag-day__paragraph">{p}</p>
                  ))}
                </>
              )
            }}
          />
        </div>
      ) : (
        paragraphs.length > 0 && (
          <div className="mag-shell mag-day__prose">
            {paragraphs.map((p, i) => (
              <p key={i} className="mag-day__paragraph">{p}</p>
            ))}
          </div>
        )
      )}
    </section>
  )
}

/** Default drag handle icon — exported so Itinerary can pass it to
 *  MagazineDay's dragHandle slot without coupling the icon import. */
export function DayDragHandle() {
  return <GripVertical size={14} />
}
