'use client'

import { EditableField } from '@/components/editable/editable-field'
import ActivateButton from '@/components/activate-button'
import { currencySymbol, formatPriceShort } from '@/lib/trip-format'

type AtelierPriceProps = {
  projectId: string
  status: string
  pricePerPerson: number | null | undefined
  currency: string | null | undefined
  priceNote?: string | null
  owner: boolean
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}

/**
 * Atelier — Price ("06 / The price").
 *
 * Coral wrapper with a white nested card on the right showing the display
 * price + Activate button. Decorative "Hold 7 days at no cost" sticker
 * (right-top, rotated). Heading and copy carry the all-inclusive promise.
 */
export function AtelierPrice({
  projectId,
  status,
  pricePerPerson,
  currency,
  priceNote,
  owner,
  onSave,
}: AtelierPriceProps) {
  if ((pricePerPerson === null || pricePerPerson === undefined) && !owner) return null

  const formatted = formatPriceShort(pricePerPerson, currency)

  return (
    <section id="price" className="px-4 md:px-14 py-16 md:py-24">
      <div
        className="relative overflow-hidden"
        style={{
          background: 'var(--a-coral)',
          color: 'white',
          borderRadius: 24,
          padding: 'clamp(2rem, 4vw, 4.5rem)',
        }}
      >
        <div className="a-eyebrow mb-6" style={{ color: 'white' }}>
          06 / The price
        </div>
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-10 md:gap-20 items-center">
          <div>
            <h2
              className="a-display"
              style={{
                fontSize: 'clamp(2.25rem, 5.5vw, 5.5rem)',
                lineHeight: 0.95,
                margin: 0,
                letterSpacing: '-0.03em',
              }}
            >
              All-inclusive,
              <br />
              <span className="a-italic">no surprises.</span>
            </h2>
            <p
              className="a-sans mt-7"
              style={{
                fontSize: 'clamp(1rem, 1.3vw, 1.125rem)',
                opacity: 0.92,
                lineHeight: 1.6,
                maxWidth: 480,
              }}
            >
              {priceNote ||
                'Transport, lodging, meals, private access. 30% deposit holds your rooms; balance due 60 days before departure.'}
            </p>
          </div>
          <div
            className="p-6 md:p-12"
            style={{
              background: 'white',
              color: 'var(--a-ink)',
              borderRadius: 20,
            }}
          >
            <div className="a-mono mb-3" style={{ color: 'var(--a-mute)' }}>
              Per traveler, double occ.
            </div>
            <div
              className="a-display"
              style={{
                fontSize: 'clamp(3.75rem, 9vw, 7.5rem)',
                lineHeight: 0.88,
                letterSpacing: '-0.04em',
                color: 'var(--a-teal)',
              }}
            >
              {owner ? (
                <>
                  <span style={{ fontSize: '0.5em' }}>{currencySymbol(currency)}</span>
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
            {status === 'quoted' && projectId && (
              <div className="mt-9">
                <ActivateButton projectId={projectId} publicStatus={status} />
              </div>
            )}
          </div>
        </div>

        {/* Decorative rotated sticker */}
        <div
          className="a-sticker hidden md:block absolute"
          style={{
            right: 48,
            top: 48,
            background: 'white',
            color: 'var(--a-coral)',
            transform: 'rotate(8deg)',
          }}
          aria-hidden="true"
        >
          Hold
          <br />
          7 days
          <br />
          <span style={{ fontSize: 10 }}>at no cost</span>
        </div>
      </div>
    </section>
  )
}
