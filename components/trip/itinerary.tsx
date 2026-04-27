import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import type { ThemeId } from '@/lib/themes'
import { ITINERARY_STYLE } from '@/lib/themes'
import type { Day, MediaLite } from './trip-types'
import { pad2, fmtDayDate, addDaysISO } from '@/lib/trip-format'

type ItineraryProps = {
  theme: ThemeId
  itinerary: Day[]
  media: MediaLite[]
  /** Trip's first-day ISO date — used to compute per-day date when a Day
   *  object doesn't carry its own `date` field (older trips). */
  datesStart?: string | null
  /** ISO 639-1 language for per-day date formatting. */
  language?: string | null
  /** Owner mode wraps with EditableField; public mode renders plain text. */
  renderDayTitle: (day: Day) => ReactNode
  /** Renderer for the day's prose summary. */
  renderDayDescription: (day: Day) => ReactNode
  /** Optional per-day owner extras (photos block, etc.). Public mode: undefined. */
  renderDayExtras?: (day: Day) => ReactNode
}

function getDayPhoto(media: MediaLite[], dayId: string): string | null {
  const m = media.find((x) => x.day_id === dayId && x.type !== 'document')
  return m ? m.url : null
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Normalise any ISO-shaped string to YYYY-MM-DD. Backend serialises Postgres
 * TIMESTAMPTZ as full ISO ("2026-06-08T00:00:00.000Z"), not as a bare date —
 * so the strict regex alone rejects every dates_start coming from the public
 * API. Take the first 10 chars and re-validate.
 */
function toISODate(s: string | null | undefined): string | null {
  if (typeof s !== 'string' || s.length < 10) return null
  const head = s.slice(0, 10)
  return ISO_DATE_RE.test(head) ? head : null
}

/**
 * Resolve the ISO date for a given day. Order:
 *   1. day.date if it normalises to a valid YYYY-MM-DD.
 *   2. computed from datesStart + (dayNumber - 1) — handles older trips.
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

/**
 * Itinerary — single component, three structural variants per TZ-6 §6.4:
 *   editorial  → timeline    (large day numeral on left, content on right)
 *   expedition → photo-cards (full-width photo card with overlay text)
 *   compact    → grid        (two-col responsive grid of card-style days)
 *
 * After the quote simplification, a day is only: title + date + description
 * + photos. No segments, no highlights, no per-day accommodation block —
 * specific facts (flight codes, hotel names, times) live inside the
 * description paragraph itself, exactly as the operator/agent wrote it.
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
                      {dayDateLabel && <div className="day-date">{dayDateLabel}</div>}
                    </div>
                  </div>
                  <DayDescription>{props.renderDayDescription(day)}</DayDescription>
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
              const dayDateLabel = fmtDayDate(resolveDayDate(day, datesStart), language)
              return (
                <article key={day.id || `day-${day.dayNumber}`} className="day">
                  <div className="day-head">
                    <span className="day-num">DAY {pad2(day.dayNumber)}</span>
                    {dayDateLabel && <span className="day-date">{dayDateLabel}</span>}
                  </div>
                  <h3 className="day-title">{props.renderDayTitle(day)}</h3>
                  {photo && (
                    <div className="day-photo" style={{ backgroundImage: `url(${photo})` }} />
                  )}
                  <DayDescription>{props.renderDayDescription(day)}</DayDescription>
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
            const dayDateLabel = fmtDayDate(resolveDayDate(day, datesStart), language)
            return (
              <article key={day.id || `day-${day.dayNumber}`} className="day">
                <div className="day-num">{pad2(day.dayNumber)}</div>
                <div>
                  <h3 className="day-title">{props.renderDayTitle(day)}</h3>
                  {dayDateLabel && <div className="day-date">{dayDateLabel}</div>}
                  <DayDescription>{props.renderDayDescription(day)}</DayDescription>
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
