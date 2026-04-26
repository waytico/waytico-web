import type { ReactNode } from 'react'
import type { ThemeId } from '@/lib/themes'
import { HERO_STYLE } from '@/lib/themes'

type HeroProps = {
  theme: ThemeId
  /** URL of the hero photo, or null for empty / placeholder. */
  heroPhoto: string | null
  /** Title — owner mode passes EditableField, public passes a string. */
  titleSlot: ReactNode
  /** Owner-only chrome injected over the photo (drag indicator, delete button,
   *  empty-state upload CTA). */
  ownerOverlay?: ReactNode
  /** Meta-table slots — owner mode wraps each scalar with EditableField,
   *  public mode passes plain strings. Each slot renders its own value cell;
   *  when a slot is null/undefined, the row is skipped (public mode w/ no data). */
  dateRangeSlot?: ReactNode
  durationSlot?: ReactNode
  groupSizeSlot?: ReactNode
  pricePerTravelerSlot?: ReactNode
  activityTypeSlot?: ReactNode
  regionSlot?: ReactNode
  countrySlot?: ReactNode
}

/**
 * Hero — single component, three structural variants per TZ-6 §6.2:
 *   editorial  → split   (title + meta-table left, photo right)
 *   expedition → overlay (full-bleed photo, title + meta-table overlaid)
 *   compact    → card    (title left, meta-sidecard right, photo full-width below)
 *
 * The meta-table renders dates/duration/group/price/type/region/country as
 * key-value rows. Owner mode slots wrap values in EditableField so every
 * field is inline-editable. Overview block below is now description-only —
 * no metadata duplication.
 */
export function TripHero(props: HeroProps) {
  const { theme, heroPhoto, titleSlot, ownerOverlay } = props
  const heroStyle = HERO_STYLE[theme]

  const metaTable = <HeroMetaTable {...props} />

  if (heroStyle === 'overlay') {
    return (
      <header className="tp-hero--overlay">
        <div
          className="tp-hero-bg"
          style={heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined}
        />
        <div className="tp-container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="tp-hero-meta">
            <h1 className="tp-display tp-hero-title">{titleSlot}</h1>
            {metaTable}
          </div>
        </div>
        {ownerOverlay}
      </header>
    )
  }

  if (heroStyle === 'card') {
    return (
      <header>
        <div className="tp-container tp-hero--card">
          <div className="tp-hero-meta">
            <h1 className="tp-display tp-hero-title">{titleSlot}</h1>
          </div>
          <aside className="tp-hero-card-side">{metaTable}</aside>
          <div
            className="tp-hero-photo"
            style={heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined}
          >
            {ownerOverlay}
          </div>
        </div>
      </header>
    )
  }

  // split — editorial (default)
  return (
    <header>
      <div className="tp-container tp-hero--split">
        <div className="tp-hero-meta">
          <h1 className="tp-display tp-hero-title">{titleSlot}</h1>
          {metaTable}
        </div>
        <div
          className="tp-hero-image"
          style={heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined}
        >
          {ownerOverlay}
        </div>
      </div>
    </header>
  )
}

/** Vertical key-value list. Skips rows whose slot is null/undefined. */
function HeroMetaTable(props: HeroProps) {
  const rows: Array<[string, ReactNode]> = [
    ['Dates', props.dateRangeSlot],
    ['Duration', props.durationSlot],
    ['Group', props.groupSizeSlot],
    ['Per traveler', props.pricePerTravelerSlot],
    ['Type', props.activityTypeSlot],
    ['Region', props.regionSlot],
    ['Country', props.countrySlot],
  ]
  const visible = rows.filter(([, v]) => v !== null && v !== undefined && v !== '')
  if (visible.length === 0) return null
  return (
    <div className="tp-hero-meta-table">
      {visible.map(([k, v]) => (
        <div className="tp-hero-meta-row" key={k}>
          <span className="k">{k}</span>
          <span className="v">{v}</span>
        </div>
      ))}
    </div>
  )
}
