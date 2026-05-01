/**
 * Trip page v2 — theme registry.
 *
 * Stage 5.5 reduced the live theme set to a single member: Magazine.
 * Any project — regardless of its stored `design_theme` value —
 * renders Magazine because `resolveTheme` (lib/themes.ts) now falls
 * back to 'magazine' for everything.
 */
'use client'

import dynamic from 'next/dynamic'
import type { ThemeComponentV2 } from '@/types/theme-v2'

const MagazineTheme = dynamic(() => import('@/themes-v2/magazine'), { ssr: true })

export function getThemeComponentV2(_themeId: string | null | undefined): ThemeComponentV2 {
  // single-theme world post-5.5
  void _themeId
  return MagazineTheme as ThemeComponentV2
}
