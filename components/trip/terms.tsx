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
  /** When true, render the body inside a collapsed <details> with the
   *  section title as the <summary>. Used for the public/client view —
   *  Terms can run long and most clients won't read them, so we keep
   *  them out of the way until clicked. Owner mode keeps the body
   *  always visible so edits stay one click away. */
  collapsible?: boolean
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
export function TripTerms({ bodySlot, visible, ownerHint, collapsible }: TermsProps) {
  if (!visible) return null

  // Public/client view: a native <details> accordion. The section title
  // moves into the <summary> so we don't render the heading twice. The
  // disclosure arrow is provided by the browser's default marker, which
  // we restyle in themes.css to match the section's typography. Most
  // clients skim past Terms — collapsing keeps the page tight.
  if (collapsible) {
    return (
      <section className="tp-terms" id="terms">
        <div className="tp-container">
          <details className="tp-terms-details">
            <summary className="tp-terms-summary">
              <h2 className="tp-display tp-terms-summary-title">
                {UI.sectionLabels.terms}
              </h2>
            </summary>
            <div className="tp-terms-body" style={{ marginTop: 16 }}>{bodySlot}</div>
          </details>
        </div>
      </section>
    )
  }

  // Owner view: flat, always expanded. Editing the terms shouldn't
  // require opening an accordion every time.
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

