/**
 * Magazine — single Day component.
 *
 * Source: magazine-trip.jsx lines 190–223. Hairline + accent eyebrow
 * (DAY 01) + h2 title + full-bleed 16:9 photo + paragraphs.
 *
 * Owner-mode (stage 3):
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
import { CREAM, body, display, eyebrow, Hairline, ACCENT, MUTED } from './styles'

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
      style={{ background: CREAM, padding: isLast ? '0 0 64px' : '0 0 48px', position: 'relative' }}
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
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          background: 'rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: '#FFFCF6', padding: '8px 16px', borderRadius: 999,
            ...eyebrow, fontSize: 11,
          }}>
            DROP TO ADD TO DAY {num}
          </div>
        </div>
      )}

      <div style={{ padding: '40px 24px 24px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          {dragHandle && (
            <span aria-label="Reorder" style={{ color: MUTED, cursor: 'grab', display: 'inline-flex' }}>
              {dragHandle}
            </span>
          )}
          <div style={{ ...eyebrow, color: ACCENT }}>
            {eyebrowText}
          </div>
        </div>

        {editable ? (
          <EditableField
            as="text"
            value={day.title}
            editable
            placeholder="Day title"
            onSave={(v) => ctx!.mutations.saveDayPatch(day.id, { title: v })}
            renderDisplay={(v) => (
              <h2 style={{ ...display, fontSize: 24, lineHeight: 1.2, margin: 0, maxWidth: 300 }}>
                {v}
              </h2>
            )}
          />
        ) : (
          day.title && (
            <h2 style={{ ...display, fontSize: 24, lineHeight: 1.2, margin: 0, maxWidth: 300 }}>
              {day.title}
            </h2>
          )
        )}
      </div>

      {photo?.url ? (
        <div style={{ position: 'relative' }}>
          <img
            src={photo.url}
            alt={day.title ?? `Day ${num}`}
            style={{
              width: '100%', aspectRatio: '16 / 9', objectFit: 'cover',
              display: 'block', borderRadius: 0,
            }}
          />
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
              style={{
                position: 'absolute', top: 12, right: 12,
                background: 'rgba(0,0,0,0.55)', color: CREAM,
                border: '1px solid rgba(245,240,230,0.4)',
                padding: '6px',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ) : (
        editable && (
          <div style={{ padding: '0 24px 24px' }}>
            <button
              type="button"
              onClick={onPickClick}
              style={{
                ...eyebrow, fontSize: 10, color: ACCENT,
                background: 'transparent',
                border: `1px dashed ${ACCENT}`,
                padding: '14px 20px',
                cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                width: '100%', justifyContent: 'center',
              }}
            >
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
          style={{ display: 'none' }}
          onChange={(e) => {
            const list = validateFiles(e.target.files ?? [])
            if (list.length) void ctx!.photo.handleUpload(list, day.id)
            if (e.target) e.target.value = ''
          }}
        />
      )}

      {/* Description */}
      {editable ? (
        <div style={{ padding: '28px 24px 0' }}>
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
                    <p
                      key={i}
                      style={{
                        ...body,
                        margin: 0,
                        marginBottom: i === paras.length - 1 ? 0 : 16,
                      }}
                    >
                      {p}
                    </p>
                  ))}
                </>
              )
            }}
          />
        </div>
      ) : (
        paragraphs.length > 0 && (
          <div style={{ padding: '28px 24px 0' }}>
            {paragraphs.map((p, i) => (
              <p
                key={i}
                style={{
                  ...body,
                  margin: 0,
                  marginBottom: i === paragraphs.length - 1 ? 0 : 16,
                }}
              >
                {p}
              </p>
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
