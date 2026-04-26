import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'

type OverviewProps = {
  /** Description body — owner mode passes EditableField, public passes paragraphs. */
  bodySlot: ReactNode
  /** True when at least bodySlot or owner-edit affordances should render. */
  visible: boolean
}

/**
 * Overview — description block (text only). All trip metadata
 * (dates/duration/group/price/type/region/country) lives in the Hero
 * meta-table. Single source of truth, no duplication.
 *
 * Layout: full-width prose under the section heading.
 */
export function TripOverview({ bodySlot, visible }: OverviewProps) {
  if (!visible) return null
  return (
    <section className="tp-section" id="overview">
      <div className="tp-container">
        <header className="tp-section-head">
          <h2 className="tp-display tp-section-title">{UI.sectionLabels.overview}</h2>
          <span className="tp-section-num">01</span>
        </header>
        <div className="tp-overview-body">{bodySlot}</div>
      </div>
    </section>
  )
}
