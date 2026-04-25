'use client'

import { EditableField } from '@/components/editable/editable-field'
import ActivateButton from '@/components/activate-button'
import { currencySymbol, formatPriceShort } from '@/lib/trip-format'

type ExpeditionPriceProps = {
  projectId: string
  status: string
  pricePerPerson: number | null | undefined
  currency: string | null | undefined
  priceNote?: string | null
  owner: boolean
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}

/**
 * Expedition — Price ("§ 06 — COMMISSION").
 *
 * Dark deep-bg section. Two-column: left has stacked "BOOK THE / EXPEDITION."
 * heading + lede; right column has the all-in commission label, oversized
 * ochre price, "PER TRAVELER · DOUBLE OCCUPANCY" subline, and Activate
 * button (quoted only).
 */
export function ExpeditionPrice({
  projectId,
  status,
  pricePerPerson,
  currency,
  priceNote,
  owner,
  onSave,
}: ExpeditionPriceProps) {
  if ((pricePerPerson === null || pricePerPerson === undefined) && !owner) return null

  const formatted = formatPriceShort(pricePerPerson, currency)

  return (
    <section
      id="price"
      className="relative px-4 md:px-14 py-20 md:py-32"
      style={{
        background: 'var(--e-bg-deep)',
        borderTop: '1px solid var(--e-rule-2)',
        color: 'var(--e-cream)',
      }}
    >
      <div className="relative">
        <div className="e-mono mb-6" style={{ color: 'var(--e-ochre)' }}>
          § 06 — COMMISSION
        </div>
        <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
          <div>
            <h2
              className="e-display"
              style={{
                fontSize: 'clamp(3rem, 8vw, 7rem)',
                lineHeight: 0.85,
                margin: 0,
                letterSpacing: '-0.03em',
              }}
            >
              BOOK THE
              <br />
              <span style={{ color: 'var(--e-ochre)' }}>EXPEDITION.</span>
            </h2>
            <p
              className="e-body mt-9"
              style={{
                fontSize: 'clamp(1rem, 1.3vw, 1.125rem)',
                color: 'var(--e-cream-mute)',
                lineHeight: 1.6,
                maxWidth: 520,
              }}
            >
              {priceNote ||
                'Commission is all-in: transport, lodging, meals, private access. No surprises, no surcharges. A 30% deposit secures your seat.'}
            </p>
          </div>
          <div>
            <div className="e-mono mb-4" style={{ color: 'var(--e-cream-mute)' }}>
              ALL-IN COMMISSION
            </div>
            <div
              className="e-display"
              style={{
                fontSize: 'clamp(4.5rem, 14vw, 12.5rem)',
                lineHeight: 0.82,
                letterSpacing: '-0.04em',
                color: 'var(--e-ochre)',
              }}
            >
              {owner ? (
                <>
                  <span style={{ fontSize: '0.45em' }}>{currencySymbol(currency)}</span>
                  <EditableField
                    as="number"
                    editable={owner}
                    value={pricePerPerson}
                    placeholder="Price"
                    min={0}
                    onSave={(v) => onSave({ pricePerPerson: v })}
                  />
                </>
              ) : (
                formatted || ''
              )}
            </div>
            <div className="e-mono mt-4" style={{ color: 'var(--e-cream-mute)' }}>
              PER TRAVELER &nbsp;·&nbsp; DOUBLE OCCUPANCY
            </div>
            {status === 'quoted' && projectId && (
              <div className="mt-12 md:mt-14">
                <ActivateButton projectId={projectId} publicStatus={status} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
