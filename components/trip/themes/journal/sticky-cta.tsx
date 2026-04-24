'use client'

import ActivateButton from '@/components/activate-button'
import { formatPriceShort } from '@/lib/trip-format'

type JournalStickyCTAProps = {
  projectId: string
  status: string
  pricePerPerson: number | null | undefined
  currency: string | null | undefined
}

/**
 * Journal — mobile sticky bottom CTA bar.
 *
 * Visible only when `status === 'quoted'` AND the viewport is mobile. On
 * active / completed trips, Activate is no longer relevant and this bar
 * is suppressed — a future enhancement could show "Message operator"
 * instead (see TODO in journal/README.md).
 *
 * Sits above the TripCommandBar vertically when both are active — command
 * bar is h-24/h-28, sticky-cta is ~64px; enough spacer in tpc prevents
 * footer overlap.
 */
export function JournalStickyCTA({
  projectId,
  status,
  pricePerPerson,
  currency,
}: JournalStickyCTAProps) {
  if (status !== 'quoted' || !projectId) return null
  const priceText = formatPriceShort(pricePerPerson, currency)

  return (
    <div
      className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-4 py-3 flex items-center gap-3 border-t"
      style={{
        background: 'var(--j-cream)',
        borderColor: 'var(--j-rule)',
        boxShadow: '0 -8px 24px rgba(28,24,19,0.06)',
      }}
    >
      {priceText && (
        <div className="flex-1">
          <div
            className="j-mono"
            style={{ color: 'var(--j-ink-mute)', fontSize: 9 }}
          >
            From
          </div>
          <div
            className="j-serif"
            style={{ fontSize: 22, lineHeight: 1, color: 'var(--j-ink)' }}
          >
            {priceText}{' '}
            <span
              className="j-serif j-italic"
              style={{ fontSize: 12, color: 'var(--j-ink-mute)' }}
            >
              / person
            </span>
          </div>
        </div>
      )}
      <ActivateButton projectId={projectId} publicStatus={status} variant="compact" />
    </div>
  )
}
