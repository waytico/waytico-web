'use client'

import { useState } from 'react'
import type { ThemePropsV2 } from '@/types/theme-v2'
import { fmtPrice, currencyGlyph } from '@/lib/trip-format'
import { resolveContacts } from '@/lib/contact-resolution'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { UI } from '@/lib/ui-strings'
import { Hairline } from './styles'

// Mirrors lib/trip-format.ts:CURRENCY_GLYPH so the formatter and the
// picker stay in lock-step. Labels include the glyph so the operator can
// spot the right currency at a glance in the dropdown.
const SUPPORTED_CURRENCIES: Array<{ code: string; label: string }> = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'CAD', label: 'CAD (CA$)' },
  { code: 'AUD', label: 'A$ (AUD)' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'CHF', label: 'CHF' },
]

export function Price({ data }: ThemePropsV2) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable
  const p = data.project

  // Read from the 2.6 pre-computed bundle so this section, the Hero
  // stat tile, the showcase chat context and TripNav all see the same
  // headline value.
  const mode = ctx?.precomputed.pricingMode ?? p.pricing_mode ?? 'per_group'
  const headlineNum = ctx?.precomputed.heroHeadlineNum ?? null
  const headlineFormatted = ctx?.precomputed.heroHeadlineFormatted ?? null
  const headlineField = mode === 'per_traveler' ? 'pricePerPerson' : 'priceTotal'

  const secondaryNum =
    mode === 'per_traveler'
      ? ctx?.precomputed.priceTotalNum ?? null
      : ctx?.precomputed.pricePerPersonNum ?? null
  const secondaryFormatted = fmtPrice(secondaryNum, p.currency)
  const secondaryLabel = mode === 'per_traveler' ? UI.totalPrice : UI.perTraveler

  // Hide entirely in public if no price; in owner mode keep the section
  // so the operator has somewhere to type the first number.
  if (!editable && headlineNum == null) return null

  // Suffix copy used in public mode (and as the dropdown's "current
  // selection" affordance below the value in owner mode).
  let publicSuffix: string
  switch (mode) {
    case 'per_traveler':
      publicSuffix = 'PER TRAVELER · INDICATIVE'
      break
    case 'other':
      publicSuffix = (p.pricing_label || 'INDICATIVE').toUpperCase()
      break
    case 'per_group':
    default:
      publicSuffix = 'FOR THE GROUP · INDICATIVE'
      break
  }

  const channels = resolveContacts(
    data.owner as never,
    (p.operator_contact ?? null) as never,
  )
  const email = channels.email
  const inquireHref = email ? `mailto:${email}` : '#contacts'

  const brandSignoff = data.owner?.brand_name?.trim()
  const glyph = currencyGlyph(p.currency)

  return (
    <section id="price" className="mag-section mag-section--py">
      <div className="mag-shell">
        <Hairline className="mag-price__hairline" />
        <div className="mag-eyebrow mag-price__heading">INVESTMENT</div>
        <div className="mag-eyebrow mag-eyebrow--small mag-eyebrow--muted mag-price__from">
          FROM
        </div>

        <div className="mag-price__headline">
          {editable ? (
            <span className="mag-price__headline-row">
              <span className="mag-price__currency-wrap">
                <span aria-hidden>{glyph}</span>
                <select
                  value={(p.currency || 'USD').toUpperCase()}
                  onChange={(e) =>
                    void ctx!.mutations.saveProjectPatch({ currency: e.target.value })
                  }
                  aria-label="Currency"
                  className="mag-price__currency-select"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </span>
              <EditableField
                as="number"
                value={headlineNum}
                editable
                placeholder="Add price"
                onSave={(v) =>
                  ctx!.mutations.saveProjectPatch({ [headlineField]: v })
                }
                renderDisplay={(v) =>
                  v == null || v === '' ? (
                    <span className="mag-price__empty">Add price</span>
                  ) : (
                    <span>{Number(v).toLocaleString('en-US')}</span>
                  )
                }
              />
            </span>
          ) : (
            headlineFormatted
          )}
        </div>

        {/* Public-mode suffix; owner mode replaces it with the dropdown
            selector below. The static visual register (small uppercase
            mono caps) stays the same so the page rhythm is preserved. */}
        {!editable && (
          <div className="mag-eyebrow mag-eyebrow--small mag-eyebrow--muted mag-price__suffix">
            {publicSuffix}
          </div>
        )}

        {editable && (
          <PriceModeControls
            mode={mode}
            pricingLabel={p.pricing_label ?? null}
            onSaveMode={(next) =>
              ctx!.mutations.saveProjectPatch({ pricingMode: next })
            }
            onSaveLabel={(next) =>
              ctx!.mutations.saveProjectPatch({ pricingLabel: next })
            }
          />
        )}

        {/* Secondary line — "Per traveler: $X · 4 travelers" or
            "Total: $Y" depending on which side the headline shows.
            Skipped in 'other' mode because the per-traveler split is
            meaningless when the headline isn't a clean per-group total. */}
        {mode !== 'other' && secondaryFormatted && (
          <p className="mag-price__secondary">
            {secondaryLabel}:{' '}
            <span className="mag-price__secondary-amount">
              {secondaryFormatted}
            </span>
            {mode === 'per_traveler' && p.group_size != null && (
              <>
                {' '}
                · {p.group_size} {UI.travelers}
              </>
            )}
          </p>
        )}

        <p className="mag-price__note">
          Pricing is indicative and subject to availability at the time of booking.
          Single supplements, peak-season surcharges and seasonal variations may apply.
          A final quote is provided on confirmation of dates and party size.
        </p>

        <div className="mag-price__cta">
          Prefer to discuss in person?{' '}
          <a href={inquireHref} className="mag-price__cta-link">
            Get in touch
          </a>
          .
        </div>

        {brandSignoff && (
          <div className="mag-price__signoff">{brandSignoff.toUpperCase()}</div>
        )}
      </div>
    </section>
  )
}

/* ── Owner-mode mode-selector + custom-label editor ── */

function PriceModeControls({
  mode,
  pricingLabel,
  onSaveMode,
  onSaveLabel,
}: {
  mode: string
  pricingLabel: string | null
  onSaveMode: (next: string) => Promise<boolean>
  onSaveLabel: (next: string | null) => Promise<boolean>
}) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(pricingLabel || '')

  return (
    <div className="mag-price__mode">
      <select
        value={mode}
        onChange={(e) => void onSaveMode(e.target.value)}
        className="mag-price__mode-select"
        aria-label="Pricing mode"
      >
        <option value="per_group">For the group</option>
        <option value="per_traveler">Per traveler</option>
        <option value="other">Other (custom label)</option>
      </select>

      {mode === 'other' && (
        <div className="mag-price__mode-label">
          {editingLabel ? (
            <input
              className="mag-price__mode-label-input"
              value={labelDraft}
              autoFocus
              placeholder="e.g. for 2 adults + 1 child"
              maxLength={100}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={async () => {
                const v = labelDraft.trim()
                await onSaveLabel(v || null)
                setEditingLabel(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                if (e.key === 'Escape') {
                  setLabelDraft(pricingLabel || '')
                  setEditingLabel(false)
                }
              }}
            />
          ) : (
            <span
              className="mag-price__mode-label-text"
              onClick={() => {
                setLabelDraft(pricingLabel || '')
                setEditingLabel(true)
              }}
            >
              {pricingLabel || (
                <span className="mag-price__mode-label-placeholder">
                  Click to add a label
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
