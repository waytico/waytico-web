'use client'

import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { EditableField } from '@/components/editable/editable-field'
import { padTwo, formatDayDate } from '@/lib/trip-format'
import type { MediaRecord } from '@/lib/upload-photo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DayLike = Record<string, any>

type JournalItineraryProps = {
  itinerary: DayLike[]
  media: MediaRecord[]
  owner: boolean
  uploadingByDay: Record<string, number>
  onUpload: (files: File[], dayId: string | null) => void
  onDelete: (mediaId: string) => void
  onOpenPhoto: (media: MediaRecord) => void
  onSaveDay: (dayId: string, patch: Record<string, unknown>) => Promise<boolean>
  onSaveSegment: (
    dayId: string,
    segmentId: string,
    patch: Record<string, unknown>,
  ) => Promise<boolean>
  durationLabel: string | null
}

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024

/**
 * Journal — Itinerary (Chapter II).
 *
 * Alternating 2-column spread on desktop: even days have image left / prose
 * right, odd days flip. Mobile stacks image above prose.
 *
 * Per-day photos: first photo of the day (if any) is used as the "lead"
 * image at the top of the day card — clicking it opens the lightbox. For
 * owners with no photos, the image slot becomes a drop-zone.
 *
 * Day title, description, and segment fields stay editable via EditableField.
 */
export function JournalItinerary({
  itinerary,
  media,
  owner,
  uploadingByDay,
  onUpload,
  onDelete,
  onOpenPhoto,
  onSaveDay,
  onSaveSegment,
  durationLabel,
}: JournalItineraryProps) {
  if (!itinerary || itinerary.length === 0) return null

  return (
    <section
      id="itinerary"
      className="j-section px-6 md:px-[72px] py-20 md:py-[140px] border-t border-b"
      style={{
        background: 'var(--j-paper)',
        borderColor: 'var(--j-rule)',
      }}
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-14 md:mb-24">
        <div>
          <div className="j-eyebrow">Chapter II</div>
          <h2
            className="j-serif"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              lineHeight: 0.95,
              margin: '20px 0 0',
              letterSpacing: '-0.02em',
            }}
          >
            Day by <em>day.</em>
          </h2>
        </div>
        {durationLabel && (
          <div className="j-mono" style={{ color: 'var(--j-ink-mute)' }}>
            {durationLabel}
          </div>
        )}
      </div>

      <div className="space-y-20 md:space-y-[120px]">
        {itinerary.map((day, idx) => (
          <JournalDay
            key={day.id || `day-${day.dayNumber || idx}`}
            day={day}
            dayIndex={idx}
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

type JournalDayProps = {
  day: DayLike
  dayIndex: number
  media: MediaRecord[]
  owner: boolean
  uploading: number
  onUpload: (files: File[], dayId: string | null) => void
  onDelete: (mediaId: string) => void
  onOpenPhoto: (media: MediaRecord) => void
  onSaveDay: (dayId: string, patch: Record<string, unknown>) => Promise<boolean>
  onSaveSegment: (
    dayId: string,
    segmentId: string,
    patch: Record<string, unknown>,
  ) => Promise<boolean>
}

function JournalDay({
  day,
  dayIndex,
  media,
  owner,
  uploading,
  onUpload,
  onDelete,
  onOpenPhoto,
  onSaveDay,
  onSaveSegment,
}: JournalDayProps) {
  const flip = dayIndex % 2 === 1
  const inputRef = useRef<HTMLInputElement | null>(null)

  const dayPhotos = day.id
    ? media.filter((m) => m.day_id === day.id && m.placement !== 'hero')
    : []
  const leadPhoto = dayPhotos[0]
  const additionalPhotos = dayPhotos.slice(1)

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
    <div
      className={`grid gap-10 md:gap-20 md:grid-cols-[560px_1fr] items-start ${
        flip ? 'md:grid-cols-[1fr_560px]' : ''
      }`}
    >
      {/* Image column */}
      <div className={flip ? 'md:order-2' : ''}>
        {leadPhoto ? (
          <div className="relative group">
            <button
              type="button"
              onClick={() => onOpenPhoto(leadPhoto)}
              className="block w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={leadPhoto.url}
                alt={leadPhoto.caption || day.title || ''}
                className="w-full object-cover block"
                style={{ height: 'clamp(260px, 40vw, 520px)' }}
              />
            </button>
            {owner && (
              <button
                type="button"
                onClick={() => onDelete(leadPhoto.id)}
                className="absolute top-3 right-3 z-10 rounded-full p-2 bg-chrome-bg text-chrome-fg-soft border border-chrome-border opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:text-chrome-fg"
                aria-label="Remove photo from day"
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
            className="block w-full border-2 border-dashed flex items-center justify-center transition-colors disabled:opacity-60"
            style={{
              height: 'clamp(260px, 40vw, 520px)',
              borderColor: 'var(--j-rule)',
              color: 'var(--j-ink-mute)',
              background: 'var(--j-cream)',
            }}
          >
            <div className="flex flex-col items-center gap-2 text-sm">
              <ImagePlus className="w-6 h-6" />
              <span className="j-mono">
                {uploading > 0 ? 'Uploading…' : `Add photo for Day ${day.dayNumber}`}
              </span>
            </div>
          </button>
        ) : null}

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

        {leadPhoto && (
          <div
            className="j-serif j-italic pl-0.5 mt-3.5"
            style={{ fontSize: 15, color: 'var(--j-ink-mute)' }}
          >
            Fig. {day.dayNumber} — {day.title}
          </div>
        )}

        {/* Additional per-day photos (thumbnails row) */}
        {additionalPhotos.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {additionalPhotos.slice(0, 4).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onOpenPhoto(m)}
                className="aspect-square overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.thumbnail_url || m.url}
                  alt={m.caption || ''}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            {additionalPhotos.length > 4 && (
              <span
                className="j-mono self-center text-center"
                style={{ color: 'var(--j-ink-mute)' }}
              >
                +{additionalPhotos.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Owner: add more photos when lead already exists */}
        {owner && leadPhoto && day.id && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading > 0}
            className="mt-3 j-mono inline-flex items-center gap-1.5 hover:underline disabled:opacity-60"
            style={{ color: 'var(--j-ink-mute)' }}
          >
            <ImagePlus className="w-3.5 h-3.5" />
            {uploading > 0 ? 'Uploading…' : 'Add another photo'}
          </button>
        )}
      </div>

      {/* Prose column */}
      <div className={`pt-5 ${flip ? 'md:order-1' : ''}`}>
        <div className="flex items-baseline gap-5 md:gap-6">
          <div
            className="j-daynum"
            style={{ fontSize: 'clamp(5.5rem, 11vw, 10rem)' }}
          >
            {padTwo(day.dayNumber)}
          </div>
          <div>
            {day.date && (
              <div className="j-mono mb-1.5" style={{ color: 'var(--j-ink-mute)' }}>
                {formatDayDate(day.date)}
              </div>
            )}
            <div
              className="j-serif j-italic"
              style={{ fontSize: 18, color: 'var(--j-ink-soft)' }}
            >
              Day
            </div>
          </div>
        </div>

        <h3
          className="j-serif my-6"
          style={{
            fontSize: 'clamp(1.75rem, 3vw, 2.625rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            maxWidth: 500,
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
            className="j-serif mb-8"
            style={{
              fontSize: 'clamp(1rem, 1.4vw, 1.1875rem)',
              lineHeight: 1.55,
              color: 'var(--j-ink-soft)',
              fontWeight: 300,
              maxWidth: 520,
            }}
          >
            <EditableField
              as="multiline"
              editable={owner}
              value={day.description}
              placeholder="Click to add a short summary of this day"
              rows={3}
              className="w-full"
              onSave={(v) =>
                day.id ? onSaveDay(day.id, { description: v }) : Promise.resolve(false)
              }
            />
          </div>
        )}

        {segments.length > 0 && (
          <div style={{ borderTop: '1px solid var(--j-rule)' }}>
            {segments.map((s) => (
              <div
                key={s.id}
                className="flex gap-5 md:gap-6 py-4 border-b"
                style={{ borderColor: 'var(--j-rule)' }}
              >
                <div className="j-seg-tag">{s.type || 'item'}</div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-medium mb-0.5"
                    style={{ fontSize: 15, color: 'var(--j-ink)' }}
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
                  {(s.startTime || s.notes || s.reference || owner) && (
                    <div
                      style={{ fontSize: 13, color: 'var(--j-ink-mute)' }}
                    >
                      {s.startTime && (
                        <span className="mr-2">
                          {s.startTime}
                          {s.endTime ? `—${s.endTime}` : ''}
                        </span>
                      )}
                      {s.notes && <span>{s.notes}</span>}
                      {s.reference && (
                        <span className="ml-2 j-mono">{s.reference}</span>
                      )}
                    </div>
                  )}
                  {s.location?.name && (
                    <div
                      className="mt-0.5"
                      style={{ fontSize: 13, color: 'var(--j-ink-mute)' }}
                    >
                      {s.location.name}
                      {typeof s.location.latitude === 'number' &&
                        typeof s.location.longitude === 'number' && (
                          <a
                            href={`https://www.google.com/maps?q=${s.location.latitude},${s.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 hover:underline"
                            style={{ color: 'var(--j-terra)' }}
                          >
                            Map ↗
                          </a>
                        )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {day.accommodation && (
          <p
            className="mt-4 j-mono"
            style={{ color: 'var(--j-ink-mute)' }}
          >
            Lodging ·{' '}
            <span
              className="j-serif j-italic"
              style={{ fontSize: 15, textTransform: 'none', letterSpacing: 0 }}
            >
              {typeof day.accommodation === 'string'
                ? day.accommodation
                : day.accommodation.name}
            </span>
          </p>
        )}
      </div>
    </div>
  )
}
