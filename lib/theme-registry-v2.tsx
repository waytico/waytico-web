/**
 * Trip page v2 — theme registry.
 *
 * Maps `ThemeId` (from lib/themes.ts — shared between v1 and v2) to a
 * dynamically-imported v2 theme component. On stage 1 every theme renders
 * the skeleton placeholder; real themes (Magazine, Sanctuary, Frontier)
 * are registered as they ship and replace the skeleton entry one by one.
 *
 * `HERO_STYLE` / `ITINERARY_STYLE` from lib/themes.ts are NOT used in v2 —
 * those maps drive the legacy `components/trip/*` branches. v2 themes own
 * their structure end-to-end.
 */
'use client'

import dynamic from 'next/dynamic'
import type { ThemeComponentV2 } from '@/types/theme-v2'
import { type ThemeId, DEFAULT_THEME, isThemeId } from './themes'

const SkeletonTheme = dynamic(() => import('@/themes-v2/skeleton'), { ssr: true })

export const THEME_COMPONENTS_V2: Partial<Record<ThemeId, ThemeComponentV2>> = {
  // Stage 1 — every theme falls through to the skeleton. Real themes
  // replace these entries one by one starting in stage 2.
  editorial: SkeletonTheme as ThemeComponentV2,
  expedition: SkeletonTheme as ThemeComponentV2,
  compact: SkeletonTheme as ThemeComponentV2,
  magazine: SkeletonTheme as ThemeComponentV2,
}

const FallbackTheme = SkeletonTheme as ThemeComponentV2

export function getThemeComponentV2(themeId: string | null | undefined): ThemeComponentV2 {
  const id: ThemeId = isThemeId(themeId) ? themeId : DEFAULT_THEME
  return THEME_COMPONENTS_V2[id] ?? FallbackTheme
}
