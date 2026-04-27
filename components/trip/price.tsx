import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'

type PriceProps = {
  /** Slot for the dominant price display (e.g. "€3,450"). Owner mode passes
   *  EditableField for currency + amount; public passes a formatted string. */
  amountSlot: ReactNode
  /** Pre-formatted total (price_total × group_size) — null if absent. */
  totalFormatted: string | null
  groupSize: number | null
  /** True when the section should render at all (price > 0 OR owner mode). */
  visible: boolean
}

/**
 * Price — shared structure across all themes (TZ-6 §6.6). Per-theme styling
 * (display weight) flows from CSS variables.
 *
 * The Activate CTA was removed from this section; activation is now driven
 * from the trip-action-bar status menu only.
 */
export function TripPrice({ amountSlot, totalFormatted, groupSize, visible }: PriceProps) {
  if (!visible) return null
  return (
    <section className="tp-section" id="price">
      <div className="tp-container">
        <header className="tp-section-head">
          <h2 className="tp-display tp-section-title">{UI.sectionLabels.price}</h2>
        </header>
        <div className="tp-price-block">
          <div>
            <div className="tp-price-amount">{amountSlot}</div>
            <p className="tp-price-meta">{UI.perTraveler}</p>
            {totalFormatted && (
              <p style={{ marginTop: 24, fontSize: 14, color: 'var(--ink-soft)' }}>
                {UI.totalPrice}:{' '}
                <span style={{ fontFamily: 'var(--font-mono)' }}>{totalFormatted}</span>
                {groupSize != null && ` · ${groupSize} ${UI.travelers}`}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
