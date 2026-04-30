/**
 * Trip page v2 — theme context.
 *
 * Plug-in themes don't get owner mutations / photo upload via prop
 * drilling — that would force every leaf section to declare a wide,
 * theme-irrelevant interface. Instead, `trip-page-client-v2.tsx`
 * builds a context value once and themes read what they need from a
 * cheap hook.
 *
 * Public mode → ctx is `null`; sections that need it bail to read-only.
 * Owner / anon / showcase modes → ctx is populated; the underlying
 * useTripMutations / usePhotoUpload hooks already short-circuit anon
 * and showcase calls internally, so themes can call mutations
 * unconditionally and the right thing happens.
 */
'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Accommodation, MediaLite } from '@/types/theme-v2'

export type MutationsV2 = {
  saveProjectPatch: (patch: Record<string, unknown>) => Promise<boolean>
  saveDayPatch: (dayId: string, patch: Record<string, unknown>) => Promise<boolean>
  saveAccommodationCreate: (input: {
    name: string
    description?: string | null
    imageUrl?: string | null
  }) => Promise<Accommodation | null>
  saveAccommodationPatch: (id: string, patch: Record<string, unknown>) => Promise<boolean>
  saveAccommodationDelete: (id: string) => Promise<boolean>
}

export type PhotoHandlersV2 = {
  handleUpload: (files: File[], dayId: string | null) => Promise<void>
  handleDelete: (mediaId: string) => Promise<void>
  handleHeroUpload: (files: File[]) => Promise<void>
  uploadingByDay: Record<string, number>
  setMedia: React.Dispatch<React.SetStateAction<MediaLite[]>>
}

export type ThemeContextV2 = {
  /**
   * True when the current mode (owner / anon / showcase) should render
   * editable surfaces (EditableField, drop zones, drag handles).
   * False in public mode.
   */
  editable: boolean
  mutations: MutationsV2
  photo: PhotoHandlersV2
  /**
   * If set, photo edit attempts (drop / pick) on owner-style overlays
   * short-circuit via this callback instead of opening the picker.
   * Anon mode passes `() => toast.error('Sign up to edit')` here.
   */
  interceptPhotoAction?: () => void
}

const Ctx = createContext<ThemeContextV2 | null>(null)

export function ThemeProviderV2({
  value,
  children,
}: {
  value: ThemeContextV2 | null
  children: ReactNode
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/**
 * Read the theme context. Returns `null` in public mode so themes can
 * `if (!ctx) return <ReadOnly/>` cleanly.
 */
export function useThemeCtxV2(): ThemeContextV2 | null {
  return useContext(Ctx)
}
