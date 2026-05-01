/**
 * Trip-page theme registry.
 *
 * Six visual themes apply to the public trip page only (`/t/[slug]`).
 * They are tokens-driven via `:root[data-theme="..."]` blocks in
 * `styles/themes.css`, plus a structural branch per theme inside
 * Hero.tsx / Itinerary.tsx (kept as `if (heroStyle === '...')` inside
 * a single component file — see ARCHITECTURE.md "Single component tree").
 *
 * Owner chrome (header, action bar, command bar, eye-toggles) lives
 * OUTSIDE `<ThemeRoot>` and continues to use shadcn semantic tokens.
 *
 * Adding a theme: extend THEMES (DB CHECK constraint must allow the new
 * value too — see backend src/db/migrate.ts), add HERO_STYLE / ITINERARY_STYLE
 * entries, add a CSS token block in styles/themes.css, add a structural
 * branch in hero.tsx / itinerary.tsx for the new variant string. Owner
 * features (drag-and-drop, photo upload, anon-creator, showcase, top
 * strip) are wrapped AROUND branching points and don't require changes.
 */

export const THEMES = [
  'editorial',
  'expedition',
  'compact',
  'magazine',
  'serene',
  'frontier',
] as const
export type ThemeId = (typeof THEMES)[number]
export const DEFAULT_THEME: ThemeId = 'editorial'

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

/**
 * Coerce arbitrary input (DB string, URL param, etc.) into a valid ThemeId.
 * Anything unknown — including `null`, stale TZ-5 values, casing variants —
 * resolves to DEFAULT_THEME ('editorial'). Existing trips with NULL
 * design_theme thus render unchanged.
 */
export function resolveTheme(value: string | null | undefined): ThemeId {
  if (!value) return DEFAULT_THEME
  const lower = value.toLowerCase()
  return isThemeId(lower) ? lower : DEFAULT_THEME
}

/**
 * Hero structural variant per theme.
 *
 *   split    — image right, text left (Editorial)
 *   overlay  — full-bleed photo, large uppercase title overlaid (Expedition)
 *   card     — text + structured info card on the right, photo below (Compact)
 *   magazine — full-bleed photo with bottom-left headline + Roman-numeral
 *              eyebrow + sticky inquiry bar (Magazine)
 *   centered — full-bleed photo with centered headline overlay,
 *              top meta strip (Serene)
 *   frontier — full-bleed photo with vignette gradient, bottom-left
 *              headline + filled CTA + scroll hint (Frontier)
 */
export type HeroStyle =
  | 'split'
  | 'overlay'
  | 'card'
  | 'magazine'
  | 'centered'
  | 'frontier'

export const HERO_STYLE: Record<ThemeId, HeroStyle> = {
  editorial: 'split',
  expedition: 'overlay',
  compact: 'card',
  magazine: 'magazine',
  serene: 'centered',
  frontier: 'frontier',
}

/**
 * Itinerary structural variant per theme.
 *
 *   timeline    — vertical eyebrow + title + image + prose (Editorial)
 *   photo-cards — full-bleed image + text panel below (Expedition)
 *   grid        — image + adjacent text card (Compact)
 *   magazine    — eyebrow in accent + serif title + 16:9 photo +
 *                 prose, hairlines between days (Magazine)
 *   centered    — centered eyebrow + italic display title + 4:3 photo +
 *                 narrow centered prose (Serene)
 *   frontier    — full-bleed 21:9/16:9 photo with location pill +
 *                 dark text panel below (Frontier)
 */
export type ItineraryStyle =
  | 'timeline'
  | 'photo-cards'
  | 'grid'
  | 'magazine'
  | 'centered'
  | 'frontier'

export const ITINERARY_STYLE: Record<ThemeId, ItineraryStyle> = {
  editorial: 'timeline',
  expedition: 'photo-cards',
  compact: 'grid',
  magazine: 'magazine',
  serene: 'centered',
  frontier: 'frontier',
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
 *   serene     → "Serene"
 *   frontier   → "Frontier"
 */
export const THEME_LABELS: Record<ThemeId, string> = {
  editorial: 'Classic',
  expedition: 'Cinematic',
  compact: 'Clean',
  magazine: 'Magazine',
  serene: 'Serene',
  frontier: 'Frontier',
}
