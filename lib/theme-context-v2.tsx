'use client'

import {
  createContext,
  useContext,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react'
import type {
  Accommodation,
  MediaLite,
  PricingMode,
} from '@/types/theme-v2'

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
  setMedia: Dispatch<SetStateAction<MediaLite[]>>
}

export type PrecomputedV2 = {
  pricingMode: PricingMode
  pricePerPersonNum: number | null
  priceTotalNum: number | null
  pricePerPersonFormatted: string | null
  priceTotalFormatted: string | null
  heroHeadlineNum: number | null
  heroHeadlineFormatted: string | null
  heroPriceLabel: string | null
  proposalDateISO: string | null
  validUntilISO: string | null
  dateRange: string | null
}

export type SectionVisibilityV2 = {
  overview: boolean
  itinerary: boolean
  accommodations: boolean
  price: boolean
  included: boolean
  terms: boolean
  contacts: boolean
}

export type LightboxAPI = {
  open: (media: MediaLite) => void
  close: () => void
}

export type AccommodationPhotoUploaderV2 = {
  upload: (
    accommodationId: string,
    file: File,
  ) => Promise<{ cdnUrl: string } | null>
}

export type ActiveSectionsV2 = {
  saveTaskPatch: (id: string, patch: Record<string, unknown>) => Promise<boolean>
  saveWhatToBring: (
    next: Array<{ category: string; items: string[] }>,
  ) => Promise<boolean>
  toggleTaskVisibility: (id: string, next: boolean) => void
  toggleMediaVisibility: (id: string, next: boolean) => void
  deleteDocument: (id: string) => void
  handleDocumentUpload: (files: File[]) => void
  uploadingDoc: boolean
}

export type ThemeContextV2 = {
  editable: boolean
  mutations: MutationsV2
  photo: PhotoHandlersV2
  precomputed: PrecomputedV2
  visibility: SectionVisibilityV2
  lightbox: LightboxAPI
  accommodationUpload?: AccommodationPhotoUploaderV2
  active?: ActiveSectionsV2
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

export function useThemeCtxV2(): ThemeContextV2 | null {
  return useContext(Ctx)
}
