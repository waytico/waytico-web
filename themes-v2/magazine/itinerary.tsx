/**
 * Magazine — Itinerary section.
 *
 * Stage 3: in owner mode, days reorder via @dnd-kit (the same library
 * the legacy ветка uses). Day numbers are renumerated on drop, dates
 * are stripped (the backend's reconcileDates() recomputes them from
 * dates_start), and the new array is persisted via saveProjectPatch
 * with `itinerary` as a flat list of {id, dayNumber} objects.
 *
 * In public mode there's no @dnd-kit — just a stack of MagazineDay
 * sections, no listeners, no overhead.
 */
'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { Day, ThemePropsV2 } from '@/types/theme-v2'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { MagazineDay, DayDragHandle } from './day'

export function Itinerary({ data }: ThemePropsV2) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable

  const baseDays = (data.project.itinerary ?? []) as Day[]
  const [localDays, setLocalDays] = useState<Day[]>(baseDays)

  // Keep localDays in sync when SSR / refresh hands us a new payload.
  useEffect(() => {
    setLocalDays(baseDays)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseDays.length, baseDays.map((d) => d.id).join(',')])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = localDays.findIndex((d) => d.id === active.id)
    const newIdx = localDays.findIndex((d) => d.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const reordered = arrayMove(localDays, oldIdx, newIdx).map((d, i) => ({
      ...d,
      dayNumber: i + 1,
      // Strip date — backend reconcileDates() will recompute from dates_start.
      date: null,
    }))
    setLocalDays(reordered)
    void ctx!.mutations.saveProjectPatch({ itinerary: reordered })
  }

  if (localDays.length === 0) return null

  if (!editable) {
    // Public mode: bypass dnd-kit entirely.
    return (
      <>
        {localDays.map((day, i) => (
          <MagazineDay
            key={day.id}
            day={day}
            media={data.media}
            isLast={i === localDays.length - 1}
          />
        ))}
      </>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={localDays.map((d) => d.id)} strategy={verticalListSortingStrategy}>
        {localDays.map((day, i) => (
          <SortableDay
            key={day.id}
            day={day}
            media={data.media}
            isLast={i === localDays.length - 1}
          />
        ))}
      </SortableContext>
    </DndContext>
  )
}

function SortableDay({ day, media, isLast }: { day: Day; media: ThemePropsV2['data']['media']; isLast: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: day.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  // Pass the drag handle as a slot — listeners attach to the handle, not
  // the entire section, so the operator can still click into editable
  // text fields without grabbing.
  const handle = (
    <span {...attributes} {...listeners} className="mag-inline-flex">
      <DayDragHandle />
    </span>
  )

  return (
    <div ref={setNodeRef} style={style}>
      <MagazineDay day={day} media={media} isLast={isLast} dragHandle={handle} />
    </div>
  )
}
