/**
 * Magazine — Price (Investment) section.
 *
 * Source: magazine-trip.jsx lines 339–381. Huge Cormorant headline price,
 * "PER PERSON · DOUBLE OCCUPANCY" sub-eyebrow, indicative-pricing
 * disclaimer, and an inline accent "Get in touch" link.
 *
 * Adaptations:
 *   - Headline price assembled from pricing_mode:
 *       per_group    → price_total + " for the group"
 *       per_traveler → price_per_person + " per traveler"
 *       other        → price_total + custom pricing_label
 *     If price is null we fall back to the first non-null of total /
 *     per-person.
 *   - Sub-eyebrow line built from the same mode.
 *   - "Get in touch" inline link → mailto: of the operator's resolved
 *     email, or anchor to the Contacts section if no email is resolvable.
 *   - Sign-off line at the bottom uses the operator brand name.
 *
 * Empty state: if no price at all, section is hidden.
 *
 * Sticky inquire bar from §I is intentionally NOT rendered here — it
 * conflicts with TripCommandBar/ContactAgentMenu and is a separate
 * product decision.
 */
import type { ThemePropsV2 } from '@/types/theme-v2'
import { fmtPrice } from '@/lib/trip-format'
import { resolveContacts } from '@/lib/contact-resolution'
import { ACCENT, body, CREAM, display, eyebrow, Hairline, MUTED } from './styles'

export function Price({ data }: ThemePropsV2) {
  const p = data.project

  const mode = p.pricing_mode ?? 'per_group'
  const headlineAmount = mode === 'per_traveler'
    ? (p.price_per_person ?? p.price_total)
    : (p.price_total ?? p.price_per_person)

  const formatted = fmtPrice(headlineAmount, p.currency)
  if (!formatted) return null

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

  // Resolve operator email for the inline link. If absent → anchor to
  // the in-page Contacts section instead of opening a broken mailto.
  // resolveContacts is typed against the legacy trip-types module; the
  // shape is identical here so we cast through unknown to avoid
  // re-exporting the lib's types.
  const channels = resolveContacts(
    data.owner as never,
    (p.operator_contact ?? null) as never,
  )
  const email = channels.email
  const inquireHref = email ? `mailto:${email}` : '#contacts'

  const brandSignoff = data.owner?.brand_name?.trim()

  return (
    <section style={{ background: CREAM, padding: '24px 24px 80px' }}>
      <Hairline style={{ marginBottom: 40 }} />
      <div style={{ ...eyebrow, marginBottom: 18 }}>INVESTMENT</div>
      <div style={{ ...eyebrow, fontSize: 10, color: MUTED, marginBottom: 8 }}>
        FROM
      </div>
      <div style={{ ...display, fontSize: 56, lineHeight: 1, margin: 0, marginBottom: 4 }}>
        {formatted}
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
