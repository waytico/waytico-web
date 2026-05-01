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

  // Reorder rollback parity with legacy itinerary.tsx 345-348:
  // optimistic local mutation → fire saveProjectPatch → if PATCH returns
  // false, revert to the snapshot we captured before the mutation. This
  // matters when the network drops mid-reorder; without rollback the
  // visible day order disagrees with what the backend saved.
  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = localDays.findIndex((d) => d.id === active.id)
    const newIdx = localDays.findIndex((d) => d.id === over.id)
    if (oldIdx < 0 || newIdx < 0) return
    const snapshot = localDays
    const reordered = arrayMove(localDays, oldIdx, newIdx).map((d, i) => ({
      ...d,
      dayNumber: i + 1,
      // Strip date — backend reconcileDates() will recompute from dates_start.
      date: null,
    }))
    setLocalDays(reordered)
    const ok = await ctx!.mutations.saveProjectPatch({ itinerary: reordered })
    if (ok === false) setLocalDays(snapshot)
  }

  if (localDays.length === 0) return null

  const language = data.project.language ?? 'en'
  const datesStart = data.project.dates_start ?? null

  if (!editable) {
    // Public mode: bypass dnd-kit entirely.
    return (
      <section id="itinerary">
        {localDays.map((day, i) => (
          <MagazineDay
            key={day.id}
            day={day}
            media={data.media}
            language={language}
            datesStart={datesStart}
            isLast={i === localDays.length - 1}
          />
        ))}
      </section>
    )
  }

  return (
    <section id="itinerary">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={localDays.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {localDays.map((day, i) => (
            <SortableDay
              key={day.id}
              day={day}
              media={data.media}
              language={language}
              datesStart={datesStart}
              isLast={i === localDays.length - 1}
            />
          ))}
        </SortableContext>
      </DndContext>
    </section>
  )
}

function SortableDay({
  day,
  media,
  language,
  datesStart,
  isLast,
}: {
  day: Day
  media: ThemePropsV2['data']['media']
  language: string
  datesStart: string | null
  isLast: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: day.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  const handle = (
    <span {...attributes} {...listeners} className="mag-inline-flex">
      <DayDragHandle />
    </span>
  )

  return (
    <div ref={setNodeRef} style={style}>
      <MagazineDay
        day={day}
        media={media}
        language={language}
        datesStart={datesStart}
        isLast={isLast}
        dragHandle={handle}
      />
    </div>
  )
}
