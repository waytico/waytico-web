/**
 * Magazine — Price (Investment) section.
 *
 * Source: MAGAZINE-SPEC §G. Mobile + desktop typography per §R.2 lives
 * in layout.css.
 *
 * Owner-mode (stage 3):
 *   - Headline price edits as a number (which field — total or per-
 *     person — is decided by pricing_mode).
 *   - Currency picker: invisible <select> overlaid on the headline glyph.
 *
 * Pricing-mode picker, "other" custom suffix and group-size editing
 * land later — keeping stage 3 focused on the chcecklist items (price
 * editable, currency switches).
 */
'use client'

import type { ThemePropsV2 } from '@/types/theme-v2'
import { fmtPrice, currencyGlyph } from '@/lib/trip-format'
import { resolveContacts } from '@/lib/contact-resolution'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { Hairline } from './styles'

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF']

export function Price({ data }: ThemePropsV2) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable
  const p = data.project

  const mode = p.pricing_mode ?? 'per_group'
  const isPerTraveler = mode === 'per_traveler'
  const headlineAmount = isPerTraveler
    ? (p.price_per_person ?? p.price_total)
    : (p.price_total ?? p.price_per_person)
  const headlineField = isPerTraveler ? 'pricePerPerson' : 'priceTotal'

  const formatted = fmtPrice(headlineAmount, p.currency)

  // Hide entirely in public if no price; in owner mode keep the section
  // so the operator has somewhere to type the first number.
  if (!editable && !formatted) return null

  let suffix: string
  switch (mode) {
    case 'per_traveler':
      suffix = 'PER TRAVELER · INDICATIVE'
      break
    case 'other':
      suffix = (p.pricing_label || 'INDICATIVE').toUpperCase()
      break
    case 'per_group':
    default:
      suffix = 'FOR THE GROUP · INDICATIVE'
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
    <section className="mag-section mag-section--py">
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
                  value={p.currency || 'USD'}
                  onChange={(e) =>
                    void ctx!.mutations.saveProjectPatch({ currency: e.target.value })
                  }
                  aria-label="Currency"
                  className="mag-price__currency-select"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </span>
              <EditableField
                as="number"
                value={headlineAmount}
                editable
                placeholder="0"
                onSave={(v) =>
                  ctx!.mutations.saveProjectPatch({ [headlineField]: v })
                }
                renderDisplay={(v) => <span>{v}</span>}
              />
            </span>
          ) : (
            formatted
          )}
        </div>

        <div className="mag-eyebrow mag-eyebrow--small mag-eyebrow--muted mag-price__suffix">
          {suffix}
        </div>

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
