import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'

type TermsProps = {
  /** Slot for the terms body — owner: EditableField, public: paragraph(s). */
  bodySlot: ReactNode
  /** True when terms text exists OR owner mode wants the placeholder shown. */
  visible: boolean
  /** Optional helper rendered under the heading. Owner mode passes a
   *  one-liner explaining the scope of edits; omitted in public view. */
  ownerHint?: ReactNode
}

/**
 * Terms — shared structure across all themes (TZ-6 §6.7).
 * Multi-paragraph terms body. Proposal/valid dates moved to Hero.
 *
 * Renders as <section> (not <footer>) — Terms used to be the last block
 * before a Waytico footer, but Contacts now sits below it. Keeping the
 * <footer> tag here visually swallows everything beneath when the terms
 * body is long: the section claims page-end semantics + bottom padding
 * cascades. Switching to <section> matches the rest of the trip page.
 */
export function TripTerms({ bodySlot, visible, ownerHint }: TermsProps) {
  if (!visible) return null
  return (
    <section className="tp-terms" id="terms">
      <div className="tp-container">
        <header className="tp-section-head" style={{ marginBottom: 24 }}>
          <h2 className="tp-display" style={{ fontSize: 28 }}>
            {UI.sectionLabels.terms}
          </h2>
          {ownerHint && (
            <p
              style={{
                fontSize: 13,
                color: 'var(--ink-mute)',
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              {ownerHint}
            </p>
          )}
        </header>
        <div className="tp-terms-body">{bodySlot}</div>
      </div>
    </section>
  )
}

