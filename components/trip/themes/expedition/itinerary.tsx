'use client'

import { useRef } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EditableField } from '@/components/editable/editable-field'
import { padTwo, formatDayDate } from '@/lib/trip-format'
import type { MediaRecord } from '@/lib/upload-photo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DayLike = Record<string, any>

type ExpeditionItineraryProps = {
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

/**
 * Expedition — Itinerary ("§ 02 — DAY LOG").
 *
 * Each day is two stacked sections:
 *   1. Tall full-bleed photo strip with side-darkening gradient. Left cell
 *      holds eyebrow date + giant "DAY" + outline-stroke 2-digit day
 *      number. Right cell shows uppercased title + summary.
 *   2. Segment "log entries" table on dark panel: line-numbered rows with
 *      chip / label / detail columns and a count badge in column 1.
 */
export function ExpeditionItinerary({
  itinerary,
  media,
  owner,
  uploadingByDay,
  onUpload,
  onDelete,
  onOpenPhoto,
  onSaveDay,
  onSaveSegment,
}: ExpeditionItineraryProps) {
  if (!itinerary || itinerary.length === 0) return null

  return (
    <section
      id="itinerary"
      style={{
        background: 'var(--e-bg-deep)',
        color: 'var(--e-cream)',
      }}
    >
      <div
        className="px-4 md:px-14 py-16 md:py-24 flex flex-col md:flex-row md:justify-between md:items-end gap-4"
        style={{ borderTop: '1px solid var(--e-rule-2)' }}
      >
        <div>
          <div className="e-mono mb-5" style={{ color: 'var(--e-ochre)' }}>
            § 02 — DAY LOG
          </div>
          <h2
            className="e-display"
            style={{
              fontSize: 'clamp(3rem, 8vw, 7rem)',
              lineHeight: 0.88,
              margin: 0,
              letterSpacing: '-0.03em',
            }}
          >
            THE <span style={{ color: 'var(--e-ochre)' }}>ROUTE</span>
          </h2>
        </div>
        <div className="e-mono" style={{ color: 'var(--e-cream-mute)' }}>
          {String(itinerary.length).padStart(2, '0')} DAYS
        </div>
      </div>

      {itinerary.map((day, idx) => (
        <ExpeditionDay
          key={day.id || `day-${idx}`}
          day={day}
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
    </section>
  )
}

type ExpeditionDayProps = {
  day: DayLike
  media: MediaRecord[]
  owner: boolean
  uploading: number
  onUpload: (files: File[], dayId: string | null) => void
  onDelete: (mediaId: string) => void
  onOpenPhoto: (m: MediaRecord) => void
  onSaveDay: (dayId: string, patch: Record<string, unknown>) => Promise<boolean>
  onSaveSegment: (dayId: string, segmentId: string, patch: Record<string, unknown>) => Promise<boolean>
}

function ExpeditionDay({
  day,
  media,
  owner,
  uploading,
  onUpload,
  onDelete,
  onOpenPhoto,
  onSaveDay,
  onSaveSegment,
}: ExpeditionDayProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const dayPhotos = day.id
    ? media.filter((m) => m.day_id === day.id && m.placement !== 'hero')
    : []
  const leadPhoto = dayPhotos[0]

  const segments: DayLike[] = Array.isArray(day.segments)
    ? [...day.segments].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
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
      className="relative"
      style={{ borderTop: '1px solid var(--e-rule-2)' }}
    >
      {/* Photo strip with day overlay */}
      <div
        className="relative"
        style={{ height: 'clamp(440px, 50vw, 640px)' }}
      >
        {leadPhoto ? (
          <button
            type="button"
            onClick={() => onOpenPhoto(leadPhoto)}
            className="absolute inset-0 block"
            aria-label={`Open ${day.title || 'day'} photo`}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(10,8,6,0.9) 0%, rgba(10,8,6,0.3) 50%, rgba(10,8,6,0.7) 100%), url(${leadPhoto.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'saturate(0.85) contrast(1.1)',
              }}
            />
          </button>
        ) : owner && day.id ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading > 0}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{
              background: 'var(--e-panel)',
              color: 'var(--e-cream-mute)',
              border: '2px dashed var(--e-rule-2)',
            }}
          >
            <ImagePlus className="w-8 h-8" />
            <span className="e-mono">
              {uploading > 0 ? 'UPLOADING…' : `ADD DAY ${day.dayNumber} PHOTO`}
            </span>
          </button>
        ) : (
          <div className="absolute inset-0" style={{ background: 'var(--e-panel)' }} />
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

        {owner && leadPhoto && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(leadPhoto.id)
            }}
            className="absolute top-4 right-4 z-10 rounded-full p-2 bg-chrome-bg text-chrome-fg-soft border border-chrome-border opacity-90 hover:text-chrome-fg"
            aria-label="Remove day photo"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <div
          className="absolute inset-0 grid grid-cols-1 md:grid-cols-[480px_1fr] gap-8 md:gap-20 px-4 md:px-14 py-10 md:py-14 pointer-events-none"
          style={{ color: 'var(--e-cream)' }}
        >
          <div className="flex flex-col justify-end md:justify-between">
            <div>
              {day.date && (
                <div
                  className="e-mono mb-4"
                  style={{ color: 'var(--e-ochre)' }}
                >
                  {formatDayDate(day.date).toUpperCase()}
                </div>
              )}
              <div
                className="e-display"
                style={{
                  fontSize: 'clamp(4rem, 14vw, 13.75rem)',
                  lineHeight: 0.82,
                  letterSpacing: '-0.04em',
                  color: 'var(--e-cream)',
                }}
              >
                DAY
              </div>
              <div
                className="e-day-outline"
                style={{
                  fontSize: 'clamp(5rem, 18vw, 17.5rem)',
                  lineHeight: 0.82,
                  letterSpacing: '-0.04em',
                  marginTop: '-0.08em',
                }}
              >
                {padTwo(day.dayNumber)}
              </div>
            </div>
          </div>
          <div
            className="flex flex-col justify-end pointer-events-auto"
            style={{ paddingBottom: 'clamp(8px, 2vw, 24px)' }}
          >
            <h3
              className="e-headline"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                lineHeight: 1.1,
                margin: 0,
                maxWidth: 640,
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
                className="e-body mt-6"
                style={{
                  fontSize: 'clamp(0.95rem, 1.2vw, 1.125rem)',
                  lineHeight: 1.55,
                  color: 'var(--e-cream-mute)',
                  maxWidth: 620,
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
          </div>
        </div>
      </div>

      {/* Segments table */}
      {segments.length > 0 && (
        <div
          className="px-4 md:px-14 py-12 md:py-20"
          style={{ background: 'var(--e-bg)' }}
        >
          <div className="grid md:grid-cols-[3fr_9fr] gap-6 items-start">
            <div>
              <div
                className="e-mono mb-3"
                style={{ color: 'var(--e-ink-dim)' }}
              >
                LOG ENTRIES
              </div>
              <div
                className="e-display"
                style={{ fontSize: 48, color: 'var(--e-ochre)' }}
              >
                {String(segments.length).padStart(2, '0')}
              </div>
            </div>
            <div>
              {segments.map((s, i) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[40px_1fr] md:grid-cols-[40px_120px_1fr_240px] gap-4 md:gap-6 py-5"
                  style={{ borderTop: '1px solid var(--e-rule)' }}
                >
                  <div className="e-mono" style={{ color: 'var(--e-ochre)' }}>
                    {padTwo(i + 1)}
                  </div>
                  <div className="hidden md:block">
                    <span className="e-chip">{s.type || 'item'}</span>
                  </div>
                  <div className="col-span-1 md:col-span-1">
                    <div className="md:hidden mb-1.5">
                      <span className="e-chip">{s.type || 'item'}</span>
                    </div>
                    <div className="e-headline" style={{ fontSize: 16 }}>
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
                  </div>
                  <div
                    className="e-body col-span-2 md:col-span-1"
                    style={{
                      fontSize: 13,
                      color: 'var(--e-cream-mute)',
                      textAlign: 'left',
                    }}
                  >
                    {s.startTime && (
                      <span className="block">
                        {s.startTime}
                        {s.endTime ? `—${s.endTime}` : ''}
                      </span>
                    )}
                    {s.notes && <span className="block">{s.notes}</span>}
                    {s.location?.name && (
                      <span className="block" style={{ color: 'var(--e-cream-mute)' }}>
                        {s.location.name}
                      </span>
                    )}
                    {s.reference && (
                      <span
                        className="e-mono block"
                        style={{ color: 'var(--e-ochre)' }}
                      >
                        {s.reference}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {day.accommodation && (
            <div
              className="e-mono mt-8 pt-6"
              style={{
                color: 'var(--e-ink-dim)',
                borderTop: '1px solid var(--e-rule)',
              }}
            >
              LODGING ·{' '}
              <span
                className="e-headline"
                style={{ fontSize: 14, color: 'var(--e-cream)' }}
              >
                {(typeof day.accommodation === 'string'
                  ? day.accommodation
                  : day.accommodation.name || ''
                ).toUpperCase()}
              </span>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
