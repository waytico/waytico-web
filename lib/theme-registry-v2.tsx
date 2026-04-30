/**
 * Trip page v2 — theme registry.
 *
 * Maps `ThemeId` (from lib/themes.ts — shared between v1 and v2) to a
 * dynamically-imported v2 theme component. Stage 2: Magazine ships as
 * the first real plug-in theme; the other three (editorial / expedition
 * / compact) keep rendering the skeleton until they get their own
 * Magazine-style handoff bundles.
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
const MagazineTheme = dynamic(() => import('@/themes-v2/magazine'), { ssr: true })

export const THEME_COMPONENTS_V2: Partial<Record<ThemeId, ThemeComponentV2>> = {
  // Real themes:
  magazine: MagazineTheme as ThemeComponentV2,
  // Pending themes — fall through to skeleton until they ship:
  editorial: SkeletonTheme as ThemeComponentV2,
  expedition: SkeletonTheme as ThemeComponentV2,
  compact: SkeletonTheme as ThemeComponentV2,
}

const FallbackTheme = SkeletonTheme as ThemeComponentV2

export function getThemeComponentV2(themeId: string | null | undefined): ThemeComponentV2 {
  const id: ThemeId = isThemeId(themeId) ? themeId : DEFAULT_THEME
  return THEME_COMPONENTS_V2[id] ?? FallbackTheme
}
