/**
 * Magazine — single Day component.
 *
 * Source: magazine-trip.jsx lines 190–223. Hairline + accent eyebrow
 * (DAY 01 — PLACE) + h2 title + full-bleed 16:9 photo + paragraphs.
 *
 * Adaptations:
 *   - Eyebrow: "DAY {NN}" + optional date (e.g. "DAY 01 · 28 APR"). The
 *     source's "PLACE" slot has no DB equivalent — we drop it.
 *   - Photo: first visible-to-client photo from data.media filtered by
 *     day_id matching this day. If none — section omits the <img>
 *     entirely (per MAGAZINE-SPEC §K).
 *   - Paragraphs: split day.description on blank lines.
 */
import type { Day, MediaLite } from '@/types/theme-v2'
import { fmtDate } from '@/lib/trip-format'
import { CREAM, body, display, eyebrow, Hairline, ACCENT } from './styles'

type Props = {
  day: Day
  media: MediaLite[]
  isLast: boolean
}

export function MagazineDay({ day, media, isLast }: Props) {
  const num = String(day.dayNumber).padStart(2, '0')
  const dayDate = fmtDate(day.date ?? null)
  const eyebrowText = dayDate ? `DAY ${num} · ${dayDate.toUpperCase()}` : `DAY ${num}`

  const photo = media
    .filter((m) => m.day_id === day.id)
    .filter((m) => (m.type ?? 'photo') === 'photo')
    .filter((m) => m.visible_to_client !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]

  const paragraphs = (day.description || '')
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <section style={{ background: CREAM, padding: isLast ? '0 0 64px' : '0 0 48px' }}>
      <Hairline />
      <div style={{ padding: '40px 24px 24px' }}>
        <div style={{ ...eyebrow, color: ACCENT, marginBottom: 18 }}>
          {eyebrowText}
        </div>
        {day.title && (
          <h2 style={{ ...display, fontSize: 24, lineHeight: 1.2, margin: 0, maxWidth: 300 }}>
            {day.title}
          </h2>
        )}
      </div>

      {photo?.url && (
        <img
          src={photo.url}
          alt={day.title ?? `Day ${num}`}
          style={{
            width: '100%', aspectRatio: '16 / 9', objectFit: 'cover',
            display: 'block', borderRadius: 0,
          }}
        />
      )}

      {paragraphs.length > 0 && (
        <div style={{ padding: '28px 24px 0' }}>
          {paragraphs.map((p, i) => (
            <p
              key={i}
              style={{
                ...body,
                margin: 0,
                marginBottom: i === paragraphs.length - 1 ? 0 : 16,
              }}
            >
              {p}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}
