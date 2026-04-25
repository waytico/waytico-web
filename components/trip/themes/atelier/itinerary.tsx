'use client'

import { useRef } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EditableField } from '@/components/editable/editable-field'
import { padTwo, formatDayDate } from '@/lib/trip-format'
import type { MediaRecord } from '@/lib/upload-photo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DayLike = Record<string, any>

type AtelierItineraryProps = {
  itinerary: DayLike[]
  media: MediaRecord[]
  owner: boolean
  uploadingByDay: Record<string, number>
  onUpload: (files: File[], dayId: string | null) => void
  onDelete: (mediaId: string) => void
  onOpenPhoto: (m: MediaRecord) => void
  onSaveDay: (dayId: string, patch: Record<string, unknown>) => Promise<boolean>
  onSaveSegment: (dayId: string, segmentId: string, patch: Record<string, unknown>) => Promise<boolean>
}

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024
const ACCENT_COLORS = ['var(--a-coral)', 'var(--a-teal)', 'var(--a-sage)']

/**
 * Atelier — Itinerary ("02 / Day by day").
 *
 * Rotating-accent card grid (2 cols on desktop, 1 col on mobile). Each card
 * has an image with a coloured Day-NN badge top-left and a giant italic day
 * number bottom-right, then a body with title + summary + segments.
 *
 * Accent colour cycles through coral → teal → sage. On sage cards we flip
 * the badge text to teal for contrast, matching the canvas.
 */
export function AtelierItinerary({
  itinerary,
  media,
  owner,
  uploadingByDay,
  onUpload,
  onDelete,
  onOpenPhoto,
  onSaveDay,
  onSaveSegment,
}: AtelierItineraryProps) {
  if (!itinerary || itinerary.length === 0) return null

  return (
    <section
      id="itinerary"
      className="px-4 md:px-14 py-12 md:py-24"
      style={{ background: 'var(--a-paper-2)' }}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3 mb-10 md:mb-14">
        <div>
          <div className="a-eyebrow mb-5">02 / Day by day</div>
          <h2
            className="a-display"
            style={{
              fontSize: 'clamp(2.75rem, 7vw, 6rem)',
              lineHeight: 0.92,
              margin: 0,
              letterSpacing: '-0.03em',
            }}
          >
            The{' '}
            <span className="a-italic" style={{ color: 'var(--a-coral)' }}>
              itinerary
            </span>
            .
          </h2>
        </div>
        <div className="a-sans" style={{ color: 'var(--a-ink-2)', fontSize: 14 }}>
          {itinerary.length} day{itinerary.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-8">
        {itinerary.map((day, idx) => (
          <AtelierDay
            key={day.id || `day-${idx}`}
            day={day}
            idx={idx}
            media={media}
            owner={owner}
            uploading={day.id ? uploadingByDay[day.id] || 0 : 0}
            onUpload={onUpload}
            onDelete={onDelete}
            onOpenPhoto={onOpenPhoto}
            onSaveDay={onSaveDay}
            onSaveSegment={onSaveSegment}
          />
        ))}
      </div>
    </section>
  )
}

type AtelierDayProps = {
  day: DayLike
  idx: number
  media: MediaRecord[]
  owner: boolean
  uploading: number
  onUpload: (files: File[], dayId: string | null) => void
  onDelete: (mediaId: string) => void
  onOpenPhoto: (m: MediaRecord) => void
  onSaveDay: (dayId: string, patch: Record<string, unknown>) => Promise<boolean>
  onSaveSegment: (dayId: string, segmentId: string, patch: Record<string, unknown>) => Promise<boolean>
}

function AtelierDay({
  day,
  idx,
  media,
  owner,
  uploading,
  onUpload,
  onDelete,
  onOpenPhoto,
  onSaveDay,
  onSaveSegment,
}: AtelierDayProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const accent = ACCENT_COLORS[idx % ACCENT_COLORS.length]
  const isSage = idx % 3 === 2 // sage badge needs teal text per canvas

  const dayPhotos = day.id
    ? media.filter((m) => m.day_id === day.id && m.placement !== 'hero')
    : []
  const leadPhoto = dayPhotos[0]

  const segments: DayLike[] = Array.isArray(day.segments)
    ? [...day.segments].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      )
    : []

  const filterFiles = (list: File[]): File[] => {
    const valid = list.filter((f) => ACCEPT.includes(f.type) && f.size <= MAX_SIZE)
    if (valid.length !== list.length) {
      toast.error('Some files skipped — use JPEG/PNG/WebP, max 15MB')
    }
    return valid
  }

  return (
    <article
      className="overflow-hidden relative"
      style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 4px 32px rgba(20,20,20,0.05)',
      }}
    >
      {/* Image header */}
      <div className="relative" style={{ height: 'clamp(220px, 28vw, 360px)' }}>
        {leadPhoto ? (
          <div className="relative h-full group">
            <button
              type="button"
              onClick={() => onOpenPhoto(leadPhoto)}
              className="block w-full h-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={leadPhoto.url}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
            {owner && (
              <button
                type="button"
                onClick={() => onDelete(leadPhoto.id)}
                className="absolute top-3 right-3 z-10 rounded-full p-2 bg-chrome-bg text-chrome-fg-soft border border-chrome-border opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:text-chrome-fg"
                aria-label="Remove photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : owner && day.id ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading > 0}
            className="w-full h-full flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-60"
            style={{
              background: 'var(--a-paper-2)',
              color: 'var(--a-mute)',
              border: '2px dashed var(--a-rule)',
            }}
          >
            <ImagePlus className="w-6 h-6" />
            <span className="a-mono">
              {uploading > 0 ? 'Uploading…' : `Add Day ${day.dayNumber} photo`}
            </span>
          </button>
        ) : (
          <div className="w-full h-full" style={{ background: 'var(--a-paper-2)' }} />
        )}

        {owner && day.id && (
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT.join(',')}
            multiple
            className="hidden"
            onChange={(e) => {
              const files = filterFiles(Array.from(e.target.files || []))
              e.target.value = ''
              if (files.length && day.id) onUpload(files, day.id)
            }}
          />
        )}

        {/* Day badge */}
        <div className="absolute left-5 top-5 pointer-events-none">
          <span
            className="a-badge"
            style={{
              background: accent,
              color: isSage ? 'var(--a-teal)' : 'white',
            }}
          >
            Day {padTwo(day.dayNumber)}
            {day.date ? ` · ${formatDayDate(day.date)}` : ''}
          </span>
        </div>

        {/* Giant italic day number */}
        <div
          className="a-display a-italic absolute right-5 -bottom-2 pointer-events-none"
          style={{
            fontSize: 'clamp(110px, 14vw, 180px)',
            lineHeight: 0.8,
            color: 'white',
            opacity: 0.95,
            letterSpacing: '-0.04em',
            textShadow: '0 2px 32px rgba(0,0,0,0.3)',
          }}
        >
          {day.dayNumber}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 md:p-8">
        <h3
          className="a-display"
          style={{
            fontSize: 'clamp(1.5rem, 2.4vw, 1.875rem)',
            margin: '0 0 14px',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          <EditableField
            as="text"
            editable={owner}
            value={day.title}
            required
            className="w-full"
            onSave={(v) =>
              day.id ? onSaveDay(day.id, { title: v }) : Promise.resolve(false)
            }
          />
        </h3>
        {(day.description || owner) && (
          <div
            className="a-sans mb-6"
            style={{
              fontSize: 'clamp(0.875rem, 1.05vw, 0.9375rem)',
              color: 'var(--a-ink-2)',
              lineHeight: 1.55,
            }}
          >
            <EditableField
              as="multiline"
              editable={owner}
              value={day.description}
              placeholder="Click to add a short summary"
              rows={3}
              className="w-full"
              onSave={(v) =>
                day.id ? onSaveDay(day.id, { description: v }) : Promise.resolve(false)
              }
            />
          </div>
        )}

        {segments.length > 0 && (
          <div>
            {segments.map((s, j) => (
              <div
                key={s.id}
                className="flex gap-3.5 py-3"
                style={{ borderTop: j === 0 ? 'none' : '1px solid var(--a-rule)' }}
              >
                <span
                  className="a-chip"
                  style={{ width: 78, flexShrink: 0, justifyContent: 'center' }}
                >
                  {s.type || 'item'}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="a-sans"
                    style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}
                  >
                    <EditableField
                      as="text"
                      editable={owner}
                      value={s.title}
                      required
                      className="w-full"
                      onSave={(v) =>
                        day.id && s.id
                          ? onSaveSegment(day.id, s.id, { title: v })
                          : Promise.resolve(false)
                      }
                    />
                  </div>
                  {(s.startTime || s.notes || s.reference || s.location?.name) && (
                    <div
                      className="a-sans"
                      style={{ fontSize: 12, color: 'var(--a-mute)' }}
                    >
                      {s.startTime && (
                        <span className="mr-2">
                          {s.startTime}
                          {s.endTime ? `—${s.endTime}` : ''}
                        </span>
                      )}
                      {s.notes && <span>{s.notes}</span>}
                      {s.location?.name && (
                        <span className="ml-2">{s.location.name}</span>
                      )}
                      {s.reference && (
                        <span className="a-mono ml-2">{s.reference}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {day.accommodation && (
          <div
            className="a-mono mt-4 pt-4"
            style={{
              color: 'var(--a-mute)',
              borderTop: '1px solid var(--a-rule)',
            }}
          >
            Lodging ·{' '}
            <span
              className="a-display"
              style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0 }}
            >
              {typeof day.accommodation === 'string'
                ? day.accommodation
                : day.accommodation.name}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}
