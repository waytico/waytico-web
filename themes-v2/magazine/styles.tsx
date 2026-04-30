/**
 * Magazine theme — shared typographic helpers.
 *
 * Mirrors the constants at the top of magazine-trip.jsx (the source of
 * truth for the theme's visual identity). Each section component spreads
 * `eyebrow`, `display`, or `body` into its inline styles so the typography
 * stays uniform across Hero / Day / Accommodations / Price / etc.
 *
 * Why inline-style constants instead of CSS classes:
 *   - 1:1 visual fidelity with magazine-trip.jsx (which uses inline styles
 *     end-to-end) — easier to verify during stage-2 review.
 *   - No risk of token-load race or specificity wars with chrome styles.
 *   - tokens.css still ships (per spec §B) and is consumed by the chrome
 *     overlay (--bar-* vars) starting in stage 3.
 */
import type { CSSProperties } from 'react'

// Palette — exact hex from magazine-trip.jsx.
export const CREAM = '#F5F0E6'
export const BLACK = '#1A1817'
export const HAIRLINE = 'rgba(26,24,23,0.18)'
export const MUTED = 'rgba(26,24,23,0.62)'
export const ACCENT = '#B85A3E'

export const eyebrow: CSSProperties = {
  fontFamily: 'var(--font-dm-mono), "DM Mono", ui-monospace, monospace',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: BLACK,
  fontWeight: 400,
}

export const display: CSSProperties = {
  fontFamily: 'var(--font-serif), "Cormorant Garamond", "Cormorant", Georgia, serif',
  fontWeight: 500,
  color: BLACK,
  letterSpacing: '-0.005em',
}

export const body: CSSProperties = {
  fontFamily: 'var(--font-inter), "Inter", -apple-system, system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.62,
  color: BLACK,
  fontWeight: 400,
}

export function Hairline({ style }: { style?: CSSProperties }) {
  return <div style={{ height: 1, background: HAIRLINE, width: '100%', ...style }} />
}

// Default tweak values from magazine-trip.jsx TWEAK_DEFAULTS. These are
// fixed in stage 2; if we ever expose tweaks per-trip they move into
// design_theme JSONB or a sibling column.
export const TWEAKS = {
  safeAreaTop: 60,
  accentColor: ACCENT,
  heroHeadlineSize: 40,
  headerScrim: true,
} as const
