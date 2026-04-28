'use client'

import { useState, type ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'

type TermsProps = {
  /** Slot for the terms body — owner: EditableField, public: paragraph(s). */
  bodySlot: ReactNode
  /** True when terms text exists OR owner mode wants the placeholder shown. */
  visible: boolean
  /** Optional helper rendered under the heading. Owner mode passes a
   *  one-liner explaining the scope of edits; omitted in public view. */
  ownerHint?: ReactNode
  /** When true, the public view starts collapsed: a few preview lines
   *  fade into the page, with a Read-full-terms button revealing the
   *  rest. Owner mode passes false so editing stays one click away. */
  collapsible?: boolean
}

/**
 * Terms — shared structure across all themes (TZ-6 §6.7).
 * Multi-paragraph terms body. Proposal/valid dates moved to Hero.
 *
 * Public view (collapsible=true): the body opens with a soft preview
 * of the first lines, fading into the section background, plus a
 * Read-full-terms / Collapse pill below. The fade is the affordance —
 * clients see the content exists and that there's more behind the
 * cut. No accordion arrow, no detached chrome.
 *
 * Owner view: flat, always expanded.
 */
export function TripTerms({ bodySlot, visible, ownerHint, collapsible }: TermsProps) {
  if (!visible) return null

  if (collapsible) {
    return <CollapsibleTerms bodySlot={bodySlot} />
  }

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

function CollapsibleTerms({ bodySlot }: { bodySlot: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <section className="tp-terms" id="terms">
      <div className="tp-container">
        <header className="tp-section-head" style={{ marginBottom: 24 }}>
          <h2 className="tp-display" style={{ fontSize: 28 }}>
            {UI.sectionLabels.terms}
          </h2>
        </header>

        <div
          className={
            'tp-terms-body tp-terms-body--collapsible' +
            (open ? ' is-open' : '')
          }
        >
          {bodySlot}
          {!open && <div className="tp-terms-fade" aria-hidden="true" />}
        </div>

        <div className="tp-terms-toggle-row">
          <button
            type="button"
            className="tp-terms-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? 'Show less' : 'Read full terms'}
            <span className={'tp-terms-toggle-caret' + (open ? ' is-up' : '')} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}

