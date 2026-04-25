'use client'

import ActivateButton from '@/components/activate-button'
import { formatPriceShort } from '@/lib/trip-format'

type ExpeditionStickyCTAProps = {
  projectId: string
  status: string
  pricePerPerson: number | null | undefined
  currency: string | null | undefined
}

/**
 * Expedition — mobile sticky bottom CTA bar.
 *
 * Mirrors Journal/Atelier behaviour: visible only on quoted status, mobile
 * only. Dark deep-bg with thin top rule and ochre price callout.
 */
export function ExpeditionStickyCTA({
  projectId,
  status,
  pricePerPerson,
  currency,
}: ExpeditionStickyCTAProps) {
  if (status !== 'quoted' || !projectId) return null
  const priceText = formatPriceShort(pricePerPerson, currency)

  return (
    <div
      className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-3 py-2.5 flex items-center gap-3"
      style={{
        background: 'var(--e-bg-deep)',
        borderTop: '1px solid var(--e-rule-2)',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.5)',
      }}
    >
      {priceText && (
        <div className="flex-1">
          <div
            className="e-mono"
            style={{ color: 'var(--e-ink-dim)', fontSize: 8 }}
          >
            FROM
          </div>
          <div
            className="e-display"
            style={{
              fontSize: 22,
              lineHeight: 1,
              color: 'var(--e-ochre)',
            }}
          >
            {priceText}
          </div>
        </div>
      )}
      <ActivateButton
        projectId={projectId}
        publicStatus={status}
        variant="compact"
      />
    </div>
  )
}
