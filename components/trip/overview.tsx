import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import type { ThemeId } from '@/lib/themes'
import { fmtDateRange } from '@/lib/trip-format'

type OverviewProps = {
  /** Description body — owner mode passes EditableField, public passes paragraphs. */
  bodySlot: ReactNode
  /** True when bodySlot has content (or owner mode wants the placeholder). */
  visible: boolean

  /* ── Magazine-only fields. All optional and ignored by the
   *    editorial / expedition / compact branches. ───────────────── */

  /** Active theme. When 'magazine' the component switches to the
   *  asymmetric layout + stat-tiles row. Other values render the
   *  legacy editorial layout. */
  theme?: ThemeId

  /** Stat tile inputs — same source-of-truth that the Hero used in the
   *  editorial layouts. In Magazine they migrate from the hero into the
   *  Overview block (TZ pass-A decision #9). */
  datesStart?: string | null
  datesEnd?: string | null
  durationDays?: number | null
  groupSize?: number | null
  /** Mode-aware pre-formatted price (per_traveler / for the group / custom).
   *  Same string the Price block headline reads from. */
  priceFormatted?: string | null
  priceLabel?: string | null

  /** Meta-rail inputs — eyebrow stack in the left column. */
  country?: string | null
  region?: string | null
  activityType?: string | null
  language?: string | null

  /** Owner-mode slot overrides for the stat tiles. Same slots that the
   *  editorial heroes consume — passing them here lets Magazine inherit
   *  the editable affordances without duplicating EditableField wiring. */
  dateStatSlot?: ReactNode
  durationStatSlot?: ReactNode
  groupStatSlot?: ReactNode
  priceStatSlot?: ReactNode

  /** True when the viewer is the owner (drives placeholders + edit chrome). */
  showOwnerUI?: boolean

  /** Magazine-only narrative subtitle rendered under the eyebrow. Public
   *  mode passes plain text or null; owner mode passes EditableField.
   *  Replaces the static "Overview" heading on Magazine — eyebrow plus
   *  subtitle carry the section identity, no need for a second label. */
  subtitleSlot?: ReactNode
}

/**
 * Overview — single-column prose. Meta-rail (Duration / Group / Type / Region /
 * Country) was removed during the quote simplification — those facts live in
 * the Hero stat tiles instead, so duplicating them here was noise.
 *
 * Magazine variant (theme === 'magazine') turns this back into a richer
 * block: asymmetric two-column grid on desktop with an eyebrow stack on the
 * left and prose on the right, plus a four-tile stats row at the bottom
 * (DATES / DURATION / GROUP / FROM). DURATION and FROM remain read-only
 * even in owner mode and click-scroll to #itinerary / #price respectively.
 */
export function TripOverview(props: OverviewProps) {
  const { theme, visible, bodySlot } = props

  if (theme === 'magazine') {
    return <OverviewMagazine {...props} />
  }

  if (!visible) return null
  return (
    <section className="tp-section" id="overview">
      <div className="tp-container">
        <header className="tp-section-head">
          <h2 className="tp-display tp-section-title">{UI.sectionLabels.overview}</h2>
        </header>
        <div className="tp-overview-body">{bodySlot}</div>
      </div>
    </section>
  )
}

/* ── Magazine variant ─────────────────────────────────────────────── */

function OverviewMagazine(props: OverviewProps) {
  const {
    bodySlot,
    visible,
    datesStart,
    datesEnd,
    durationDays,
    groupSize,
    country,
    region,
    activityType,
    priceFormatted,
    priceLabel,
    dateStatSlot,
    durationStatSlot,
    groupStatSlot,
    priceStatSlot,
    showOwnerUI,
    subtitleSlot,
  } = props

  // Magazine overview keeps its section visible whenever there's
  // anything to show — description prose, any stat, or owner-mode
  // placeholders. The upstream `visible` flag (description-driven)
  // becomes one input among several rather than the gate.
  const hasAnyStat =
    !!(
      datesStart ||
      datesEnd ||
      durationDays != null ||
      groupSize != null ||
      priceFormatted ||
      dateStatSlot ||
      durationStatSlot ||
      groupStatSlot ||
      priceStatSlot
    )
  const shouldRender = !!(showOwnerUI || visible || hasAnyStat)
  if (!shouldRender) return null

  const dateRange = fmtDateRange(datesStart, datesEnd)

  return (
    <section className="tp-mag-section tp-mag-overview" id="overview">
      <div className="tp-mag-container">
        <div className="tp-mag-overview__grid">
          <div className="tp-mag-overview__left">
            <p className="tp-mag-eyebrow tp-mag-overview__eyebrow">
              I — {UI.sectionLabels.overview.toUpperCase()}
            </p>
            {subtitleSlot && (
              <h2 className="tp-mag-display tp-mag-section-subtitle">
                {subtitleSlot}
              </h2>
            )}
          </div>
          <div className="tp-mag-overview__right">
            <div className="tp-mag-overview__prose">{bodySlot}</div>
          </div>
        </div>

        <StatTilesRow
          showOwnerUI={!!showOwnerUI}
          dateRange={dateRange}
          dateStatSlot={dateStatSlot}
          durationDays={durationDays ?? null}
          durationStatSlot={durationStatSlot}
          groupSize={groupSize ?? null}
          groupStatSlot={groupStatSlot}
          priceFormatted={priceFormatted ?? null}
          priceLabel={priceLabel ?? null}
          priceStatSlot={priceStatSlot}
        />
      </div>
    </section>
  )
}

/* ── Stat tiles row ───────────────────────────────────────────────── */

function StatTilesRow(props: {
  showOwnerUI: boolean
  dateRange: string | null
  dateStatSlot?: ReactNode
  durationDays: number | null
  durationStatSlot?: ReactNode
  groupSize: number | null
  groupStatSlot?: ReactNode
  priceFormatted: string | null
  priceLabel: string | null
  priceStatSlot?: ReactNode
}) {
  const {
    showOwnerUI,
    dateRange,
    dateStatSlot,
    durationDays,
    durationStatSlot,
    groupSize,
    groupStatSlot,
    priceFormatted,
    priceLabel,
    priceStatSlot,
  } = props

  const tiles: ReactNode[] = []

  /* DATES — editable through dateStatSlot in owner mode (fallback to
     formatted range string). Hides if both are missing and not owner. */
  {
    const value = dateStatSlot ?? dateRange
    if (value || showOwnerUI) {
      tiles.push(
        <div className="tp-mag-stat-tile" key="dates">
          <span className="tp-mag-stat-tile__label">DATES</span>
          <span className="tp-mag-stat-tile__value">
            {value ?? <span className="tp-mag-stat-tile__placeholder">Add dates</span>}
          </span>
        </div>,
      )
    }
  }

  /* DURATION — read-only EVEN in owner mode (TZ pass-A decision #9 / L-048).
     Owner-mode slot already wraps the value in an <a href="#itinerary"> with
     smooth-scroll; public mode wraps it here instead. Avoid nesting <a>. */
  {
    const value = durationStatSlot ?? (durationDays != null ? `${durationDays} ${UI.days}` : null)
    if (value) {
      if (durationStatSlot) {
        // Owner — slot already provides the link affordance.
        tiles.push(
          <div
            className="tp-mag-stat-tile tp-mag-stat-tile--clickable"
            key="duration"
            title="Open itinerary"
          >
            <span className="tp-mag-stat-tile__label">DURATION</span>
            <span className="tp-mag-stat-tile__value">
              {value}
              <span className="tp-mag-stat-tile__hint" aria-hidden="true">↓</span>
            </span>
          </div>,
        )
      } else {
        // Public — wrap our own <a> for smooth-scroll to #itinerary.
        tiles.push(
          <a
            className="tp-mag-stat-tile tp-mag-stat-tile--clickable"
            key="duration"
            href="#itinerary"
            title="Open itinerary"
            onClick={(e) => {
              e.preventDefault()
              if (typeof document === 'undefined') return
              document
                .getElementById('itinerary')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            <span className="tp-mag-stat-tile__label">DURATION</span>
            <span className="tp-mag-stat-tile__value">
              {value}
              <span className="tp-mag-stat-tile__hint" aria-hidden="true">↓</span>
            </span>
          </a>,
        )
      }
    }
  }

  /* GROUP — editable through groupStatSlot in owner mode. */
  {
    const value = groupStatSlot ?? (groupSize != null ? `${groupSize} ${UI.travelers}` : null)
    if (value) {
      tiles.push(
        <div className="tp-mag-stat-tile" key="group">
          <span className="tp-mag-stat-tile__label">GROUP</span>
          <span className="tp-mag-stat-tile__value">{value}</span>
        </div>,
      )
    }
  }

  /* FROM-price — read-only EVEN in owner mode (TZ pass-A decision #9 / L-050).
     Owner-mode slot already wraps in <a href="#price">; in pass A the
     #price target is the existing shared TripPrice section, so smooth-
     scroll lands on it correctly. Public mode wraps its own anchor. */
  {
    const slotValue = priceStatSlot
    const stringValue = priceFormatted
    if (slotValue) {
      tiles.push(
        <div
          className="tp-mag-stat-tile tp-mag-stat-tile--clickable"
          key="price"
          title="Open price section"
        >
          <span className="tp-mag-stat-tile__label">FROM</span>
          <span className="tp-mag-stat-tile__value">
            {slotValue}
            <span className="tp-mag-stat-tile__hint" aria-hidden="true">↓</span>
          </span>
          {priceLabel && <span className="tp-mag-stat-tile__sub">{priceLabel}</span>}
        </div>,
      )
    } else if (stringValue) {
      tiles.push(
        <a
          className="tp-mag-stat-tile tp-mag-stat-tile--clickable"
          key="price"
          href="#price"
          title="Open price section"
          onClick={(e) => {
            e.preventDefault()
            if (typeof document === 'undefined') return
            document
              .getElementById('price')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          <span className="tp-mag-stat-tile__label">FROM</span>
          <span className="tp-mag-stat-tile__value">
            {stringValue}
            <span className="tp-mag-stat-tile__hint" aria-hidden="true">↓</span>
          </span>
          {priceLabel && <span className="tp-mag-stat-tile__sub">{priceLabel}</span>}
        </a>,
      )
    } else if (showOwnerUI) {
      // Owner placeholder — empty FROM tile with a click affordance to
      // the Price section where the actual editor lives.
      tiles.push(
        <a
          className="tp-mag-stat-tile tp-mag-stat-tile--clickable"
          key="price"
          href="#price"
          title="Open price section"
          onClick={(e) => {
            e.preventDefault()
            if (typeof document === 'undefined') return
            document
              .getElementById('price')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          <span className="tp-mag-stat-tile__label">FROM</span>
          <span className="tp-mag-stat-tile__value">
            <span className="tp-mag-stat-tile__placeholder">Add price</span>
            <span className="tp-mag-stat-tile__hint" aria-hidden="true">↓</span>
          </span>
        </a>,
      )
    }
  }

  if (tiles.length === 0) return null
  return <div className="tp-mag-stat-tiles">{tiles}</div>
}

