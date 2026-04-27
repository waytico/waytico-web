import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'

type TermsProps = {
  /** Slot for the terms body — owner: EditableField, public: paragraph(s). */
  bodySlot: ReactNode
  /** True when terms text exists OR owner mode wants the placeholder shown. */
  visible: boolean
}

/**
 * Terms — shared structure across all themes (TZ-6 §6.7).
 * Multi-paragraph terms body. Proposal/valid dates moved to Hero.
 */
export function TripTerms({ bodySlot, visible }: TermsProps) {
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
      </div>
    </footer>
  )
}
