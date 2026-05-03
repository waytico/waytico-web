import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import type { ThemeId } from '@/lib/themes'

type IncludedProps = {
  /**
   * Full slot for the Included card body. Owner mode passes EditableField,
   * public mode passes a parsed list. Either side may be null when there's
   * nothing to show — the card still renders with an empty state because
   * the Included section is part of the page rhythm (TZ-6 §6.5).
   */
  includedBodySlot: ReactNode
  notIncludedBodySlot: ReactNode
  /** Hide the entire section in public mode when both sides are empty. */
  visible: boolean
  /** When 'magazine', renders the Magazine variant — 2-col grid that
   *  stays 2-col on mobile too (TZ pass-B decision #6). Items without
   *  markers and hairline rules between them. Other values keep the
   *  editorial card layout. */
  theme?: ThemeId
  /** Magazine-only narrative subtitle slot under the eyebrow. */
  subtitleSlot?: ReactNode
}

/**
 * Included — shared structure across all themes. Two-card layout.
 *
 * Per TZ-6 §6.5: the section stays visible in public mode IFF at least one
 * side has content. Owner mode always shows it (so they can add items).
 */
export function TripIncluded({ includedBodySlot, notIncludedBodySlot, visible, theme, subtitleSlot }: IncludedProps) {
  if (!visible) return null

  if (theme === 'magazine') {
    return (
      <IncludedMagazine
        includedBodySlot={includedBodySlot}
        notIncludedBodySlot={notIncludedBodySlot}
        subtitleSlot={subtitleSlot}
      />
    )
  }

  return (
    <section className="tp-section" id="included">
      <div className="tp-container">
        <header className="tp-section-head">
          <h2 className="tp-display tp-section-title">{UI.sectionLabels.included}</h2>
        </header>
        <div className="tp-incl-grid">
          <div className="tp-incl-card">
            <h4>{UI.included}</h4>
            {includedBodySlot ? includedBodySlot : <p className="tp-incl-empty">{UI.emptyList}</p>}
          </div>
          <div className="tp-incl-card">
            <h4>{UI.notIncluded}</h4>
            {notIncludedBodySlot ? notIncludedBodySlot : <p className="tp-incl-empty">{UI.emptyList}</p>}
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Shared list renderer used by the public side. Splits a markdown bullet
 * list (one item per line, optional leading `-`/`•`) into <ul>/<li>.
 */
export function IncludedList({ source, kind }: { source: string | null | undefined; kind: 'in' | 'out' }) {
  if (!source) return null
  const items = source
    .split('\n')
    .map((line) => line.replace(/^[-•·]\s*/, '').trim())
    .filter(Boolean)
  if (items.length === 0) return null
  const marker = kind === 'in' ? '+' : '−'
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>
          <span className="mk">{marker}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/* ── Magazine variant ─────────────────────────────────────────────── */

/**
 * Magazine variant — 2-column layout on every viewport (TZ pass-B
 * decision #6: even at 320px the columns stay side-by-side; the
 * editorial layout collapses to stacked there but Magazine doesn't).
 *
 * The body slots are reused as-is — for owner-mode they carry the
 * EditableField, for public-mode the IncludedList component. Magazine
 * styling (no `+`/`−` markers, hairline between items) is applied via
 * CSS scope under `[data-theme="magazine"]`.
 */
function IncludedMagazine({
  includedBodySlot,
  notIncludedBodySlot,
  subtitleSlot,
}: {
  includedBodySlot: ReactNode
  notIncludedBodySlot: ReactNode
  subtitleSlot?: ReactNode
}) {
  return (
    <section className="tp-mag-section tp-mag-incl" id="included">
      <div className="tp-mag-container">
        <header className="tp-mag-incl__header">
          <hr className="tp-mag-rule" />
          <p className="tp-mag-eyebrow tp-mag-incl__eyebrow">IV — DETAILS</p>
          {subtitleSlot && (
            <h2 className="tp-mag-display tp-mag-section-subtitle">
              {subtitleSlot}
            </h2>
          )}
        </header>

        <div className="tp-mag-incl__grid">
          <div className="tp-mag-incl__col">
            <p className="tp-mag-incl__col-eyebrow">INCLUDED</p>
            <div className="tp-mag-incl__body">
              {includedBodySlot ? (
                includedBodySlot
              ) : (
                <p className="tp-mag-incl__empty">—</p>
              )}
            </div>
          </div>
          <div className="tp-mag-incl__col">
            <p className="tp-mag-incl__col-eyebrow">NOT INCLUDED</p>
            <div className="tp-mag-incl__body">
              {notIncludedBodySlot ? (
                notIncludedBodySlot
              ) : (
                <p className="tp-mag-incl__empty">—</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
