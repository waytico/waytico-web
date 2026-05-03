/**
 * Pure formatting helpers for the trip page.
 * No imports from `next/font` / React — safe to use anywhere.
 */

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CURRENCY_GLYPH: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
  CHF: 'CHF ',
}

/** Glyph for a currency code, or the uppercased code as fallback. */
export function currencyGlyph(currency: string | null | undefined): string {
  if (!currency) return ''
  return CURRENCY_GLYPH[currency.toUpperCase()] || `${currency.toUpperCase()} `
}

const ISO_DATE_HEAD_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Reduce any ISO-shaped value to bare YYYY-MM-DD. Postgres TIMESTAMPTZ
 * serialises as "2026-06-17T00:00:00.000Z" — passing that into other
 * formatters that then concatenate `T00:00:00` produces nonsense like
 * "2026-06-17T00:00:00.000ZT00:00:00" → Invalid Date → null. Slice the
 * head and validate. Returns null for anything that still doesn't match.
 */
function toDateHead(v: string | null | undefined): string | null {
  if (typeof v !== 'string' || v.length < 10) return null
  const head = v.slice(0, 10)
  return ISO_DATE_HEAD_RE.test(head) ? head : null
}

/** "Jun 18–21, 2026" if same month, else "Jun 18 – Jul 2, 2026". */
export function fmtDateRange(startISO: string | null | undefined, endISO: string | null | undefined): string | null {
  const a = toDateHead(startISO)
  const b = toDateHead(endISO)
  if (!a || !b) return null
  const s = new Date(`${a}T00:00:00`)
  const e = new Date(`${b}T00:00:00`)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  if (sameMonth) {
    return `${MONTH_SHORT[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`
  }
  return `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`
}

/** "Apr 22, 2026" */
export function fmtDate(iso: string | null | undefined): string | null {
  const head = toDateHead(iso)
  if (!head) return null
  const d = new Date(`${head}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/**
 * Format a single day's date with weekday for itinerary entries.
 * "Jun 9, Tuesday" (en), "9 июня, вторник" (ru), "9 de junio, martes" (es), etc.
 *
 * Accepts strict ISO YYYY-MM-DD or full TIMESTAMPTZ; both are normalised.
 * Anything else returns null so legacy values like "May 11" don't render as
 * broken `Invalid Date` strings.
 *
 * Locale comes from the project's language; defaults to 'en' if unknown.
 * Locales the runtime can't resolve fall back to en-US automatically.
 */
export function fmtDayDate(
  iso: string | null | undefined,
  language?: string | null,
): string | null {
  const head = toDateHead(iso)
  if (!head) return null
  const d = new Date(`${head}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const lang = language && language.length > 0 ? language : 'en'
  try {
    return new Intl.DateTimeFormat(lang, {
      month: 'short',
      day: 'numeric',
      weekday: 'long',
    }).format(d)
  } catch {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'long',
    }).format(d)
  }
}

/**
 * Coerce price_per_person / price_total to a clean number.
 * Backend serialises NUMERIC as string ("3450.00") — TZ-6 §3 mandates we
 * normalise once at the top of trip-page-client and forward the number.
 */
export function coercePrice(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** "€3,450". Falls back to bare number if currency is unknown. */
export function fmtPrice(amount: number | null | undefined, currency: string | null | undefined): string | null {
  if (amount == null) return null
  const glyph = currency ? (CURRENCY_GLYPH[currency.toUpperCase()] || `${currency.toUpperCase()} `) : ''
  return glyph + amount.toLocaleString('en-US')
}

/**
 * Add N days to an ISO date and return ISO date (no time component).
 * Used for the proposal "valid until = today + 7 days" footer.
 */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Today's date as ISO (YYYY-MM-DD), local timezone. */
export function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Two-digit zero-padded number for hero / itinerary day numerals. */
export function pad2(n: number | null | undefined): string {
  if (n == null) return '00'
  return String(n).padStart(2, '0')
}

export function dayNumeral(n: number | null | undefined): string {
  return pad2(n)
}

/**
 * Extract the 6-character quote code from a trip slug.
 *
 * Slugs are generated server-side as `{title-base}-{suffix}` where suffix is
 * `Math.random().toString(36).substring(2, 8)` — exactly 6 chars from
 * `[0-9a-z]`. We surface that suffix to humans (uppercase) as a stable
 * shortcode they can read out loud or quote in messages, alongside the URL.
 *
 * Returns null when the slug doesn't end with a 6-char [0-9a-z] segment
 * (e.g. the seeded showcase slug `paris-weekend-getaway`). Callers must
 * treat null as "no code to display" and hide the field entirely — never
 * fall back to a partial slice.
 */
export function extractQuoteCode(slug: string | null | undefined): string | null {
  if (!slug) return null
  const match = /-([0-9a-z]{6})$/.exec(slug)
  if (!match) return null
  return match[1].toUpperCase()
}
