/**
 * Magazine — Price (Investment) section.
 *
 * Owner-mode (stage 3):
 *   - Headline price edits as a number (which field — total or per-
 *     person — is decided by pricing_mode).
 *   - Currency picker: invisible <select> overlaid on the headline glyph,
 *     same trick the legacy hero uses in components/trip/hero.tsx.
 *
 * Pricing-mode picker, "other" custom suffix and group-size editing
 * land with the rest of the price block in stage 4 — keeping stage 3
 * focused on the chcecklist items (price editable, currency switches).
 */
'use client'

import type { ThemePropsV2 } from '@/types/theme-v2'
import { fmtPrice, currencyGlyph } from '@/lib/trip-format'
import { resolveContacts } from '@/lib/contact-resolution'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { ACCENT, body, CREAM, display, eyebrow, Hairline, MUTED } from './styles'

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
    <section style={{ background: CREAM, padding: '24px 24px 80px' }}>
      <Hairline style={{ marginBottom: 40 }} />
      <div style={{ ...eyebrow, marginBottom: 18 }}>INVESTMENT</div>
      <div style={{ ...eyebrow, fontSize: 10, color: MUTED, marginBottom: 8 }}>
        FROM
      </div>

      {/* Headline price — owner edits the amount, currency picker on glyph */}
      <div style={{ ...display, fontSize: 56, lineHeight: 1, margin: 0, marginBottom: 4, position: 'relative' }}>
        {editable ? (
          <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
            {/* Currency glyph + invisible <select> overlay */}
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <span aria-hidden>{glyph}</span>
              <select
                value={p.currency || 'USD'}
                onChange={(e) =>
                  void ctx!.mutations.saveProjectPatch({ currency: e.target.value })
                }
                aria-label="Currency"
                style={{
                  position: 'absolute', inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  appearance: 'none',
                  border: 'none', background: 'transparent',
                }}
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
              renderDisplay={(v) => (
                <span style={{ ...display, fontSize: 'inherit' }}>{v}</span>
              )}
            />
          </span>
        ) : (
          formatted
        )}
      </div>

      <div style={{ ...eyebrow, fontSize: 10, color: MUTED, marginBottom: 24 }}>
        {suffix}
      </div>

      <p style={{ ...body, fontSize: 12.5, color: MUTED, lineHeight: 1.6, margin: 0, marginBottom: 18, maxWidth: 320 }}>
        Pricing is indicative and subject to availability at the time of booking.
        Single supplements, peak-season surcharges and seasonal variations may apply.
        A final quote is provided on confirmation of dates and party size.
      </p>

      <div style={{ ...body, fontSize: 14 }}>
        Prefer to discuss in person?{' '}
        <a
          href={inquireHref}
          style={{
            color: ACCENT,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            textDecorationThickness: 1,
          }}
        >
          Get in touch
        </a>
        .
      </div>

      {brandSignoff && (
        <div style={{
          marginTop: 56,
          ...eyebrow,
          fontSize: 10,
          color: MUTED,
          textAlign: 'center',
          letterSpacing: '0.2em',
        }}>
          {brandSignoff.toUpperCase()}
        </div>
      )}
    </section>
  )
}
