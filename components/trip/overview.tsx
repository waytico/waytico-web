import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'

type OverviewProps = {
  /** Description body — owner mode passes EditableField, public passes paragraphs. */
  bodySlot: ReactNode
  /** True when bodySlot has content (or owner mode wants the placeholder). */
  visible: boolean
}

/**
 * Overview — single-column prose. Meta-rail (Duration / Group / Type / Region /
 * Country) was removed during the quote simplification — those facts live in
 * the Hero stat tiles instead, so duplicating them here was noise.
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
