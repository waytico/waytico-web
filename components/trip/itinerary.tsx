'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import { GripVertical, ImagePlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

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
  /** Owner action: insert a fresh empty day at `atIndex` (0-based). The
   *  handler builds the new day, splices, renumbers, and PATCHes the
   *  full itinerary array; backend reconcileDates() recomputes
   *  dates_end / duration_days / per-day dates from dates_start. */
  onDayInsertAbove?: (atIndex: number) => Promise<boolean> | void
  /** Owner action: remove a day from the itinerary. Receives the full
   *  Day so the caller can decide whether to confirm based on day
   *  content (title / description / attached photos). The handler
   *  filters, renumbers, and PATCHes the full itinerary array. */
  onDayRemove?: (day: Day) => Promise<boolean> | void
  /* ── Magazine-only owner photo handlers (additive). Other variants use
   *     PhotosBlock via renderDayExtras and ignore these props.
   *
   *     The Magazine variant surfaces a single primary photo per day —
   *     hosted directly inside the day spread, not via PhotosBlock — so
   *     it needs its own upload / replace / delete / edit hooks rather
   *     than reusing PhotosBlock's API.
   * ────────────────────────────────────────────────────────────────── */
  /** Empty-state upload: append a new day photo via handleUpload. */
  onDayUpload?: (files: File[], dayId: string) => void
  /** Filled-state replace: in-place file swap on the existing media.id
   *  (uses replacePhoto so sort_order/day_id stay; no race with delete). */
  onDayPhotoReplace?: (file: File, dayId: string, prevPhotoId: string) => void
  /** Filled-state delete: remove the displayed primary photo. The next
   *  photo in sort_order order (if any) becomes primary on the next render. */
  onDayDelete?: (mediaId: string) => void
  /** Filled-state edit-pencil: open the trip-level PhotoLightbox at
   *  initialMode='edit' (parent wires that up to setLightbox + crop UI). */
  onDayPhotoEdit?: (m: MediaLite) => void
  /** Per-day uploading-counter map (from usePhotoUpload). Keyed by day.id. */
  uploadingByDay?: Record<string, number>
  /** Anon-creator intercept: short-circuits both click-to-pick and
   *  drag-and-drop with a "Sign up to edit" toast before any S3 call. */
  interceptUpload?: () => void
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
  const { theme, itinerary, datesStart, language, editable, onReorder, onDayInsertAbove, onDayRemove } = props
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
        onDayInsertAbove={onDayInsertAbove}
        onDayRemove={onDayRemove}
        renderDayTitle={props.renderDayTitle}
        renderDayDescription={props.renderDayDescription}
        onDayUpload={props.onDayUpload}
        onDayPhotoReplace={props.onDayPhotoReplace}
        onDayDelete={props.onDayDelete}
        onDayPhotoEdit={props.onDayPhotoEdit}
        uploadingByDay={props.uploadingByDay}
        interceptUpload={props.interceptUpload}
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
      onDayInsertAbove={onDayInsertAbove}
      onDayRemove={onDayRemove}
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
  onDayInsertAbove?: (atIndex: number) => Promise<boolean> | void
  onDayRemove?: (day: Day) => Promise<boolean> | void
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
    onDayInsertAbove,
    onDayRemove,
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
          onDayInsertAbove={onDayInsertAbove}
          onDayRemove={onDayRemove}
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
  onDayInsertAbove,
  onDayRemove,
}: {
  day: Day
  layout: string
  datesStart?: string | null
  language?: string | null
  media: MediaLite[]
  renderDayTitle: (day: Day) => ReactNode
  renderDayDescription: (day: Day) => ReactNode
  renderDayExtras?: (day: Day) => ReactNode
  onDayInsertAbove?: (atIndex: number) => Promise<boolean> | void
  onDayRemove?: (day: Day) => Promise<boolean> | void
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
    <DayHandleGroup
      day={day}
      layout={layout}
      dragAttributes={attributes}
      dragListeners={listeners}
      onInsertAbove={onDayInsertAbove}
      onRemove={onDayRemove}
    />
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

/* ── Day handle group (drag + insert above + remove) ───────────────────
 *
 * Owner-only cluster of three icon-buttons rendered at the day's
 * top-left corner. Visible on .day:hover (timeline / photo-cards / grid)
 * or .tp-mag-day:hover (Magazine). Each button surfaces an instant
 * CSS-tooltip via `data-tip`; the native browser `title` attribute is
 * deliberately not used because its show-delay (~1-2s) is platform-
 * controlled and cannot be tuned.
 *
 *   [ + ]   insert empty day above this one
 *   [ ⋮⋮ ]  drag handle (the dnd-kit attributes/listeners attach here
 *           ONLY — clicking + or 🗑 must not initiate a drag, so they
 *           stay outside the listener spread).
 *   [ 🗑 ]   remove day
 *
 * Styling lives in styles/themes.css under .tp-itin-handle-group with
 * layout-specific variants (--magazine, --timeline, --photo-cards,
 * --grid) — see those rules for positioning details.
 */
function DayHandleGroup({
  day,
  layout,
  dragAttributes,
  dragListeners,
  onInsertAbove,
  onRemove,
}: {
  day: Day
  layout: string
  dragAttributes: any
  dragListeners: any
  onInsertAbove?: (atIndex: number) => Promise<boolean> | void
  onRemove?: (day: Day) => Promise<boolean> | void
}) {
  // dayNumber is 1-based on the trip page; insert-above means splice
  // at the day's 0-based index (so the new day becomes its predecessor).
  const insertIdx = Math.max(0, (day.dayNumber || 1) - 1)
  return (
    <div
      className={`tp-itin-handle-group tp-itin-handle-group--${layout}`}
      role="group"
      aria-label="Day actions"
    >
      {onInsertAbove && (
        <button
          type="button"
          className="tp-itin-handle-btn tp-itin-tip"
          onClick={(e) => {
            e.stopPropagation()
            onInsertAbove(insertIdx)
          }}
          data-tip="Insert day above"
          aria-label="Insert day above"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        className="tp-itin-handle-btn tp-itin-tip tp-itin-handle-btn--drag"
        data-tip="Drag to reorder"
        aria-label="Drag to reorder day"
        {...dragAttributes}
        {...dragListeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      {onRemove && (
        <button
          type="button"
          className="tp-itin-handle-btn tp-itin-tip"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(day)
          }}
          data-tip="Delete day"
          aria-label="Delete day"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

/* ── Magazine variant ─────────────────────────────────────────────── */

/** Pick the day's primary photo: the lowest sort_order media row that is
 *  not a document and belongs to this day. The Magazine variant
 *  intentionally renders only one photo per day (TZ pass-A decision #7) —
 *  the others remain in the database and continue to show in the
 *  editorial / expedition / compact themes.
 *
 *  Returns null if the day has no stable id yet (legacy row with no UUID
 *  — never matches a media.day_id, so there can't be a photo anyway). */
function getMagazineDayPhoto(media: MediaLite[], dayId: string | undefined): MediaLite | null {
  if (!dayId) return null
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
  onDayInsertAbove?: (atIndex: number) => Promise<boolean> | void
  onDayRemove?: (day: Day) => Promise<boolean> | void
  renderDayTitle: (day: Day) => ReactNode
  renderDayDescription: (day: Day) => ReactNode
  /** Owner-mode photo handlers — see ItineraryProps for the contract. */
  onDayUpload?: (files: File[], dayId: string) => void
  onDayPhotoReplace?: (file: File, dayId: string, prevPhotoId: string) => void
  onDayDelete?: (mediaId: string) => void
  onDayPhotoEdit?: (m: MediaLite) => void
  uploadingByDay?: Record<string, number>
  interceptUpload?: () => void
}

function ItineraryMagazine(props: ItineraryMagazineProps) {
  const {
    itinerary,
    media,
    datesStart,
    language,
    editable,
    onReorder,
    onDayInsertAbove,
    onDayRemove,
    renderDayTitle,
    renderDayDescription,
    onDayUpload,
    onDayPhotoReplace,
    onDayDelete,
    onDayPhotoEdit,
    uploadingByDay,
    interceptUpload,
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

  // Section opens with a hairline rule + ITINERARY eyebrow, mirroring
  // the Accommodation block's header on the same page. Visually the
  // eyebrow sits in the slot the first day would otherwise own — the
  // first day's own border-top + padding-top are suppressed in CSS
  // (.tp-mag-itin__days > .tp-mag-day:first-child) so the section
  // header replaces the would-be top rule of Day 01 instead of stacking
  // a second line directly under the section rule.
  // The id="itinerary" anchor on the section lands on this header, so
  // TopNav's "Itinerary" link takes the visitor straight to Day 1.
  const sectionLead = (
    <header className="tp-mag-itin__header">
      <hr className="tp-mag-rule" />
      <p className="tp-mag-eyebrow tp-mag-itin__eyebrow">ITINERARY</p>
    </header>
  )

  const dayList = items.map((day, idx) => (
    <MagazineDay
      key={day.id || `day-${day.dayNumber}`}
      day={day}
      idx={idx}
      photo={getMagazineDayPhoto(media, day.id)}
      datesStart={datesStart}
      language={language}
      editable={editable}
      renderDayTitle={renderDayTitle}
      renderDayDescription={renderDayDescription}
      onDayUpload={onDayUpload}
      onDayPhotoReplace={onDayPhotoReplace}
      onDayDelete={onDayDelete}
      onDayPhotoEdit={onDayPhotoEdit}
      uploading={day.id ? (uploadingByDay?.[day.id] ?? 0) : 0}
      interceptUpload={interceptUpload}
      onDayInsertAbove={onDayInsertAbove}
      onDayRemove={onDayRemove}
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
 *
 * Photo handling lives in <MagazineDayPhoto> below — see that component
 * for the public/owner contract (Magazine: ONE photo per day, public
 * stays read-only, owner gets upload / replace / edit-pencil / delete).
 */
function MagazineDay(props: {
  day: Day
  idx: number
  photo: MediaLite | null
  datesStart?: string | null
  language?: string | null
  editable: boolean
  renderDayTitle: (day: Day) => ReactNode
  renderDayDescription: (day: Day) => ReactNode
  onDayUpload?: (files: File[], dayId: string) => void
  onDayPhotoReplace?: (file: File, dayId: string, prevPhotoId: string) => void
  onDayDelete?: (mediaId: string) => void
  onDayPhotoEdit?: (m: MediaLite) => void
  uploading: number
  interceptUpload?: () => void
  onDayInsertAbove?: (atIndex: number) => Promise<boolean> | void
  onDayRemove?: (day: Day) => Promise<boolean> | void
}) {
  const {
    day,
    idx,
    photo,
    datesStart,
    language,
    editable,
    renderDayTitle,
    renderDayDescription,
    onDayUpload,
    onDayPhotoReplace,
    onDayDelete,
    onDayPhotoEdit,
    uploading,
    interceptUpload,
    onDayInsertAbove,
    onDayRemove,
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

  // Photo block: render only when there is something to show.
  // Public + no photo → no block at all (clean reading layout).
  // Public + photo    → MagazineDayPhoto in static mode.
  // Owner + photo     → MagazineDayPhoto with overlay actions.
  // Owner + no photo  → MagazineDayPhoto empty-state picker.
  // Owner without a stable day.id (legacy row) — also no block: we can't
  // attach uploads to a phantom day_id; the operator must save the day
  // first (which lands an id).
  const showPhotoBlock = editable ? Boolean(day.id) : Boolean(photo)

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
        <DayHandleGroup
          day={day}
          layout="magazine"
          dragAttributes={sortable.attributes}
          dragListeners={sortable.listeners}
          onInsertAbove={onDayInsertAbove}
          onRemove={onDayRemove}
        />
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

      {showPhotoBlock && (
        <div className="tp-mag-day__photo">
          <MagazineDayPhoto
            dayId={day.id || ''}
            photo={photo}
            editable={editable}
            uploading={uploading}
            onUpload={onDayUpload}
            onReplace={onDayPhotoReplace}
            onDelete={onDayDelete}
            onEdit={onDayPhotoEdit}
            interceptUpload={interceptUpload}
          />
        </div>
      )}
    </article>
  )
}

/**
 * Magazine day photo — single primary photo per day with all owner-mode
 * surfaces (upload / replace / edit-pencil / delete). Public viewer gets
 * a non-interactive <img>; clicking it does nothing (lightbox is owner-
 * only in Magazine, and only via the explicit pencil button).
 *
 * States (all owner-mode):
 *   - empty + idle     → clickable placeholder + dropzone, "Drag or add photo"
 *   - empty + drag-over→ same placeholder, accent-tinted ring
 *   - uploading        → placeholder with spinner pill (replace happens in place
 *                        on filled state too — pill rides on top of <img>)
 *   - filled + idle    → <img> + overlay actions:
 *                          [pill: Drag or change photo]
 *                          [edit-pencil] (opens lightbox in initialMode='edit')
 *                          [trash]
 *   - filled + drag-over → <img> + "Drop to replace" overlay
 *
 * Anon-creator: interceptUpload short-circuits both the picker click and
 * any drag-and-drop before any S3 work — same pattern as HeroDropZone.
 *
 * Replace semantics:
 *   - Empty → onUpload(files, dayId) — append a new media row (sort_order
 *     auto). On filled days with multiple photos (legacy), this would
 *     never be hit (we'd be in filled state).
 *   - Filled → onReplace(file, dayId, prevPhotoId) — in-place PATCH on
 *     the existing media.id via replacePhoto, preserving sort_order and
 *     day_id. No race with delete.
 *   - Multi-file drop → only the first file is consumed, with a toast
 *     hint (mirrors handleHeroUpload UX).
 */
function MagazineDayPhoto(props: {
  dayId: string
  photo: MediaLite | null
  editable: boolean
  uploading: number
  onUpload?: (files: File[], dayId: string) => void
  onReplace?: (file: File, dayId: string, prevPhotoId: string) => void
  onDelete?: (mediaId: string) => void
  onEdit?: (m: MediaLite) => void
  interceptUpload?: () => void
}) {
  const { dayId, photo, editable, uploading, onUpload, onReplace, onDelete, onEdit, interceptUpload } = props
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Public viewer — just the image, no interactivity.
  if (!editable) {
    if (!photo) return null
    return (
      <img
        src={photo.url}
        alt={photo.caption || ''}
        className="tp-mag-day__photo-img"
        draggable={false}
      />
    )
  }

  // Owner from here on.
  const isUploading = uploading > 0

  const handleFiles = (files: FileList | File[] | null) => {
    if (!files) return
    const list = Array.from(files).filter(
      (f) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) &&
        f.size <= 15 * 1024 * 1024,
    )
    if (list.length === 0) return
    if (list.length > 1) {
      // Magazine surfaces one photo per day; rest of the array is
      // dropped. We don't fall back to the editorial gallery here
      // because that would visibly differ from the operator's intent
      // (they dropped on Magazine, they expect Magazine semantics).
      // The first file wins.
    }
    const first = list[0]
    if (photo && onReplace) {
      onReplace(first, dayId, photo.id)
    } else if (!photo && onUpload) {
      onUpload([first], dayId)
    }
  }

  const triggerPicker = () => {
    if (interceptUpload) {
      interceptUpload()
      return
    }
    inputRef.current?.click()
  }

  const handleDelete = () => {
    if (!photo || !onDelete) return
    if (interceptUpload) {
      interceptUpload()
      return
    }
    onDelete(photo.id)
  }

  const handleEdit = () => {
    if (!photo || !onEdit) return
    if (interceptUpload) {
      interceptUpload()
      return
    }
    onEdit(photo)
  }

  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault()
      if (interceptUpload) return
      if (e.dataTransfer?.types?.includes('Files')) setDragOver(true)
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      if (interceptUpload) return
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget === e.target) setDragOver(false)
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (interceptUpload) {
        interceptUpload()
        return
      }
      const files = e.dataTransfer?.files
      if (files && files.length > 0) handleFiles(files)
    },
  }

  // Hidden file input — shared between empty and filled clickable surfaces.
  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="hidden"
      onChange={(e) => {
        handleFiles(e.target.files)
        e.target.value = ''
      }}
    />
  )

  // Empty state — clickable placeholder that doubles as a dropzone.
  if (!photo) {
    return (
      <>
        {fileInput}
        <button
          type="button"
          onClick={triggerPicker}
          className={
            'tp-mag-day__photo-empty' + (dragOver ? ' is-dragover' : '')
          }
          aria-label="Add day photo"
          {...dropHandlers}
        >
          {isUploading ? (
            <span className="tp-mag-day__photo-empty-label">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading…
            </span>
          ) : (
            <span className="tp-mag-day__photo-empty-label">
              <ImagePlus className="h-3.5 w-3.5" />
              Drag or add photo
            </span>
          )}
        </button>
      </>
    )
  }

  // Filled state — <img> + overlay actions, always-visible (mobile has
  // no hover affordance).
  return (
    <div
      className={
        'tp-mag-day__photo-zone' + (dragOver ? ' is-dragover' : '')
      }
      {...dropHandlers}
    >
      {fileInput}
      <img
        src={photo.url}
        alt={photo.caption || ''}
        className="tp-mag-day__photo-img"
        draggable={false}
      />

      {dragOver && (
        <div className="tp-mag-day__photo-drag-overlay" aria-hidden="true">
          <span>Drop photo to replace</span>
        </div>
      )}

      <div className="tp-mag-day__photo-actions">
        {isUploading ? (
          <span className="tp-mag-day__photo-pill">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Uploading…
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={triggerPicker}
              className="tp-mag-day__photo-pill is-clickable"
              aria-label="Change day photo"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              <span className="tp-mag-day__photo-pill-label">
                Drag or change photo
              </span>
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="tp-mag-day__photo-action-btn"
              aria-label="Edit photo"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="tp-mag-day__photo-action-btn"
              aria-label="Delete day photo"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
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
