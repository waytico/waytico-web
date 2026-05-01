'use client'

import { useState, type ReactNode } from 'react'
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

/* ── Layout resolution ─────────────────────────────────────────────
 *
 * Three new themes (magazine / serene / frontier) share DOM with
 * the existing three (editorial / expedition / compact) and add
 * their own visual flavour via a sibling .tp-itin--{modifier} class
 * defined in styles/themes.css. The base is what the JSX branches
 * on (it determines the DOM shape); the modifier is only ever
 * styling. Owner-mode @dnd-kit overlays continue to work because
 * the DOM is unchanged for any given base.
 *
 *   magazine → timeline base    (editorial day-num + title + photo + prose)
 *   centered → timeline base    (same DOM, centered + italic via modifier)
 *   frontier → photo-cards base (full-bleed photo card)
 */
type ItineraryBase = 'timeline' | 'photo-cards' | 'grid'

function resolveLayout(
  layout: string,
): { base: ItineraryBase; modifier: '' | 'magazine' | 'centered' | 'frontier' } {
  if (layout === 'magazine') return { base: 'timeline', modifier: 'magazine' }
  if (layout === 'centered') return { base: 'timeline', modifier: 'centered' }
  if (layout === 'frontier') return { base: 'photo-cards', modifier: 'frontier' }
  if (layout === 'photo-cards' || layout === 'grid') return { base: layout, modifier: '' }
  return { base: 'timeline', modifier: '' }
}

function itinClass(base: ItineraryBase, modifier: string): string {
  return modifier ? `tp-itin--${base} tp-itin--${modifier}` : `tp-itin--${base}`
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

  const { base, modifier } = resolveLayout(layout)
  const containerClass = itinClass(base, modifier)

  const renderDay = (day: Day) => (
    <PlainDayShell
      key={day.id || `day-${day.dayNumber}`}
      day={day}
      layout={base}
      datesStart={datesStart}
      language={language}
      media={media}
      renderDayTitle={renderDayTitle}
      renderDayDescription={renderDayDescription}
      renderDayExtras={renderDayExtras}
    />
  )

  if (base === 'photo-cards') {
    return (
      <section className="tp-section" id="itinerary" style={{ paddingBottom: 0 }}>
        <div className="tp-container">{head}</div>
        <div className={containerClass}>{itinerary.map(renderDay)}</div>
      </section>
    )
  }
  if (base === 'grid') {
    return (
      <section className="tp-section" id="itinerary">
        <div className="tp-container">
          {head}
          <div className={containerClass}>{itinerary.map(renderDay)}</div>
        </div>
      </section>
    )
  }
  return (
    <section className="tp-section" id="itinerary">
      <div className="tp-container">
        {head}
        <div className={containerClass}>{itinerary.map(renderDay)}</div>
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
  // confirms. Sync from props whenever upstream order changes (e.g. the
  // agent reorders via chat while the operator has the page open).
  const [items, setItems] = useState<Day[]>(itinerary)
  if (
    items.length !== itinerary.length ||
    items.some((d, i) => d.id !== itinerary[i].id)
  ) {
    setItems(itinerary)
  }

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

  const { base, modifier } = resolveLayout(layout)
  const containerClass = itinClass(base, modifier)

  const dayIds = items.map((d) => d.id || `day-${d.dayNumber}`)

  const inner = (
    <SortableContext items={dayIds} strategy={verticalListSortingStrategy}>
      {items.map((day) => (
        <SortableDay
          key={day.id || `day-${day.dayNumber}`}
          day={day}
          layout={base}
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
      {base === 'photo-cards' ? (
        <section className="tp-section" id="itinerary" style={{ paddingBottom: 0 }}>
          <div className="tp-container">{head}</div>
          <div className={containerClass}>{inner}</div>
        </section>
      ) : base === 'grid' ? (
        <section className="tp-section" id="itinerary">
          <div className="tp-container">
            {head}
            <div className={containerClass}>{inner}</div>
          </div>
        </section>
      ) : (
        <section className="tp-section" id="itinerary">
          <div className="tp-container">
            {head}
            <div className={containerClass}>{inner}</div>
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
