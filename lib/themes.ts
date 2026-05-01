/**
 * Trip-page theme registry.
 *
 * Four visual themes apply to the public trip page only (`/t/[slug]`).
 * They are tokens-driven via `:root[data-theme="..."]` blocks in
 * `styles/themes.css`, plus 1–2 structural branches inside Hero.tsx /
 * Itinerary.tsx (kept as `if (theme === '...')` inside a single component
 * file — see TZ-MAGAZINE §4).
 *
 * Owner chrome (header, action bar, command bar, eye-toggles) lives
 * OUTSIDE `<ThemeRoot>` and continues to use shadcn semantic tokens.
 */

export const THEMES = ['editorial', 'expedition', 'compact', 'magazine'] as const
export type ThemeId = (typeof THEMES)[number]
export const DEFAULT_THEME: ThemeId = 'editorial'

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

/**
 * Coerce arbitrary input (DB string, URL param, etc.) into a valid ThemeId.
 * Anything unknown — including `null`, stale TZ-5/TZ-6 values, casing variants —
 * resolves to DEFAULT_THEME ('editorial'). Existing trips with NULL
 * design_theme thus render unchanged.
 */
export function resolveTheme(value: string | null | undefined): ThemeId {
  if (!value) return DEFAULT_THEME
  const lower = value.toLowerCase()
  return isThemeId(lower) ? lower : DEFAULT_THEME
}

/** Hero structural variant per theme. */
export const HERO_STYLE: Record<ThemeId, 'split' | 'overlay' | 'card' | 'magazine'> = {
  editorial: 'split',
  expedition: 'overlay',
  compact: 'card',
  magazine: 'magazine',
}

/** Itinerary structural variant per theme. */
export const ITINERARY_STYLE: Record<ThemeId, 'timeline' | 'photo-cards' | 'grid' | 'magazine'> = {
  editorial: 'timeline',
  expedition: 'photo-cards',
  compact: 'grid',
  magazine: 'magazine',
}

/**
 * Display-friendly labels for the theme switcher.
 *
 * NOTE: these are UI-only — internal ThemeId values, the DB `design_theme`
 * column, the CSS `data-theme` selectors, and `HERO_STYLE` / `ITINERARY_STYLE`
 * maps all keep using the enum names below. Mapping:
 *   editorial  → "Classic"
 *   expedition → "Cinematic"
 *   compact    → "Clean"
 *   magazine   → "Magazine"
 */
export const THEME_LABELS: Record<ThemeId, string> = {
  editorial: 'Classic',
  expedition: 'Cinematic',
  compact: 'Clean',
  magazine: 'Magazine',
}

