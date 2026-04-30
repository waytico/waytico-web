/**
 * Trip page v2 — theme host.
 *
 * Resolves `ThemeId` from `data.project.design_theme` and renders the
 * matching v2 theme component. Wraps the theme in `ThemeProviderV2` so
 * leaf sections can pull owner-mode mutations / photo handlers via the
 * `useThemeCtxV2` hook without prop-drilling.
 */
'use client'

import { getThemeComponentV2 } from '@/lib/theme-registry-v2'
import { resolveTheme } from '@/lib/themes'
import { ThemeProviderV2, type ThemeContextV2 } from '@/lib/theme-context-v2'
import type { TripDataV2, TripMode } from '@/types/theme-v2'

export function TripHostV2({
  data,
  mode,
  ctx,
}: {
  data: TripDataV2
  mode: TripMode
  ctx: ThemeContextV2 | null
}) {
  const themeId = resolveTheme(data.project.design_theme)
  const Theme = getThemeComponentV2(themeId)
  return (
    <ThemeProviderV2 value={ctx}>
      <Theme data={data} mode={mode} />
    </ThemeProviderV2>
  )
}
