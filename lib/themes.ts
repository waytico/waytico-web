// Trip page theme registry.
// Each theme has its own visual language (colors, fonts, accent), but the
// block order and data contract are identical across themes.

export type ThemeId = 'journal' | 'expedition' | 'atelier' | 'custom'

export type ThemeMeta = {
  id: ThemeId
  label: string
  /** One-line marketing description used in the theme switcher UI. */
  description: string
  /** If true, the theme is selectable by operators. `custom` is reserved. */
  selectable: boolean
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  journal: {
    id: 'journal',
    label: 'Journal',
    description: 'Warm editorial — cream paper, terracotta accent, unhurried.',
    selectable: true,
  },
  expedition: {
    id: 'expedition',
    label: 'Expedition',
    description: 'Cinematic dark — bold uppercase, ochre rust, field-guide energy.',
    selectable: true,
  },
  atelier: {
    id: 'atelier',
    label: 'Atelier',
    description: 'Contemporary light — coral pops, teal + sage, gallery-modern.',
    selectable: true,
  },
  custom: {
    id: 'custom',
    label: 'Custom',
    description: 'Coming soon — your own palette, fonts, and layout.',
    selectable: false,
  },
}

export const DEFAULT_THEME: ThemeId = 'journal'
export const SELECTABLE_THEMES: ThemeMeta[] = Object.values(THEMES).filter(
  (t) => t.selectable,
)

/** Narrow an arbitrary string coming from the API to a valid ThemeId. */
export function resolveTheme(value: string | null | undefined): ThemeId {
  if (value === 'journal' || value === 'expedition' || value === 'atelier' || value === 'custom') {
    return value
  }
  return DEFAULT_THEME
}
