'use client'

import { useState, type ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import type { ThemeId } from '@/lib/themes'

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
  /** When 'magazine', renders the Magazine variant — Roman-numeral
   *  eyebrow + Cormorant heading + collapsible body with terracotta
   *  toggle pill. Other values keep the editorial layout. */
  theme?: ThemeId
  /** Magazine-only narrative subtitle slot under the eyebrow. */
  subtitleSlot?: ReactNode
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
 *
 * The 3-branch business logic (trip override / inherited brand terms +
 * Override button / blank placeholder) lives upstream in
 * trip-page-client.tsx and arrives via `bodySlot`. The Magazine variant
 * only restyles the wrapper.
 */
export function TripTerms({ bodySlot, visible, ownerHint, collapsible, theme, subtitleSlot }: TermsProps) {
  if (!visible) return null

  if (theme === 'magazine') {
    return (
      <TermsMagazine
        bodySlot={bodySlot}
        ownerHint={ownerHint}
        collapsible={!!collapsible}
        subtitleSlot={subtitleSlot}
      />
    )
  }

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

/* ── Magazine variant ─────────────────────────────────────────────── */

/**
 * Magazine variant — Roman-numeral eyebrow + Cormorant heading + body.
 * Public view collapses to a 4-line preview with a fade-to-bg overlay
 * and a terracotta "Read full terms ▾" pill toggle. Owner view stays
 * fully expanded so the EditableField + Override button (3-branch
 * logic upstream in trip-page-client) remain one click away.
 */
function TermsMagazine({
  bodySlot,
  ownerHint,
  collapsible,
  subtitleSlot,
}: {
  bodySlot: ReactNode
  ownerHint?: ReactNode
  collapsible: boolean
  subtitleSlot?: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <section className="tp-mag-section tp-mag-terms" id="terms">
      <div className="tp-mag-container">
        <header className="tp-mag-terms__header">
          <hr className="tp-mag-rule" />
          <p className="tp-mag-eyebrow tp-mag-terms__eyebrow">TERMS</p>
          {ownerHint && (
            <p className="tp-mag-terms__hint">{ownerHint}</p>
          )}
        </header>

        {collapsible ? (
          <>
            <div
              className={
                'tp-mag-terms__body tp-mag-terms__body--collapsible' +
                (open ? ' is-open' : '')
              }
            >
              {bodySlot}
              {!open && (
                <div className="tp-mag-terms__fade" aria-hidden="true" />
              )}
            </div>
            <div className="tp-mag-terms__toggle-row">
              <button
                type="button"
                className="tp-mag-terms__toggle"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
              >
                {open ? 'Show less' : 'Read full terms'}
                <span
                  className={
                    'tp-mag-terms__toggle-caret' + (open ? ' is-up' : '')
                  }
                  aria-hidden="true"
                />
              </button>
            </div>
          </>
        ) : (
          <div className="tp-mag-terms__body">{bodySlot}</div>
        )}
      </div>
    </section>
  )
}
