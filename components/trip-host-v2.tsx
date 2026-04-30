/**
 * Trip page v2 — theme host.
 *
 * Thin router: reads `data.project.design_theme`, resolves to a `ThemeId`,
 * and renders the matching v2 theme component. Knows nothing about chrome,
 * mode-specific UI, mutations, or data fetching — those live in
 * `app/v2/t/[slug]/trip-page-client-v2.tsx`.
 */
'use client'

import { getThemeComponentV2 } from '@/lib/theme-registry-v2'
import { resolveTheme } from '@/lib/themes'
import type { TripDataV2, TripMode } from '@/types/theme-v2'

export function TripHostV2({ data, mode }: { data: TripDataV2; mode: TripMode }) {
  const themeId = resolveTheme(data.project.design_theme)
  const Theme = getThemeComponentV2(themeId)
  return <Theme data={data} mode={mode} />
}
