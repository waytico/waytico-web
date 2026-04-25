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

/** Currency symbol for common codes; falls back to the code itself. */
export function currencySymbol(code: string | null | undefined): string {
  const c = (code || 'USD').toUpperCase()
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
    case 'CHF':
      return 'CHF '
    default:
      return c + ' '
  }
}

/** "€3,450" with thousands separators. */
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

/**
 * Split a trip title into a base + accent for two-line hero rendering.
 *
 * Strategy:
 *   1. If the title contains an explicit `\n` newline → split on the first one.
 *   2. Else, if the title is multi-word, accent the LAST word/phrase after the
 *      last common preposition or connector ("in / of / through / across /
 *      between / at / on / to") — so "Cultural Tour in Île-de-France" becomes
 *      base="Cultural Tour in", accent="Île-de-France".
 *   3. Else, if no preposition matches, accent the last token.
 *   4. Single-word titles → base only, accent empty.
 *
 * Used by all three theme heroes (Journal/Atelier/Expedition) to render the
 * h1 as <base><br/><accent> with the accent in theme color, matching the
 * Claude Design specs.
 */
export function splitTitleAccent(
  title: string | null | undefined,
): { base: string; accent: string } {
  const t = (title || '').trim()
  if (!t) return { base: '', accent: '' }

  // 1. explicit newline override
  if (t.includes('\n')) {
    const [b, ...rest] = t.split('\n')
    return { base: b.trim(), accent: rest.join(' ').trim() }
  }

  const tokens = t.split(/\s+/)
  if (tokens.length === 1) return { base: t, accent: '' }
  if (tokens.length === 2) return { base: tokens[0], accent: tokens[1] }

  // 2. find LAST connector/preposition; accent everything after it
  const connectors = new Set([
    'in', 'of', 'through', 'across', 'between', 'at', 'on', 'to',
    'for', 'into', 'from', 'over', 'around', 'along', 'via', 'by',
    'and', '&', '+',
  ])
  let lastConnIdx = -1
  for (let i = tokens.length - 2; i >= 1; i--) {
    if (connectors.has(tokens[i].toLowerCase())) {
      lastConnIdx = i
      break
    }
  }
  if (lastConnIdx > 0 && lastConnIdx < tokens.length - 1) {
    return {
      base: tokens.slice(0, lastConnIdx + 1).join(' '),
      accent: tokens.slice(lastConnIdx + 1).join(' '),
    }
  }

  // 3. fallback — accent only the last token
  return {
    base: tokens.slice(0, -1).join(' '),
    accent: tokens[tokens.length - 1],
  }
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
