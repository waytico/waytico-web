'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import type { ThemeId } from '@/lib/themes'
import { ITINERARY_STYLE } from '@/lib/themes'
import type { Day, MediaLite } from './trip-types'
import { pad2, fmtDayDate, addDaysISO } from '@/lib/trip-format'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

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
  /** When true, days become draggable via a left-side grip handle. The
   *  consumer is given the new order via onReorder; backend
   *  reconcileDates() will recompute per-day dates from dates_start. */
  editable?: boolean
  /** Called after drag-end with the reordered Day array. The handler
   *  is expected to PATCH /api/projects/:id with the new itinerary
   *  (including refreshed dayNumber values). */
  onReorder?: (next: Day[]) => Promise<boolean> | void
  /** Open the trip-level PhotoLightbox from a day photo click. Magazine
   *  variant inlines the day's primary photo (no PhotosBlock), so it
   *  needs a direct callback. Other variants ignore it (lightbox open
   *  goes through renderDayExtras → PhotosBlock as before). */
  onPhotoClick?: (m: MediaLite) => void
}

function getDayPhoto(media: MediaLite[], dayId: string): string | null {
  const m = media.find((x) => x.day_id === dayId && x.type !== 'document')
  return m ? m.url : null
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function toISODate(s: string | null | undefined): string | null {
  if (typeof s !== 'string' || s.length < 10) return null
  const head = s.slice(0, 10)
  return ISO_DATE_RE.test(head) ? head : null
}

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
 * Owner mode (editable=true) layers @dnd-kit on top of all three
 * variants: each day becomes sortable via a left-side grip handle.
 * The handle is the only drag origin (PointerSensor activated only on
 * elements that opt in via the dnd-kit listeners), so inline-edit
 * clicks on the title/description aren't intercepted by drag.
 *
 * After reorder, onReorder is called with the new Day[] (with
 * dayNumber refreshed and date stripped) — backend reconcileDates()
 * recomputes per-day dates from dates_start.
 */
export function TripItinerary(props: ItineraryProps) {
  const { theme, itinerary, datesStart, language, editable, onReorder } = props
  if (!Array.isArray(itinerary) || itinerary.length === 0) return null
  const itineraryStyle = ITINERARY_STYLE[theme]

  const head = (
    <header className="tp-section-head">
      <h2 className="tp-display tp-section-title">{UI.sectionLabels.itinerary}</h2>
      <span className="tp-section-num">
        {itinerary.length} {UI.days}
      </span>
    </header>
  )

  if (itineraryStyle === 'magazine') {
    return (
      <ItineraryMagazine
        itinerary={itinerary}
        media={props.media}
        datesStart={datesStart}
        language={language}
        editable={!!editable}
        onReorder={onReorder}
        onPhotoClick={props.onPhotoClick}
        renderDayTitle={props.renderDayTitle}
        renderDayDescription={props.renderDayDescription}
      />
    )
  }

  if (!editable) {
    // Public/non-editable view — plain layout for the chosen theme.
    return (
      <PlainItinerary
        itinerary={itinerary}
        head={head}
        layout={itineraryStyle}
        datesStart={datesStart}
        language={language}
        media={props.media}
        renderDayTitle={props.renderDayTitle}
        renderDayDescription={props.renderDayDescription}
        renderDayExtras={props.renderDayExtras}
      />
    )
  }

  return (
    <DndSortable
      itinerary={itinerary}
      onReorder={onReorder}
      head={head}
      layout={itineraryStyle}
      datesStart={datesStart}
      language={language}
      media={props.media}
      renderDayTitle={props.renderDayTitle}
      renderDayDescription={props.renderDayDescription}
      renderDayExtras={props.renderDayExtras}
    />
  )
}

/* ── Plain (public) layout ─────────────────────────────────────────── */

function PlainItinerary(props: {
  itinerary: Day[]
  head: ReactNode
  layout: string
  datesStart?: string | null
  language?: string | null
  media: MediaLite[]
  renderDayTitle: (day: Day) => ReactNode
  renderDayDescription: (day: Day) => ReactNode
  renderDayExtras?: (day: Day) => ReactNode
}) {
  const {
    itinerary,
    head,
    layout,
    datesStart,
    language,
    media,
    renderDayTitle,
    renderDayDescription,
    renderDayExtras,
  } = props

  const renderDay = (day: Day) => (
    <PlainDayShell
      key={day.id || `day-${day.dayNumber}`}
      day={day}
      layout={layout}
      datesStart={datesStart}
      language={language}
      media={media}
      renderDayTitle={renderDayTitle}
      renderDayDescription={renderDayDescription}
      renderDayExtras={renderDayExtras}
    />
  )

  if (layout === 'photo-cards') {
    return (
      <section className="tp-section" id="itinerary" style={{ paddingBottom: 0 }}>
        <div className="tp-container">{head}</div>
        <div className="tp-itin--photo-cards">{itinerary.map(renderDay)}</div>
      </section>
    )
  }
  if (layout === 'grid') {
    return (
      <section className="tp-section" id="itinerary">
        <div className="tp-container">
          {head}
          <div className="tp-itin--grid">{itinerary.map(renderDay)}</div>
        </div>
      </section>
    )
  }
  return (
    <section className="tp-section" id="itinerary">
      <div className="tp-container">
        {head}
        <div className="tp-itin--timeline">{itinerary.map(renderDay)}</div>
      </div>
    </section>
  )
}

function PlainDayShell({
  day,
  layout,
  datesStart,
  language,
  media,
  renderDayTitle,
  renderDayDescription,
  renderDayExtras,
}: {
  day: Day
  layout: string
  datesStart?: string | null
  language?: string | null
  media: MediaLite[]
  renderDayTitle: (day: Day) => ReactNode
  renderDayDescription: (day: Day) => ReactNode
  renderDayExtras?: (day: Day) => ReactNode
}) {
  const photo = getDayPhoto(media, day.id)
  const dayDateLabel = fmtDayDate(resolveDayDate(day, datesStart), language)

  if (layout === 'photo-cards') {
    return (
      <article
        className="day"
        style={photo ? { backgroundImage: `url(${photo})` } : undefined}
      >
        <div className="tp-container" style={{ padding: 0, position: 'relative', zIndex: 1 }}>
          <div className="day-head">
            <span className="day-num">{pad2(day.dayNumber)}</span>
            <div>
              <h3 className="day-title">{renderDayTitle(day)}</h3>
              {dayDateLabel && <div className="day-date">{dayDateLabel}</div>}
            </div>
          </div>
          <DayDescription>{renderDayDescription(day)}</DayDescription>
          {renderDayExtras?.(day)}
        </div>
      </article>
    )
  }
  if (layout === 'grid') {
    return (
      <article className="day">
        <div className="day-head">
          <span className="day-num">DAY {pad2(day.dayNumber)}</span>
          {dayDateLabel && <span className="day-date">{dayDateLabel}</span>}
        </div>
        <h3 className="day-title">{renderDayTitle(day)}</h3>
        {photo && <div className="day-photo" style={{ backgroundImage: `url(${photo})` }} />}
        <DayDescription>{renderDayDescription(day)}</DayDescription>
        {renderDayExtras?.(day)}
      </article>
    )
  }
  return (
    <article className="day">
      <div className="day-num">{pad2(day.dayNumber)}</div>
      <div>
        <h3 className="day-title">{renderDayTitle(day)}</h3>
        {dayDateLabel && <div className="day-date">{dayDateLabel}</div>}
        <DayDescription>{renderDayDescription(day)}</DayDescription>
        {renderDayExtras?.(day)}
      </div>
    </article>
  )
}

/* ── Drag-and-drop owner view ─────────────────────────────── */

function DndSortable(props: {
  itinerary: Day[]
  onReorder?: (next: Day[]) => Promise<boolean> | void
  head: ReactNode
  layout: string
  datesStart?: string | null
  language?: string | null
  media: MediaLite[]
  renderDayTitle: (day: Day) => ReactNode
  renderDayDescription: (day: Day) => ReactNode
  renderDayExtras?: (day: Day) => ReactNode
}) {
  const {
    itinerary,
    onReorder,
    head,
    layout,
    datesStart,
    language,
    media,
    renderDayTitle,
    renderDayDescription,
    renderDayExtras,
  } = props

  // Local mirror so we can do an optimistic reorder before the backend
  // confirms. Sync from props on every reference change so any upstream
  // edit — title, description, date, day insert/delete, drag reorder
  // landed by another tab, agent-driven reorder via chat — flows down
  // without waiting for a remount. The effect runs in the commit phase
  // after each render whose deps changed, so it never overwrites the
  // optimistic value we just set inside handleDragEnd in the same
  // synchronous turn (parent setData fires only after the await onReorder
  // resolves, by which point the backend has reconciled the order, and
  // the arriving itinerary matches what we already set locally).
  const [items, setItems] = useState<Day[]>(itinerary)
  useEffect(() => {
    setItems(itinerary)
  }, [itinerary])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 4px drift before drag activates — keeps incidental clicks from
      // becoming drags, esp. on the inline-edit title/description.
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((d) => (d.id || `day-${d.dayNumber}`) === active.id)
    const newIndex = items.findIndex((d) => (d.id || `day-${d.dayNumber}`) === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(items, oldIndex, newIndex).map((d, i) => ({
      ...d,
      dayNumber: i + 1,
      // Strip per-day date so reconcileDates() recomputes from dates_start.
      date: null,
    })) as Day[]

    setItems(reordered)

    if (onReorder) {
      const ok = await onReorder(reordered)
      if (ok === false) setItems(itinerary)
    }
  }

  const dayIds = items.map((d) => d.id || `day-${d.dayNumber}`)

  const inner = (
    <SortableContext items={dayIds} strategy={verticalListSortingStrategy}>
      {items.map((day) => (
        <SortableDay
          key={day.id || `day-${day.dayNumber}`}
          day={day}
          layout={layout}
          datesStart={datesStart}
          language={language}
          media={media}
          renderDayTitle={renderDayTitle}
          renderDayDescription={renderDayDescription}
          renderDayExtras={renderDayExtras}
        />
      ))}
    </SortableContext>
  )

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      {layout === 'photo-cards' ? (
        <section className="tp-section" id="itinerary" style={{ paddingBottom: 0 }}>
          <div className="tp-container">{head}</div>
          <div className="tp-itin--photo-cards">{inner}</div>
        </section>
      ) : layout === 'grid' ? (
        <section className="tp-section" id="itinerary">
          <div className="tp-container">
            {head}
            <div className="tp-itin--grid">{inner}</div>
          </div>
        </section>
      ) : (
        <section className="tp-section" id="itinerary">
          <div className="tp-container">
            {head}
            <div className="tp-itin--timeline">{inner}</div>
          </div>
        </section>
      )}
    </DndContext>
  )
}

function SortableDay({
  day,
  layout,
  datesStart,
  language,
  media,
  renderDayTitle,
  renderDayDescription,
  renderDayExtras,
}: {
  day: Day
  layout: string
  datesStart?: string | null
  language?: string | null
  media: MediaLite[]
  renderDayTitle: (day: Day) => ReactNode
  renderDayDescription: (day: Day) => ReactNode
  renderDayExtras?: (day: Day) => ReactNode
}) {
  const id = day.id || `day-${day.dayNumber}`
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  }

  const handle = (
    <button
      type="button"
      className="tp-itin-handle"
      aria-label="Drag to reorder day"
      title="Drag to reorder"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-4 h-4" />
    </button>
  )

  const photo = getDayPhoto(media, day.id)
  const dayDateLabel = fmtDayDate(resolveDayDate(day, datesStart), language)

  if (layout === 'photo-cards') {
    return (
      <article
        ref={setNodeRef}
        style={{ ...style, ...(photo ? { backgroundImage: `url(${photo})` } : null) }}
        className={'day' + (isDragging ? ' is-dragging' : '')}
      >
        {handle}
        <div className="tp-container" style={{ padding: 0, position: 'relative', zIndex: 1 }}>
          <div className="day-head">
            <span className="day-num">{pad2(day.dayNumber)}</span>
            <div>
              <h3 className="day-title">{renderDayTitle(day)}</h3>
              {dayDateLabel && <div className="day-date">{dayDateLabel}</div>}
            </div>
          </div>
          <DayDescription>{renderDayDescription(day)}</DayDescription>
          {renderDayExtras?.(day)}
        </div>
      </article>
    )
  }

  if (layout === 'grid') {
    return (
      <article
        ref={setNodeRef}
        style={style}
        className={'day' + (isDragging ? ' is-dragging' : '')}
      >
        {handle}
        <div className="day-head">
          <span className="day-num">DAY {pad2(day.dayNumber)}</span>
          {dayDateLabel && <span className="day-date">{dayDateLabel}</span>}
        </div>
        <h3 className="day-title">{renderDayTitle(day)}</h3>
        {photo && <div className="day-photo" style={{ backgroundImage: `url(${photo})` }} />}
        <DayDescription>{renderDayDescription(day)}</DayDescription>
        {renderDayExtras?.(day)}
      </article>
    )
  }

  // timeline
  return (
    <article
      ref={setNodeRef}
      style={style}
      className={'day' + (isDragging ? ' is-dragging' : '')}
    >
      {handle}
      <div className="day-num">{pad2(day.dayNumber)}</div>
      <div>
        <h3 className="day-title">{renderDayTitle(day)}</h3>
        {dayDateLabel && <div className="day-date">{dayDateLabel}</div>}
        <DayDescription>{renderDayDescription(day)}</DayDescription>
        {renderDayExtras?.(day)}
      </div>
    </article>
  )
}

function DayDescription({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="day-desc">{children}</p>
}

/* ── Magazine variant ─────────────────────────────────────────────── */

/** Pick the day's primary photo: the lowest sort_order media row that is
 *  not a document and belongs to this day. The Magazine variant
 *  intentionally renders only one photo per day (TZ pass-A decision #7) —
 *  the others remain in the database and continue to show in the
 *  editorial / expedition / compact themes. */
function getMagazineDayPhoto(media: MediaLite[], dayId: string): MediaLite | null {
  const list = media
    .filter((m) => m.day_id === dayId && m.type !== 'document')
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  return list[0] ?? null
}

type ItineraryMagazineProps = {
  itinerary: Day[]
  media: MediaLite[]
  datesStart?: string | null
  language?: string | null
  editable: boolean
  onReorder?: (next: Day[]) => Promise<boolean> | void
  onPhotoClick?: (m: MediaLite) => void
  renderDayTitle: (day: Day) => ReactNode
  renderDayDescription: (day: Day) => ReactNode
}

function ItineraryMagazine(props: ItineraryMagazineProps) {
  const {
    itinerary,
    media,
    datesStart,
    language,
    editable,
    onReorder,
    onPhotoClick,
    renderDayTitle,
    renderDayDescription,
  } = props

  // Local mirror so we can do an optimistic reorder before the backend
  // confirms (mirrors the DndSortable wrapper used by the other variants).
  // Sync from props on every reference change so any upstream edit —
  // title, description, date, day insert/delete, drag reorder landed by
  // another tab, agent-driven reorder via chat — flows down without
  // waiting for a remount. The effect runs after each render whose deps
  // changed, so it never overwrites the optimistic value we just set
  // inside handleDragEnd in the same synchronous turn.
  const [items, setItems] = useState<Day[]>(itinerary)
  useEffect(() => {
    setItems(itinerary)
  }, [itinerary])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((d) => (d.id || `day-${d.dayNumber}`) === active.id)
    const newIndex = items.findIndex((d) => (d.id || `day-${d.dayNumber}`) === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(items, oldIndex, newIndex).map((d, i) => ({
      ...d,
      dayNumber: i + 1,
      // Strip per-day date so backend reconcileDates() recomputes from dates_start.
      date: null,
    })) as Day[]
    setItems(reordered)
    if (onReorder) {
      const ok = await onReorder(reordered)
      // Optimistic rollback on failed PATCH (TZ pitfall #12).
      if (ok === false) setItems(itinerary)
    }
  }

  const dayIds = items.map((d) => d.id || `day-${d.dayNumber}`)

  // Section opens with just a hairline rule. The eyebrow+subtitle header
  // was removed — the canonical Magazine reference jumps straight from
  // the overview block's prose into "DAY 01 — …", with no "ITINERARY"
  // label between them. Each day spread carries its own DAY NN eyebrow,
  // which is the only label the section needs. The rule keeps the visual
  // separation between sections that other Magazine blocks also use.
  // The id="itinerary" anchor on the section lands on this rule, which
  // sits immediately above the first day — TopNav's "Itinerary" link
  // therefore takes the visitor straight to Day 1 (intended UX).
  const sectionLead = <hr className="tp-mag-rule" />

  const dayList = items.map((day, idx) => (
    <MagazineDay
      key={day.id || `day-${day.dayNumber}`}
      day={day}
      idx={idx}
      photo={getMagazineDayPhoto(media, day.id)}
      datesStart={datesStart}
      language={language}
      editable={editable}
      onPhotoClick={onPhotoClick}
      renderDayTitle={renderDayTitle}
      renderDayDescription={renderDayDescription}
    />
  ))

  if (!editable) {
    return (
      <section className="tp-mag-section tp-mag-itin" id="itinerary">
        <div className="tp-mag-container">
          {sectionLead}
          <div className="tp-mag-itin__days">{dayList}</div>
        </div>
      </section>
    )
  }

  return (
    <section className="tp-mag-section tp-mag-itin" id="itinerary">
      <div className="tp-mag-container">
        {sectionLead}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={dayIds} strategy={verticalListSortingStrategy}>
            <div className="tp-mag-itin__days">{dayList}</div>
          </SortableContext>
        </DndContext>
      </div>
    </section>
  )
}

/** Single day spread.
 *
 * Desktop ≥1024px: alternating image/text layout — even-indexed days
 * (Day 1, 3, 5…) put the photo on the left, odd-indexed reverse it.
 * Mobile <1024px: single column, photo on top, no reverse.
 *
 * In owner mode the day is wrapped in a sortable handle so dnd-kit can
 * reorder. Inline-edit clicks on the title/description are not
 * intercepted thanks to the PointerSensor 4px activation distance.
 */
function MagazineDay(props: {
  day: Day
  idx: number
  photo: MediaLite | null
  datesStart?: string | null
  language?: string | null
  editable: boolean
  onPhotoClick?: (m: MediaLite) => void
  renderDayTitle: (day: Day) => ReactNode
  renderDayDescription: (day: Day) => ReactNode
}) {
  const {
    day,
    idx,
    photo,
    datesStart,
    language,
    editable,
    onPhotoClick,
    renderDayTitle,
    renderDayDescription,
  } = props
  const id = day.id || `day-${day.dayNumber}`
  const sortable = useSortable({ id })

  const dragStyle: React.CSSProperties = editable
    ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.6 : 1,
        zIndex: sortable.isDragging ? 10 : undefined,
        position: 'relative',
      }
    : {}

  const isReverse = idx % 2 === 1
  const dayDateLabel = fmtDayDate(resolveDayDate(day, datesStart), language)
  const eyebrowText = `${UI.day.toUpperCase()} ${pad2(day.dayNumber)}`

  const photoNode = photo ? (
    <button
      type="button"
      className="tp-mag-day__photo-btn"
      onClick={() => onPhotoClick?.(photo)}
      aria-label="Open photo"
    >
      <img
        src={photo.url}
        alt={photo.caption || ''}
        className="tp-mag-day__photo-img"
        draggable={false}
      />
    </button>
  ) : editable ? (
    <div className="tp-mag-day__photo-empty" aria-hidden="true">
      <span>+ Add photo</span>
    </div>
  ) : null

  return (
    <article
      ref={editable ? sortable.setNodeRef : undefined}
      className={
        'tp-mag-day' +
        (isReverse ? ' tp-mag-day--reverse' : '') +
        (editable && sortable.isDragging ? ' is-dragging' : '')
      }
      style={dragStyle}
    >
      {editable && (
        <button
          type="button"
          className="tp-itin-handle tp-mag-day__handle"
          aria-label="Drag to reorder day"
          title="Drag to reorder"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {/* Two siblings of <article>: a text column (header + body) and a
       *  photo. On desktop the grid puts text-col in one column and
       *  photo in the other (alternating left/right via --reverse).
       *  On mobile the text-col uses display:contents to "promote" its
       *  header + body up to the article's flex parent, so the visual
       *  order becomes header / photo / body — matching the magazine
       *  mobile canon. The photo also goes full-bleed on mobile (see
       *  themes.css). */}
      <div className="tp-mag-day__text-col">
        <header className="tp-mag-day__header">
          <p className="tp-mag-day__eyebrow">{eyebrowText}</p>
          <h3 className="tp-mag-day__title">{renderDayTitle(day)}</h3>
          {dayDateLabel && <p className="tp-mag-day__date">{dayDateLabel}</p>}
        </header>

        <div className="tp-mag-day__body">{renderDayDescription(day)}</div>
      </div>

      {photoNode && <div className="tp-mag-day__photo">{photoNode}</div>}
    </article>
  )
}

/**
 * Magazine day title — split on a single embedded \n into a regular
 * head and an italic tail, rendered on ONE line with a space between
 * them. Same separator semantics as the hero title (Head\nTail), but
 * the day title visually stays on a single row — the \n only marks
 * "where italic begins".
 *
 * Examples:
 *   "Arrival in\nVancouver"          → Arrival in *Vancouver*
 *   "Victoria and\nButchart Gardens" → Victoria and *Butchart Gardens*
 *
 * If the title has no \n (legacy data, "Arrival in Vancouver" as one
 * fragment), render plain regular — no italic, no spans. The pipeline
 * + editor agent (pipeline_days v11 / trip_editor v15) produce new
 * day titles in the Head\nTail shape; existing titles stay valid and
 * render plain until the operator asks the agent to rewrite them.
 *
 * Used by trip-page-client both directly (public viewer) and as the
 * `renderDisplay` callback of the EditableField used for the day title
 * in owner mode — so the operator sees the formatted italic-tail layout
 * when not actively editing.
 */
export function MagazineDayTitle({ text }: { text: string }) {
  if (!text) return null
  const idx = text.indexOf('\n')
  if (idx === -1) {
    // Legacy single-fragment title — render plain.
    return <span>{text}</span>
  }
  const head = text.slice(0, idx).trimEnd()
  const tail = text.slice(idx + 1).trimStart()
  if (!tail) {
    // Stray trailing \n — degrade gracefully to plain head.
    return <span>{head}</span>
  }
  return (
    <>
      <span className="tp-mag-day__title-head">{head}</span>
      {' '}
      <em className="tp-mag-day__title-tail">{tail}</em>
    </>
  )
}
