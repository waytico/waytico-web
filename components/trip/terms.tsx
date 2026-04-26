import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import { fmtDate } from '@/lib/trip-format'

type TermsProps = {
  /** Slot for the terms body — owner: EditableField, public: paragraph(s). */
  bodySlot: ReactNode
  /** Today's ISO date — used for "Proposal · {today}" footer. */
  proposalISO: string
  /** Today + 7 days ISO — used for "Valid until {date}" footer. */
  validUntilISO: string
  /** True when terms text exists OR owner mode wants the placeholder shown. */
  visible: boolean
}

/**
 * Terms — shared structure across all themes (TZ-6 §6.7).
 * Multi-paragraph terms body + colophon footer.
 */
export function TripTerms({ bodySlot, proposalISO, validUntilISO, visible }: TermsProps) {
  if (!visible) return null
  return (
    <footer className="tp-terms" id="terms">
      <div className="tp-container">
        <header className="tp-section-head" style={{ marginBottom: 24 }}>
          <h2 className="tp-display" style={{ fontSize: 28 }}>
            {UI.sectionLabels.terms}
          </h2>
        </header>
        <div className="tp-terms-body">{bodySlot}</div>
        <div className="tp-foot">
          <span>Waytico · waytico.com</span>
          <span>
            {`${UI.proposal} · ${fmtDate(proposalISO)}`} · {UI.validUntil} {fmtDate(validUntilISO)}
          </span>
        </div>
      </div>
    </footer>
  )
}
