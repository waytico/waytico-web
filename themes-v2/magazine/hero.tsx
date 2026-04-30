/**
 * Magazine — Hero section.
 *
 * Source: magazine-trip.jsx lines 60–163. Full-bleed photo, height 100vh
 * with min 640. Two narrow strips at the top (brand / trip-id, then
 * issued/valid dates), one headline group bottom-left.
 *
 * Differences from source:
 *   - Photo from data.project.cover_image_url (BLACK background as fallback).
 *   - Brand name from data.owner?.brand_name; falls back to '—'.
 *   - Trip ref from project.id short hash (left-pads to "№ XXX / XX" form
 *     so the strip never collapses on slim slugs).
 *   - Eyebrow above headline composed from country/region + duration.
 *   - Title rendered as plain string; tagline rendered italic on a new line
 *     under the title (this replaces the source's hand-coded
 *     `Portugal in <em>three movements</em>` content pattern — content
 *     model decision per MAGAZINE-SPEC §J.3).
 *   - Region list under the title from project.region (single string in DB).
 *
 * NO stat tiles, NO CTA — that's the whole point of this hero (anti-
 * patterns enumerated in MAGAZINE-SPEC §C).
 */
import type { ThemePropsV2 } from '@/types/theme-v2'
import { fmtDate } from '@/lib/trip-format'
import { CREAM, BLACK, eyebrow, display, TWEAKS } from './styles'

export function Hero({ data }: ThemePropsV2) {
  const p = data.project
  const top = TWEAKS.safeAreaTop

  const brandName = data.owner?.brand_name?.trim() || ''
  const tripRef = `№ ${p.id.replace(/-/g, '').slice(0, 4).toUpperCase()}`

  const issuedDate = fmtDate(p.proposal_date ?? null)
  const validDate = fmtDate(p.valid_until ?? null)
  const dateStrip = issuedDate && validDate
    ? `ISSUED ${issuedDate.toUpperCase()} — VALID UNTIL ${validDate.toUpperCase()}`
    : null

  const country = p.country?.trim() || null
  const durationLabel = p.duration_days ? `${p.duration_days} DAYS` : null
  const eyebrowTop = [country?.toUpperCase(), durationLabel].filter(Boolean).join(' — ') || null

  const region = p.region?.trim() || null

  return (
    <section
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        minHeight: 640,
        overflow: 'hidden',
        background: BLACK,
      }}
    >
      {p.cover_image_url ? (
        <img
          src={p.cover_image_url}
          alt={p.title ?? ''}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            filter: 'brightness(0.86) contrast(1.02)',
          }}
        />
      ) : null}

      {/* Gradient veil — for headline legibility at the bottom */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(26,24,23,0.55) 0%, rgba(26,24,23,0) 22%, rgba(26,24,23,0) 55%, rgba(26,24,23,0.78) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Header scrim — protects status-bar area on iOS */}
      {TWEAKS.headerScrim && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: top + 60,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0))',
          pointerEvents: 'none',
        }} />
      )}

      {/* Top meta strip — brand left, trip ref right */}
      <div style={{
        position: 'absolute', top, left: 0, right: 0,
        padding: '20px 38px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: CREAM,
      }}>
        <div style={{ ...eyebrow, color: CREAM, fontSize: 10, opacity: 0.9 }}>
          {brandName ? brandName.toUpperCase() : '\u00A0'}
        </div>
        <div style={{ ...eyebrow, color: CREAM, fontSize: 10, opacity: 0.9 }}>
          {tripRef}
        </div>
      </div>

      {/* ISSUED / VALID UNTIL strip */}
      {dateStrip && (
        <div style={{
          position: 'absolute', top: top + 50, left: 38, right: 38,
          display: 'flex', alignItems: 'center', gap: 10,
          paddingTop: 12, borderTop: '1px solid rgba(245,240,230,0.32)',
        }}>
          <div style={{
            ...eyebrow, color: CREAM, fontSize: 9, opacity: 0.85,
            letterSpacing: '0.16em', whiteSpace: 'nowrap',
          }}>
            {dateStrip}
          </div>
        </div>
      )}

      {/* Headline — bottom-left */}
      <div style={{
        position: 'absolute', left: 22, right: 22, bottom: 56,
        color: CREAM,
      }}>
        {eyebrowTop && (
          <div style={{ ...eyebrow, color: CREAM, fontSize: 10, opacity: 0.92, marginBottom: 14 }}>
            {eyebrowTop}
          </div>
        )}
        <h1 style={{
          ...display,
          color: CREAM,
          fontSize: TWEAKS.heroHeadlineSize,
          lineHeight: 1.05,
          margin: 0,
          maxWidth: 320,
        }}>
          {p.title || '\u00A0'}
          {p.tagline && (
            <em style={{ display: 'block', fontStyle: 'italic', fontWeight: 500, marginTop: 4 }}>
              {p.tagline}
            </em>
          )}
        </h1>
        {region && (
          <div style={{ marginTop: 22, display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div style={{ ...eyebrow, color: CREAM, fontSize: 10, opacity: 0.85 }}>
              {region.toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Scroll cue */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        ...eyebrow, color: CREAM, fontSize: 9, opacity: 0.6,
      }}>
        ↓ SCROLL
      </div>
    </section>
  )
}
