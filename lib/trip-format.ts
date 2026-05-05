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

/**
 * Editorial long-form range — always names both months and uses an em-dash
 * with hair spaces. "Jun 24 — Jun 28, 2026" / "Jun 24 — Jul 2, 2026".
 *
 * The Magazine theme uses this in the hero bottom date line where the
 * date sits as a serif italic sub-line under the mono COUNTRY — DAYS
 * eyebrow; the repetition of the month reads as deliberate editorial
 * cadence rather than the compact "Jun 24–28" shorthand the other
 * themes use in tighter stat tiles.
 */
export function fmtDateRangeLong(
  startISO: string | null | undefined,
  endISO: string | null | undefined,
): string | null {
  const a = toDateHead(startISO)
  const b = toDateHead(endISO)
  if (!a || !b) return null
  const s = new Date(`${a}T00:00:00`)
  const e = new Date(`${b}T00:00:00`)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null
  const sameYear = s.getFullYear() === e.getFullYear()
  const startMon = MONTH_SHORT[s.getMonth()]
  const endMon = MONTH_SHORT[e.getMonth()]
  if (sameYear) {
    return `${startMon} ${s.getDate()} — ${endMon} ${e.getDate()}, ${s.getFullYear()}`
  }
  return `${startMon} ${s.getDate()}, ${s.getFullYear()} — ${endMon} ${e.getDate()}, ${e.getFullYear()}`
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

/**
 * Render a small natural number as an UPPERCASE English word.
 *
 * Used in the Magazine hero bottom eyebrow so a 7-day trip reads as
 * "PORTUGAL — SEVEN DAYS" instead of "PORTUGAL — 7 DAYS" — gives the
 * editorial register that Magazine is going for. Numerals stay correct
 * everywhere else (stat tiles, day badges) where compactness matters.
 *
 * Range: 1–30. Anything outside that returns null and the caller is
 * expected to fall back to the numeric form. The cap covers the
 * realistic length of a tour and avoids dragging in a full
 * number-to-words library.
 */
const ONES_WORDS = [
  '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE',
  'SIX', 'SEVEN', 'EIGHT', 'NINE',
]
const TEENS_WORDS = [
  'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN',
  'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
]
const TENS_WORDS = ['', '', 'TWENTY', 'THIRTY']

export function numberToWords(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null
  if (!Number.isInteger(n)) return null
  if (n < 1 || n > 30) return null
  if (n < 10) return ONES_WORDS[n]
  if (n < 20) return TEENS_WORDS[n - 10]
  const tens = Math.floor(n / 10)
  const ones = n % 10
  if (ones === 0) return TENS_WORDS[tens]
  return `${TENS_WORDS[tens]}-${ONES_WORDS[ones]}`
}

/**
 * True iff the given ISO date (or full timestamp) is strictly before
 * today's local-date midnight. Used to decide when to swap "Valid until"
 * → "Expired" labels and to flag rows in the dashboard list.
 *
 * Day-precision comparison: a quote whose valid_until is "today" is
 * still valid right up to end-of-day. Comparing on date-strings only
 * (YYYY-MM-DD) avoids the local-time zone foot-gun where a midnight-
 * timestamp parsed in UTC would slip into the previous calendar day.
 */
export function isDateInPast(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  // Trim a trailing "Tnn:nn:nn..." if backend returned a full ISO
  // timestamp (the DATE column does that under some pg drivers).
  const ymd = String(dateStr).slice(0, 10)
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`
  return ymd < todayStr
}

/* ── Magazine title-shape normalizer ──────────────────────────────────
 *
 * The Magazine theme contract for trip and day titles is a single
 * string with one embedded `\n` separating a regular-weight head from
 * an italic tail (one line on the page for day titles, two lines for
 * the hero title). Pipeline prompts and the trip-editor agent prompt
 * forbid markdown emphasis in titles, but the LLM regularly regresses
 * to `*tail*` or `_tail_` markers instead of `\n`. This is the
 * render-time safety net for any DB rows that haven't been re-saved
 * since the backend write-time fix shipped, and for any future LLM
 * regression that slips past the prompt.
 *
 * Behaviour:
 *  - Already-canonical (`Head\nTail`) input → strip stray emphasis
 *    markers from each side, preserve the `\n`.
 *  - Tail-anchored markdown italic with no `\n` (e.g.
 *    "Marais, *and the Seine's flow.*") → convert to `Head\nTail` by
 *    promoting the wrapped tail to the canonical position.
 *  - Anything else (mid-string emphasis, **bold**, orphan markers,
 *    plain text) → strip all `*` / `_` markers; no `\n` is invented.
 *
 * Pure, idempotent. The backend ships an identical implementation in
 * `src/services/title-normalize.ts:normalizeMagazineTitle` — the two
 * must stay behaviour-equivalent.
 */
function stripEmphasis(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/[*_]+/g, '')
    .trim()
}

export function normalizeMagazineTitle(raw: string | null | undefined): string {
  if (!raw) return ''
  if (raw.includes('\n')) {
    const idx = raw.indexOf('\n')
    const head = stripEmphasis(raw.slice(0, idx))
    const tail = stripEmphasis(raw.slice(idx + 1))
    if (!tail) return head
    if (!head) return tail
    return `${head}\n${tail}`
  }
  const m = raw.match(/^(.+?)\s*(\*+|_+)([^*_\n]+)\2\s*$/)
  if (m) {
    const head = stripEmphasis(m[1])
    const tail = stripEmphasis(m[3])
    if (head && tail) return `${head}\n${tail}`
  }
  return stripEmphasis(raw)
}
