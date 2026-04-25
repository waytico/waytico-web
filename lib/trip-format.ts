// ----------------------------------------------------------------------------
// Trip-page formatting helpers — theme-agnostic
// ----------------------------------------------------------------------------

/**
 * Human-readable date range for hero / mini-stats.
 *
 * - Same month: "June 12 — 15, 2026"
 * - Same year:  "June 12 — July 3, 2026"
 * - Cross year: "December 29, 2025 — January 4, 2026"
 * - End only:   "June 12, 2026" (treats start as primary)
 * - Both null:  ""
 */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start && !end) return ''
  const from = start ? new Date(start) : null
  const to = end ? new Date(end) : null
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', opts).format(d)

  if (from && !to) {
    return fmt(from, { month: 'long', day: 'numeric', year: 'numeric' })
  }
  if (!from && to) {
    return fmt(to, { month: 'long', day: 'numeric', year: 'numeric' })
  }
  if (from && to) {
    if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
      const m = fmt(from, { month: 'long' })
      return `${m} ${from.getDate()} — ${to.getDate()}, ${from.getFullYear()}`
    }
    if (from.getFullYear() === to.getFullYear()) {
      return (
        `${fmt(from, { month: 'long', day: 'numeric' })} — ` +
        `${fmt(to, { month: 'long', day: 'numeric' })}, ${from.getFullYear()}`
      )
    }
    return (
      `${fmt(from, { month: 'long', day: 'numeric', year: 'numeric' })} — ` +
      `${fmt(to, { month: 'long', day: 'numeric', year: 'numeric' })}`
    )
  }
  return ''
}

/** Short mobile variant: "Jun 12 — 15" (no year). */
export function formatDateRangeShort(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start && !end) return ''
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', opts).format(d)
  if (start && end) {
    const s = new Date(start)
    const e = new Date(end)
    if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
      return `${fmt(s, { month: 'short' })} ${s.getDate()} — ${e.getDate()}`
    }
    return `${fmt(s, { month: 'short', day: 'numeric' })} — ${fmt(e, { month: 'short', day: 'numeric' })}`
  }
  return start ? fmt(new Date(start), { month: 'short', day: 'numeric' }) : ''
}

/**
 * Currency symbol for common codes; falls back to the ISO code itself.
 *
 * Short glyphs ($ € £ ¥) for the major currencies keep the price
 * visually dominated by the *number*, not the currency. For codes
 * without a single-character glyph we use the conventional short
 * prefix (CA$ / A$) or fall back to the ISO code with a trailing
 * space so longer codes still separate cleanly from the number.
 */
export function currencySymbol(code: string | null | undefined): string {
  const c = (code || 'USD').toUpperCase().trim()
  switch (c) {
    case 'USD':
      return '$'
    case 'EUR':
      return '€'
    case 'GBP':
      return '£'
    case 'JPY':
      return '¥'
    case 'CAD':
      return 'CA$'
    case 'AUD':
      return 'A$'
    case 'NZD':
      return 'NZ$'
    case 'CHF':
      return 'CHF '
    default:
      return /^[A-Z]{3}$/.test(c) ? `${c} ` : '$'
  }
}

/**
 * ISO currency code (always three uppercase letters). Used where the
 * literal code is preferable to a glyph — e.g. machine-readable
 * contexts or ambiguous-glyph regions.
 */
export function currencyCode(code: string | null | undefined): string {
  const c = (code || 'USD').toUpperCase().trim()
  return /^[A-Z]{3}$/.test(c) ? c : 'USD'
}

/** "$3,450" / "CA$3,450" / "€3,450" — compact, glyph-prefixed. */
export function formatPriceShort(
  price: number | string | null | undefined,
  currency: string | null | undefined,
): string {
  if (price === null || price === undefined || price === '') return ''
  const n = typeof price === 'number' ? price : Number(price)
  if (!Number.isFinite(n)) return ''
  return `${currencySymbol(currency)}${n.toLocaleString('en-US')}`
}

/** Zero-pads a number to two digits. `padTwo(3)` → "03". */
export function padTwo(n: number | null | undefined): string {
  const v = typeof n === 'number' ? n : Number(n ?? 0)
  if (!Number.isFinite(v)) return '00'
  return String(Math.max(0, Math.floor(v))).padStart(2, '0')
}

/** Roman numeral (1–12). Used for Journal "Chapter I / II / III" eyebrows. */
export function roman(n: number): string {
  const map: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
    7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII',
  }
  return map[n] ?? String(n)
}

/** "Thu, Jun 12" — per-day itinerary date label. */
export function formatDayDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d)
}
