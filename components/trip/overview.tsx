import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'

type OverviewProps = {
  /** Pre-formatted "Jun 18–21, 2026" or null. */
  dateRange: string | null
  durationDays: number | null
  groupSize: number | null
  activityType: string | null
  region: string | null
  country: string | null
  /** Description body — owner mode passes EditableField, public passes paragraphs. */
  bodySlot: ReactNode
  /** True when at least bodySlot or owner-edit affordances should render. */
  visible: boolean
}

/**
 * Overview — shared structure across all themes (TZ-6 §6.3).
 * Two-column: left rail with key/value meta, right column body.
 */
export function TripOverview({
  dateRange,
  durationDays,
  groupSize,
  activityType,
  region,
  country,
  bodySlot,
  visible,
}: OverviewProps) {
  if (!visible) return null
  return (
    <section className="tp-section" id="overview">
      <div className="tp-container">
        <header className="tp-section-head">
          <h2 className="tp-display tp-section-title">{UI.sectionLabels.overview}</h2>
          <span className="tp-section-num">01</span>
        </header>
        <div className="tp-overview-grid">
          <aside className="tp-overview-meta">
            {dateRange && (
              <Row k="Dates" v={dateRange} />
            )}
            {durationDays != null && (
              <Row k="Duration" v={`${durationDays} ${UI.days}`} />
            )}
            {groupSize != null && (
              <Row k="Group" v={`${groupSize} ${UI.travelers}`} />
            )}
            {activityType && <Row k="Type" v={activityType} />}
            {region && <Row k="Region" v={region} />}
            {country && <Row k="Country" v={country} />}
          </aside>
          <div className="tp-overview-body">{bodySlot}</div>
        </div>
      </div>
    </section>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="tp-meta-row">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  )
}
