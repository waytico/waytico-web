/**
 * Magazine — Itinerary section.
 *
 * Stacked sequence of MagazineDay sections, each separated by a hairline
 * (the hairline lives inside MagazineDay's top edge so the cadence stays
 * even). Sources its day list from data.project.itinerary and per-day
 * photos from data.media.
 *
 * Empty state: if itinerary is empty → component returns null. The
 * section's eyebrow / framing is part of MagazineDay (each day is its
 * own section in the source).
 */
import type { ThemePropsV2 } from '@/types/theme-v2'
import { MagazineDay } from './day'

export function Itinerary({ data }: ThemePropsV2) {
  const days = data.project.itinerary ?? []
  if (days.length === 0) return null

  return (
    <>
      {days.map((day, i) => (
        <MagazineDay
          key={day.id}
          day={day}
          media={data.media}
          isLast={i === days.length - 1}
        />
      ))}
    </>
  )
}
