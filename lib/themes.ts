/**
 * Trip-page theme registry.
 *
 * After Stage 5.5 the only shipping theme is Magazine — the editorial /
 * expedition / compact branches lived on the legacy `components/trip/*`
 * tree which was removed in Step C. Existing trips with any other
 * `design_theme` value (or NULL) resolve to Magazine via `resolveTheme`.
 */

export const THEMES = ['magazine'] as const
export type ThemeId = (typeof THEMES)[number]
export const DEFAULT_THEME: ThemeId = 'magazine'

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

/**
 * Coerce arbitrary input into a valid ThemeId. Anything unknown — null,
 * legacy enum values (editorial / expedition / compact), casing variants
 * — resolves to Magazine. Existing trips render unchanged.
 */
export function resolveTheme(value: string | null | undefined): ThemeId {
  if (!value) return DEFAULT_THEME
  const lower = value.toLowerCase()
  return isThemeId(lower) ? lower : DEFAULT_THEME
}

/** Display-friendly label for the theme switcher. */
export const THEME_LABELS: Record<ThemeId, string> = {
  magazine: 'Magazine',
}
