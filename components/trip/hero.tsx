import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import type { ThemeId } from '@/lib/themes'
import { HERO_STYLE } from '@/lib/themes'

type HeroProps = {
  theme: ThemeId
  /** URL of the hero photo, or null for empty / placeholder. */
  heroPhoto: string | null
  /** Status pill — only renders for quoted / active / completed (per TZ-6 §6.2). */
  status: string | null | undefined
  /** Pre-formatted "Jun 18–21, 2026" (or null). */
  dateRange: string | null
  /** Pre-formatted price including currency glyph (or null). */
  pricePerPersonFormatted: string | null
  /** Plain numbers for non-editable cases. */
  durationDays: number | null
  groupSize: number | null
  /** Slots — owner mode fills with EditableField nodes; public mode with strings. */
  activityChipSlot?: ReactNode
  regionEyebrowSlot?: ReactNode
  titleSlot: ReactNode
  /** First paragraph of the description. */
  descriptionSlot?: ReactNode
  /** Individual stat overrides. If a slot is undefined, the formatted scalar
   *  above is used. If null, the stat hides (public mode w/ no data).
   *  Owner mode passes EditableField wrappers as slots.
   */
  dateStatSlot?: ReactNode
  durationStatSlot?: ReactNode
  groupStatSlot?: ReactNode
  priceStatSlot?: ReactNode
  /** Owner-only chrome injected into the hero (file inputs, drag indicators,
   *  delete-hero button, "Add hero photo" empty state). When present, the
   *  themed component still renders — we just paint the chrome on top. */
  ownerOverlay?: ReactNode
}

function StatusPill({ status }: { status: string | null | undefined }) {
  if (!status) return null
  if (!['quoted', 'active', 'completed'].includes(status)) return null
  return <span className="tp-status">{UI.status[status] || status}</span>
}

/**
 * Hero — single component, three structural variants per TZ-6 §6.2:
 *   editorial  → split   (image right, text left)
 *   expedition → overlay (full-bleed photo, text overlaid)
 *   compact    → card    (text + structured info card on the right, photo below)
 *
 * Variants live as `if (heroStyle === '...')` branches inside this file —
 * NOT separate files in `themes/<theme>/hero.tsx` (TZ-6 §2.1).
 *
 * The component does not know about auth or mutations. Owner-mode
 * editable surfaces and chrome (delete-hero button, empty-state upload
 * CTA, drag indicator) are passed in via slot props.
 */
export function TripHero(props: HeroProps) {
  const { theme, heroPhoto, status, ownerOverlay } = props
  const heroStyle = HERO_STYLE[theme]

  // Shared meta block — same data, same labels, restyled per theme via tokens.
  const meta = (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {props.activityChipSlot}
        {props.regionEyebrowSlot}
        <StatusPill status={status} />
      </div>
      <h1 className="tp-display tp-hero-title">{props.titleSlot}</h1>
      {props.descriptionSlot && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 18, lineHeight: 1.6, maxWidth: '56ch' }}>
          {props.descriptionSlot}
        </p>
      )}
      <HeroStats {...props} />
    </>
  )

  if (heroStyle === 'overlay') {
    return (
      <header className="tp-hero--overlay">
        <div
          className="tp-hero-bg"
          style={heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined}
        />
        <div className="tp-container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="tp-hero-meta">{meta}</div>
        </div>
        {ownerOverlay}
      </header>
    )
  }

  if (heroStyle === 'card') {
    return (
      <header>
        <div className="tp-container tp-hero--card">
          <div className="tp-hero-meta" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {props.activityChipSlot}
              {props.regionEyebrowSlot}
              <StatusPill status={status} />
            </div>
            <h1 className="tp-display tp-hero-title">{props.titleSlot}</h1>
            {props.descriptionSlot && (
              <p style={{ color: 'var(--ink-soft)', fontSize: 17, lineHeight: 1.6, maxWidth: '56ch' }}>
                {props.descriptionSlot}
              </p>
            )}
          </div>
          <aside className="tp-hero-card-side">
            <CardSideStat label="Dates" valueSlot={props.dateStatSlot} fallback={props.dateRange} />
            <CardSideStat
              label="Duration"
              valueSlot={props.durationStatSlot}
              fallback={props.durationDays != null ? `${props.durationDays} ${UI.days}` : null}
            />
            <CardSideStat
              label="Group size"
              valueSlot={props.groupStatSlot}
              fallback={props.groupSize != null ? `${props.groupSize} ${UI.travelers}` : null}
            />
            <CardSideStat
              label={UI.perTraveler}
              valueSlot={props.priceStatSlot}
              fallback={props.pricePerPersonFormatted}
            />
          </aside>
          <div
            className="tp-hero-photo"
            style={heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined}
          />
        </div>
        {ownerOverlay}
      </header>
    )
  }

  // split — editorial (default)
  return (
    <header>
      <div className="tp-container tp-hero--split">
        <div className="tp-hero-meta">{meta}</div>
        <div
          className="tp-hero-image"
          style={heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined}
        />
      </div>
      {ownerOverlay}
    </header>
  )
}

function HeroStats(props: HeroProps) {
  // Hide the whole row if absolutely nothing is visible (public mode w/ no data).
  const stats: ReactNode[] = []
  const dateValue = props.dateStatSlot ?? props.dateRange
  if (dateValue) {
    stats.push(
      <div className="tp-hero-stat" key="date">
        <span className="v">{dateValue}</span>
        <span className="l">Dates</span>
      </div>,
    )
  }
  const durationValue =
    props.durationStatSlot ?? (props.durationDays != null ? props.durationDays : null)
  if (durationValue !== null && durationValue !== undefined) {
    stats.push(
      <div className="tp-hero-stat" key="duration">
        <span className="v">{durationValue}</span>
        <span className="l">{UI.days}</span>
      </div>,
    )
  }
  const groupValue = props.groupStatSlot ?? (props.groupSize != null ? props.groupSize : null)
  if (groupValue !== null && groupValue !== undefined) {
    stats.push(
      <div className="tp-hero-stat" key="group">
        <span className="v">{groupValue}</span>
        <span className="l">{UI.travelers}</span>
      </div>,
    )
  }
  const priceValue = props.priceStatSlot ?? props.pricePerPersonFormatted
  if (priceValue) {
    stats.push(
      <div className="tp-hero-stat" key="price">
        <span className="v">{priceValue}</span>
        <span className="l">{UI.perTraveler}</span>
      </div>,
    )
  }
  if (stats.length === 0) return null
  return <div className="tp-hero-stats">{stats}</div>
}

function CardSideStat({
  label,
  valueSlot,
  fallback,
}: {
  label: string
  valueSlot?: ReactNode
  fallback: string | number | null
}) {
  const value = valueSlot ?? fallback
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="tp-hero-stat">
      <span className="l">{label}</span>
      <span className="v">{value}</span>
    </div>
  )
}
