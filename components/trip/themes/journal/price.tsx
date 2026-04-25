'use client'

import { EditableField } from '@/components/editable/editable-field'
import ActivateButton from '@/components/activate-button'
import { currencySymbol, formatPriceShort } from '@/lib/trip-format'

type JournalPriceProps = {
  projectId: string
  status: string
  pricePerPerson: number | null | undefined
  currency: string | null | undefined
  priceNote?: string | null
  owner: boolean
  onSave: (patch: Record<string, unknown>) => Promise<boolean>
}

/**
 * Journal — Price (Chapter VI · "Investment").
 *
 * Dark-ink background with big display price on the right and a prose
 * heading on the left. The canvas uses number-spelled heading; we use a
 * restrained "All told." instead — spelling every number out reliably
 * across currencies and sizes is out of scope.
 *
 * Activate button is rendered here *in addition* to the hero CTA — matches
 * canvas, matches conversion best-practice.
 */
export function JournalPrice({
  projectId,
  status,
  pricePerPerson,
  currency,
  priceNote,
  owner,
  onSave,
}: JournalPriceProps) {
  if (pricePerPerson === null || pricePerPerson === undefined) {
    if (!owner) return null
  }

  const formattedPrice = formatPriceShort(pricePerPerson, currency)

  return (
    <section
      id="price"
      className="j-section px-6 md:px-[72px] py-20 md:py-[140px]"
      style={{ background: 'var(--j-ink)', color: 'var(--j-paper)' }}
    >
      <div className="grid md:grid-cols-2 gap-10 md:gap-[120px] items-center">
        <div>
          <div
            className="j-mono mb-6"
            style={{ color: '#E8B893' }}
          >
            ◆ &nbsp; Chapter VI · Investment
          </div>
          <h2
            className="j-serif"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              lineHeight: 0.95,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            All <em style={{ color: '#E8B893' }}>told.</em>
          </h2>
          <p
            className="j-serif mt-8"
            style={{
              fontSize: 'clamp(1rem, 1.3vw, 1.25rem)',
              fontWeight: 300,
              opacity: 0.8,
              maxWidth: 520,
            }}
          >
            {priceNote ||
              'Per traveler, double occupancy. A 30% deposit secures your place; balance is due sixty days before departure.'}
          </p>
        </div>

        <div
          className="md:pl-20 md:border-l"
          style={{ borderColor: 'rgba(250,246,236,0.2)' }}
        >
          <div
            className="j-serif"
            style={{
              fontSize: 'clamp(5.5rem, 11vw, 10rem)',
              lineHeight: 0.9,
              fontWeight: 300,
              letterSpacing: '-0.04em',
            }}
          >
            {owner ? (
              <>
                <span
                  style={{
                    fontSize: '0.4em',
                    verticalAlign: 'top',
                    marginRight: 6,
                    opacity: 0.7,
                  }}
                >
                  {currencySymbol(currency)}
                </span>
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
              formattedPrice || ''
            )}
          </div>
          <div
            className="j-mono mt-4"
            style={{ color: 'rgba(250,246,236,0.6)' }}
          >
            Per traveler · double occupancy
          </div>

          {status === 'quoted' && projectId && (
            <div className="mt-10">
              <ActivateButton projectId={projectId} publicStatus={status} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
