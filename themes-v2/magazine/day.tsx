'use client'

import { useRef, useState, type ReactNode } from 'react'
import { ImagePlus, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import type { Day, MediaLite } from '@/types/theme-v2'
import { fmtDayDate, addDaysISO } from '@/lib/trip-format'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import PhotosBlock from '@/components/shared-v2/photos-block'
import type { MediaRecord } from '@/lib/upload-photo'
import { Hairline } from './styles'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024

type Props = {
  day: Day
  media: MediaLite[]
  /** Trip language (BCP-47) for fmtDayDate locale-aware weekday + month. */
  language: string
  /** Trip start date — used to compute fallback day.date from dayNumber
   *  for legacy days that don't carry their own date column. */
  datesStart: string | null
  isLast: boolean
  dragHandle?: ReactNode
}

/**
 * Resolve a day's display date.
 *   1. If day.date is a valid YYYY-MM-DD-prefixed string → use it
 *   2. Else if datesStart + dayNumber are present → addDaysISO(datesStart, dayNumber-1)
 *   3. Else → null (no date row)
 *
 * Mirrors legacy itinerary.tsx 67-75 — critical for trips created before
 * the per-day `date` column existed.
 */
function resolveDayDate(day: Day, datesStart: string | null): string | null {
  if (day.date) return String(day.date).slice(0, 10)
  if (!datesStart) return null
  const start = String(datesStart).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return null
  if (typeof day.dayNumber !== 'number' || day.dayNumber < 1) return null
  return addDaysISO(start, day.dayNumber - 1)
}

export function MagazineDay({
  day,
  media,
  language,
  datesStart,
  isLast,
  dragHandle,
}: Props) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable

  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const num = String(day.dayNumber).padStart(2, '0')
  const resolvedDate = resolveDayDate(day, datesStart)
  const dayDate = fmtDayDate(resolvedDate, language)
  const eyebrowText = dayDate ? `DAY ${num} · ${dayDate.toUpperCase()}` : `DAY ${num}`

  const dayPhotos = media
    .filter((m) => m.day_id === day.id)
    .filter((m) => (m.type ?? 'photo') === 'photo')
    .filter((m) => m.visible_to_client !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const heroPhoto = dayPhotos[0]
  const restPhotos = dayPhotos.slice(1) as MediaRecord[]

  const paragraphs = (day.description || '')
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const validateFiles = (files: FileList | File[]): File[] => {
    const list = Array.from(files)
    const valid = list.filter(
      (f) => ALLOWED_MIMES.includes(f.type) && f.size <= MAX_SIZE,
    )
    if (valid.length !== list.length) {
      toast.error(
        `${list.length - valid.length} file(s) skipped — use JPEG/PNG/WebP, max 15MB`,
      )
    }
    return valid
  }

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

      {/* Hero day photo — first photo in the sorted set. Click opens
          the shared PhotoLightbox via ctx.lightbox.open(). Owner gets
          the corner delete pill so the wide hero stays a one-tap
          remove. The remaining photos render in a PhotosBlock grid
          below the description (alternative path from 2.3.2). */}
      {heroPhoto?.url ? (
        <div className="mag-shell--wide mag-day__photo-wrap">
          <img
            className="mag-day__photo mag-day__photo--clickable"
            src={heroPhoto.url}
            alt={day.title ?? `Day ${num}`}
            onClick={() => ctx?.lightbox.open(heroPhoto)}
          />
          {editable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (ctx?.interceptPhotoAction) {
                  ctx.interceptPhotoAction()
                  return
                }
                void ctx!.photo.handleDelete(heroPhoto.id)
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
          multiple
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

      {/* Multi-photo grid — second photo onward. In owner mode also
          carries the 'Add' button so additional uploads accumulate
          here without disturbing the wide hero. PhotosBlock self-
          hides in public mode when restPhotos is empty. */}
      {(restPhotos.length > 0 || (editable && heroPhoto)) && (
        <div className="mag-shell mag-day__photos-extra">
          <PhotosBlock
            dayId={day.id}
            media={restPhotos}
            owner={editable}
            uploading={ctx?.photo.uploadingByDay[day.id] ?? 0}
            onUpload={(files, dayId) =>
              void ctx!.photo.handleUpload(files, dayId)
            }
            onDelete={(id) => void ctx!.photo.handleDelete(id)}
            onOpen={(m) => ctx?.lightbox.open(m as MediaLite)}
            interceptUpload={ctx?.interceptPhotoAction}
          />
        </div>
      )}
    </section>
  )
}

/** Default drag handle icon — exported so Itinerary can pass it to
 *  MagazineDay's dragHandle slot without coupling the icon import. */
export function DayDragHandle() {
  return <GripVertical size={14} />
}
