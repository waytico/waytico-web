'use client'

import ActivateButton from '@/components/activate-button'
import { formatPriceShort } from '@/lib/trip-format'

type AtelierStickyCTAProps = {
  projectId: string
  status: string
  pricePerPerson: number | null | undefined
  currency: string | null | undefined
}

/**
 * Atelier — mobile sticky bottom CTA bar.
 *
 * Mirrors Journal's behaviour: visible only when status='quoted', mobile
 * only. Active / completed trips don't need an Activate prompt.
 */
export function AtelierStickyCTA({
  projectId,
  status,
  pricePerPerson,
  currency,
}: AtelierStickyCTAProps) {
  if (status !== 'quoted' || !projectId) return null
  const priceText = formatPriceShort(pricePerPerson, currency)

  return (
    <div
      className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-3 py-2.5 flex items-center gap-2.5 border-t"
      style={{
        background: 'white',
        borderColor: 'var(--a-rule)',
        boxShadow: '0 -8px 24px rgba(20,20,20,0.06)',
      }}
    >
      {priceText && (
        <div className="flex-1">
          <div className="a-mono" style={{ color: 'var(--a-mute)', fontSize: 8 }}>
            From
          </div>
          <div
            className="a-display"
            style={{ fontSize: 22, lineHeight: 1, color: 'var(--a-teal)' }}
          >
            {priceText}
          </div>
        </div>
      )}
      <ActivateButton projectId={projectId} publicStatus={status} variant="compact" />
    </div>
  )
}
