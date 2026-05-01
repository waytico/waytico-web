import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'

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
}

/**
 * Included — shared structure across all themes. Two-card layout.
 *
 * Per TZ-6 §6.5: the section stays visible in public mode IFF at least one
 * side has content. Owner mode always shows it (so they can add items).
 */
export function TripIncluded({ includedBodySlot, notIncludedBodySlot, visible }: IncludedProps) {
  if (!visible) return null
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
