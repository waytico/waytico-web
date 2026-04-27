import type { ReactNode } from 'react'
import type { ThemeId } from '@/lib/themes'
import { HERO_STYLE } from '@/lib/themes'

/**
 * Hero — single component, three theme variants, each modelled on the
 * original TZ-5 mockups (Journal / Expedition / Atelier). Shape:
 *
 *   editorial  → split  : full-bleed photo + bottom-left title + horizontal
 *                          5-stat rule (Dates / Duration / Region / Group / From).
 *                          activity_type as ◆ eyebrow over the title.
 *   expedition → overlay: dark full-bleed photo + ochre activity ticker over
 *                          the title + region eyebrow + 4-stat row at bottom
 *                          (DEPARTURE / DURATION / GROUP / FROM).
 *   compact    → card   : two-column grid — title left (with activity eyebrow,
 *                          description lede, badge pills, large display price),
 *                          photo right.
 *
 * Each scalar arrives as its own slot so owner mode wraps with EditableField
 * and public mode passes a formatted string. When a slot is null/empty its
 * row/pill/eyebrow is hidden (public mode w/ no data).
 */

type HeroProps = {
  theme: ThemeId
  heroPhoto: string | null
  /** Owner-only chrome (delete button, drag indicator, empty-state CTA). */
  ownerOverlay?: ReactNode

  // Slots — one per editable scalar.
  titleSlot: ReactNode
  activityTypeSlot?: ReactNode
  /** Plain description first paragraph; null hides it in public mode. */
  descriptionLedeSlot?: ReactNode

  // Stat scalars — split into separate slots so each cell is independently
  // editable. Public mode passes pre-formatted strings.
  dateRangeSlot?: ReactNode
  durationSlot?: ReactNode
  groupSizeSlot?: ReactNode
  pricePerTravelerSlot?: ReactNode
  regionSlot?: ReactNode
  countrySlot?: ReactNode
}

export function TripHero(props: HeroProps) {
  const { theme } = props
  const heroStyle = HERO_STYLE[theme]
  if (heroStyle === 'overlay') return <CinematicHero {...props} />
  if (heroStyle === 'card') return <CleanHero {...props} />
  return <ClassicHero {...props} />
}

// ─────────────────────────────────────────────────────────────────────
// Editorial (Classic) — full-bleed photo + bottom-left title + 5-stat rule
// ─────────────────────────────────────────────────────────────────────

function ClassicHero({
  heroPhoto,
  ownerOverlay,
  titleSlot,
  activityTypeSlot,
  dateRangeSlot,
  durationSlot,
  regionSlot,
  countrySlot,
  groupSizeSlot,
  pricePerTravelerSlot,
}: HeroProps) {
  const stats = [
    dateRangeSlot && { k: 'Dates', v: dateRangeSlot },
    durationSlot && { k: 'Duration', v: durationSlot },
    (regionSlot || countrySlot) && {
      k: 'Region',
      v: (
        <RegionLine regionSlot={regionSlot} countrySlot={countrySlot} />
      ),
    },
    groupSizeSlot && { k: 'Group', v: groupSizeSlot },
    pricePerTravelerSlot && { k: 'From', v: pricePerTravelerSlot, accent: true },
  ].filter(Boolean) as Array<{ k: string; v: ReactNode; accent?: boolean }>

  return (
    <header className="tp-hero--classic">
      <div
        className="tp-hero-bg"
        style={heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined}
      />
      <div className="tp-hero-bg-grad" aria-hidden="true" />
      {ownerOverlay}
      <div className="tp-container tp-hero--classic-inner">
        {activityTypeSlot && (
          <div className="tp-hero-eyebrow">
            <span className="tp-hero-diamond">◆</span>
            <span>{activityTypeSlot}</span>
          </div>
        )}
        <h1 className="tp-display tp-hero-title">{titleSlot}</h1>
        {stats.length > 0 && (
          <div className="tp-hero-statrule">
            {stats.map((s, i) => (
              <div key={i} className={`tp-hero-stat${s.accent ? ' is-accent' : ''}`}>
                <div className="k">{s.k}</div>
                <div className="v">{s.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}

function RegionLine({
  regionSlot,
  countrySlot,
}: {
  regionSlot?: ReactNode
  countrySlot?: ReactNode
}) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'baseline', flexWrap: 'wrap' }}>
      {regionSlot}
      {regionSlot && countrySlot && <span style={{ opacity: 0.6 }}>,</span>}
      {countrySlot}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Cinematic (overlay) — dark photo + ticker + uppercase title + 4 stats
// ─────────────────────────────────────────────────────────────────────

function CinematicHero({
  heroPhoto,
  ownerOverlay,
  titleSlot,
  activityTypeSlot,
  descriptionLedeSlot,
  dateRangeSlot,
  durationSlot,
  groupSizeSlot,
  pricePerTravelerSlot,
  regionSlot,
  countrySlot,
}: HeroProps) {
  const hasRegion = regionSlot || countrySlot

  return (
    <header className="tp-hero--cinematic">
      {heroPhoto ? (
        <div
          className="tp-hero-bg"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(10,8,6,0.5) 0%, rgba(10,8,6,0.2) 40%, rgba(10,8,6,0.9) 100%), url(${heroPhoto})`,
          }}
        />
      ) : (
        <div className="tp-hero-bg tp-hero-bg-empty" aria-hidden="true" />
      )}
      {ownerOverlay}

      <div className="tp-container tp-hero--cinematic-inner">
        {activityTypeSlot && (
          <div className="tp-hero-ticker" aria-hidden="false">
            <span className="line" />
            <span className="text">◆ {activityTypeSlot} ◆</span>
            <span className="line" />
          </div>
        )}
        <div className="tp-hero-spacer" />
        <div className="tp-hero--cinematic-bottom">
          {hasRegion && (
            <div className="tp-hero-coords">
              <RegionLine regionSlot={regionSlot} countrySlot={countrySlot} />
            </div>
          )}
          <h1 className="tp-display tp-hero-title">{titleSlot}</h1>
          <div className="tp-hero--cinematic-row">
            {descriptionLedeSlot && (
              <p className="tp-hero-lede">{descriptionLedeSlot}</p>
            )}
            <div className="tp-hero-statrow">
              {dateRangeSlot && (
                <CinematicStat label="DEPARTURE" value={dateRangeSlot} />
              )}
              {durationSlot && <CinematicStat label="DURATION" value={durationSlot} />}
              {groupSizeSlot && <CinematicStat label="GROUP" value={groupSizeSlot} />}
              {pricePerTravelerSlot && (
                <CinematicStat label="FROM" value={pricePerTravelerSlot} accent />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function CinematicStat({
  label,
  value,
  accent,
}: {
  label: string
  value: ReactNode
  accent?: boolean
}) {
  return (
    <div className={`tp-hero-cstat${accent ? ' is-accent' : ''}`}>
      <div className="l">{label}</div>
      <div className="v">{value}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Compact (Clean) — two-column grid: title-left, photo-right
// ─────────────────────────────────────────────────────────────────────

function CleanHero({
  heroPhoto,
  ownerOverlay,
  titleSlot,
  activityTypeSlot,
  descriptionLedeSlot,
  dateRangeSlot,
  durationSlot,
  groupSizeSlot,
  pricePerTravelerSlot,
  regionSlot,
  countrySlot,
}: HeroProps) {
  const pills: ReactNode[] = []
  if (regionSlot || countrySlot) {
    pills.push(
      <span key="region" className="tp-hero-pill">
        📍 <RegionLine regionSlot={regionSlot} countrySlot={countrySlot} />
      </span>,
    )
  }
  if (dateRangeSlot) {
    pills.push(
      <span key="dates" className="tp-hero-pill is-accent">
        ✦ {dateRangeSlot}
      </span>,
    )
  }
  if (durationSlot) {
    pills.push(
      <span key="dur" className="tp-hero-pill is-soft">
        {durationSlot}
      </span>,
    )
  }
  if (groupSizeSlot) {
    pills.push(
      <span key="grp" className="tp-hero-pill">
        {groupSizeSlot}
      </span>,
    )
  }

  return (
    <header className="tp-container tp-hero--clean">
      <div className="tp-hero--clean-left">
        {activityTypeSlot && (
          <div className="tp-hero-eyebrow">{activityTypeSlot}</div>
        )}
        <h1 className="tp-display tp-hero-title">{titleSlot}</h1>
        {descriptionLedeSlot && (
          <p className="tp-hero-lede">{descriptionLedeSlot}</p>
        )}
        {pills.length > 0 && <div className="tp-hero-pills">{pills}</div>}
        {pricePerTravelerSlot && (
          <div className="tp-hero-bigprice">{pricePerTravelerSlot}</div>
        )}
      </div>
      <div
        className="tp-hero--clean-photo"
        style={heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined}
      >
        {ownerOverlay}
      </div>
    </header>
  )
}
