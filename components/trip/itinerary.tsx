import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import type { ThemeId } from '@/lib/themes'
import { ITINERARY_STYLE } from '@/lib/themes'
import type { Day, Segment, MediaLite } from './trip-types'
import { pad2, fmtDayDate, addDaysISO } from '@/lib/trip-format'

type ItineraryProps = {
  theme: ThemeId
  itinerary: Day[]
  media: MediaLite[]
  /** Trip's first-day ISO date — used to compute per-day date when a Day
   *  object doesn't carry its own `date` field (older trips, or backend
   *  versions before pipeline_days v8). */
  datesStart?: string | null
  /** ISO 639-1 language for the per-day date formatting (weekday locale). */
  language?: string | null
  /**
   * Renderer for a day's title — owner mode wraps with EditableField, public
   * mode renders plain text. If the renderer returns null and the data is
   * also null, the day card still renders (numbered) so the structure isn't
   * lost mid-list.
   */
  renderDayTitle: (day: Day) => ReactNode
  /** Renderer for the day's prose summary. */
  renderDayDescription: (day: Day) => ReactNode
  /** Renderer for an individual segment (passed the day + segment). */
  renderSegmentTitle: (day: Day, segment: Segment) => ReactNode
  /** Optional per-day owner extras (photos block, etc.). Public mode: undefined. */
  renderDayExtras?: (day: Day) => ReactNode
}

function getDayPhoto(media: MediaLite[], dayId: string): string | null {
  const m = media.find((x) => x.day_id === dayId && x.type !== 'document')
  return m ? m.url : null
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Normalise any ISO-shaped string to YYYY-MM-DD.
 * Backend serialises Postgres TIMESTAMPTZ as full ISO ("2026-06-08T00:00:00.000Z"),
 * not as a bare date — so the strict regex alone rejects every dates_start
 * coming from the public API. Take the first 10 chars and re-validate.
 * Returns null for anything that still doesn't match (legacy "May 11", empty,
 * non-string).
 */
function toISODate(s: string | null | undefined): string | null {
  if (typeof s !== 'string' || s.length < 10) return null
  const head = s.slice(0, 10)
  return ISO_DATE_RE.test(head) ? head : null
}

/**
 * Resolve the ISO date for a given day. Order:
 *   1. day.date if it normalises to a valid YYYY-MM-DD (set by pipeline_days v8+).
 *   2. computed from datesStart + (dayNumber - 1) — handles older trips
 *      where the pipeline didn't yet write per-day dates.
 *   3. null — both unavailable; the day will simply not show a date.
 */
function resolveDayDate(day: Day, datesStart?: string | null): string | null {
  const fromDay = toISODate(day.date)
  if (fromDay) return fromDay
  const fromStart = toISODate(datesStart)
  if (fromStart && typeof day.dayNumber === 'number') {
    return addDaysISO(fromStart, day.dayNumber - 1)
  }
  return null
}

/** Inline style for the per-day date label so it renders consistently across
 *  themes without needing CSS additions. Themes can later override via
 *  `.day-date` selector if they want different placement. */
const dayDateStyle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: '0.04em',
  color: 'var(--ink-mute)',
  marginTop: 2,
}

/**
 * Itinerary — single component, three structural variants per TZ-6 §6.4:
 *   editorial  → timeline    (large day numeral on left, content on right)
 *   expedition → photo-cards (full-width photo card with overlay text)
 *   compact    → grid        (two-col responsive grid of card-style days)
 *
 * Branches inside this file via `if (itineraryStyle === '...')`.
 *
 * Segment list shape is shared across variants (time | type label | title /
 * meta), only the visual presentation differs.
 */
export function TripItinerary(props: ItineraryProps) {
  const { theme, itinerary, datesStart, language } = props
  if (!Array.isArray(itinerary) || itinerary.length === 0) return null
  const itineraryStyle = ITINERARY_STYLE[theme]

  const head = (
    <header className="tp-section-head">
      <h2 className="tp-display tp-section-title">{UI.sectionLabels.itinerary}</h2>
      <span className="tp-section-num">
        02 · {itinerary.length} {UI.days}
      </span>
    </header>
  )

  if (itineraryStyle === 'photo-cards') {
    return (
      <section className="tp-section" id="itinerary" style={{ paddingBottom: 0 }}>
        <div className="tp-container">{head}</div>
        <div className="tp-itin--photo-cards">
          {itinerary.map((day) => {
            const photo = getDayPhoto(props.media, day.id)
            const accommodation = accommodationName(day.accommodation)
            const dayDateLabel = fmtDayDate(resolveDayDate(day, datesStart), language)
            return (
              <article
                key={day.id || `day-${day.dayNumber}`}
                className="day"
                style={photo ? { backgroundImage: `url(${photo})` } : undefined}
              >
                <div className="tp-container" style={{ padding: 0, position: 'relative', zIndex: 1 }}>
                  <div className="day-head">
                    <span className="day-num">{pad2(day.dayNumber)}</span>
                    <div>
                      <h3 className="day-title">{props.renderDayTitle(day)}</h3>
                      {dayDateLabel && <div className="day-date" style={dayDateStyle}>{dayDateLabel}</div>}
                    </div>
                  </div>
                  <DayDescription>{props.renderDayDescription(day)}</DayDescription>
                  {Array.isArray(day.segments) && day.segments.length > 0 && (
                    <div className="seg-rail">
                      {sortedSegments(day.segments).map((s) => (
                        <span className="seg-pill" key={s.id}>
                          {s.startTime && <span className="t">{s.startTime}</span>}
                          <span>{props.renderSegmentTitle(day, s)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {accommodation && (
                    <p
                      style={{
                        marginTop: 24,
                        fontSize: 11,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-mute)',
                      }}
                    >
                      Lodging · {accommodation}
                    </p>
                  )}
                  {props.renderDayExtras?.(day)}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    )
  }

  if (itineraryStyle === 'grid') {
    return (
      <section className="tp-section" id="itinerary">
        <div className="tp-container">
          {head}
          <div className="tp-itin--grid">
            {itinerary.map((day) => {
              const photo = getDayPhoto(props.media, day.id)
              const accommodation = accommodationName(day.accommodation)
              const dayDateLabel = fmtDayDate(resolveDayDate(day, datesStart), language)
              return (
                <article key={day.id || `day-${day.dayNumber}`} className="day">
                  <div className="day-head">
                    <span className="day-num">DAY {pad2(day.dayNumber)}</span>
                    {dayDateLabel && <span className="day-date" style={dayDateStyle}>{dayDateLabel}</span>}
                  </div>
                  <h3 className="day-title">{props.renderDayTitle(day)}</h3>
                  {photo && (
                    <div className="day-photo" style={{ backgroundImage: `url(${photo})` }} />
                  )}
                  <DayDescription>{props.renderDayDescription(day)}</DayDescription>
                  {Array.isArray(day.segments) && day.segments.length > 0 && (
                    <div className="day-segs">
                      {sortedSegments(day.segments).map((s) => (
                        <div className="seg-line" key={s.id}>
                          <span className="time">{s.startTime || '—'}</span>
                          <span className="type">{UI.segType[s.type] || s.type}</span>
                          <span>{props.renderSegmentTitle(day, s)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {accommodation && <p className="lodging">Lodging · {accommodation}</p>}
                  {props.renderDayExtras?.(day)}
                </article>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  // timeline — editorial (default)
  return (
    <section className="tp-section" id="itinerary">
      <div className="tp-container">
        {head}
        <div className="tp-itin--timeline">
          {itinerary.map((day) => {
            const accommodation = accommodationName(day.accommodation)
            const dayDateLabel = fmtDayDate(resolveDayDate(day, datesStart), language)
            return (
              <article key={day.id || `day-${day.dayNumber}`} className="day">
                <div className="day-num">{pad2(day.dayNumber)}</div>
                <div>
                  <h3 className="day-title">{props.renderDayTitle(day)}</h3>
                  {dayDateLabel && <div className="day-date" style={dayDateStyle}>{dayDateLabel}</div>}
                  <DayDescription>{props.renderDayDescription(day)}</DayDescription>
                  {Array.isArray(day.segments) && day.segments.length > 0 && (
                    <div className="segs">
                      {sortedSegments(day.segments).map((s) => (
                        <div className="seg" key={s.id}>
                          <span className="time">{s.startTime || ''}</span>
                          <span className="type">{UI.segType[s.type] || s.type}</span>
                          <div className="body">
                            <div className="t">{props.renderSegmentTitle(day, s)}</div>
                            <SegmentMeta segment={s} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {accommodation && <p className="lodging">Lodging · {accommodation}</p>}
                  {props.renderDayExtras?.(day)}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function DayDescription({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="day-desc">{children}</p>
}

function SegmentMeta({ segment: s }: { segment: Segment }) {
  const parts: ReactNode[] = []
  const locName = s.location?.name || s.location?.address
  if (locName) {
    if (typeof s.location?.latitude === 'number' && typeof s.location?.longitude === 'number') {
      parts.push(
        <a
          key="loc"
          href={`https://www.google.com/maps?q=${s.location.latitude},${s.location.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent)' }}
        >
          {locName}
        </a>,
      )
    } else {
      parts.push(<span key="loc">{locName}</span>)
    }
  }
  if (s.contact?.phone) {
    parts.push(
      <a key="phone" href={`tel:${s.contact.phone}`} style={{ color: 'var(--accent)' }}>
        {s.contact.phone}
      </a>,
    )
  } else if (s.contact?.name) {
    parts.push(<span key="contact">{s.contact.name}</span>)
  }
  if (s.reference) {
    parts.push(
      <span key="ref" style={{ fontFamily: 'var(--font-mono)' }}>
        {s.reference}
      </span>,
    )
  }
  if (s.notes) {
    parts.push(<span key="notes">{s.notes}</span>)
  }
  if (parts.length === 0) return null
  return (
    <div className="m">
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          {p}
        </span>
      ))}
    </div>
  )
}

function accommodationName(value: Day['accommodation']): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'name' in value) return value.name || null
  return null
}

function sortedSegments(segs: Segment[]): Segment[] {
  return [...segs].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}


