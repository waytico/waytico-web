'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Eye, X } from 'lucide-react'

import Header from '@/components/chrome-v2/header'
import { TripActionBar } from '@/components/chrome-v2/trip-action-bar'
import { ClientInfo } from '@/components/chrome-v2/client-info'
import { TripCommandBar } from '@/components/chrome-v2/trip-command-bar'
import { TripFooter } from '@/components/chrome-v2/trip-footer'
import { ArchiveDialog } from '@/components/chrome-v2/archive-dialog'
import {
  ShowcaseBanner,
  ShowcasePills,
  SHOWCASE_BANNER_HEIGHT,
} from '@/components/chrome-v2/showcase-pills'
import AnonUpsellModal from '@/components/chrome-v2/anon-upsell-modal'
import PostClaimUpsellModal from '@/components/chrome-v2/post-claim-upsell-modal'
import ActivationToast from '@/components/chrome-v2/activation-toast'
import { ScrollToTop } from '@/components/chrome-v2/scroll-to-top'
import ShareMenu from '@/components/shared-v2/share-menu'
import PhotoLightbox from '@/components/shared-v2/photo-lightbox'

import { TripHostV2 } from '@/components/trip-host-v2'
import type {
  ThemeContextV2,
  PrecomputedV2,
  SectionVisibilityV2,
  AccommodationPhotoUploaderV2,
  ActiveSectionsV2,
} from '@/lib/theme-context-v2'

import { useTripData } from '@/hooks/use-trip-data'
import { useTripMutations } from '@/hooks/use-trip-mutations'
import { usePhotoUpload, type MediaRecord } from '@/hooks/use-photo-upload'
import { apiFetch } from '@/lib/api'
import {
  coercePrice,
  fmtPrice,
  fmtDateRange,
  addDaysISO,
} from '@/lib/trip-format'
import { uploadAccommodationPhoto } from '@/lib/upload-photo'
import { UI } from '@/lib/ui-strings'
import type { ThemeId } from '@/lib/themes'
import type { PricingMode, TripDataV2, TripMode } from '@/types/theme-v2'

const SHOWCASE_SLUG = 'paris-weekend-getaway'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://waytico.com'
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'

const DOC_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
]
const DOC_MAX_SIZE = 10 * 1024 * 1024

const EMPTY_PRECOMPUTED: PrecomputedV2 = {
  pricingMode: 'per_group',
  pricePerPersonNum: null,
  priceTotalNum: null,
  pricePerPersonFormatted: null,
  priceTotalFormatted: null,
  heroHeadlineNum: null,
  heroHeadlineFormatted: null,
  heroPriceLabel: null,
  proposalDateISO: null,
  validUntilISO: null,
  dateRange: null,
}

const EMPTY_VISIBILITY: SectionVisibilityV2 = {
  overview: false,
  itinerary: false,
  accommodations: false,
  price: false,
  included: false,
  terms: false,
  contacts: false,
}

type Props = {
  slug: string
  initialData: TripDataV2 | null
}

export default function TripPageClientV2({ slug, initialData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, getToken, isLoaded } = useAuth()

  const [data, setData] = useState<TripDataV2 | null>(initialData)
  const [tasks, setTasks] = useState<unknown[]>(initialData?.tasks ?? [])
  const [media, setMedia] = useState<MediaRecord[]>(
    (initialData?.media ?? []) as MediaRecord[],
  )
  const [isOwner, setIsOwner] = useState(false)
  const [previewAsClient, setPreviewAsClient] = useState(false)
  const showOwnerUI = isOwner && !previewAsClient
  const [isAnonCreator, setIsAnonCreator] = useState(false)
  const [projectIdForClaim, setProjectIdForClaim] = useState<string | null>(null)
  const [ownerRefreshKey, setOwnerRefreshKey] = useState(0)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [showPostClaimUpsell, setShowPostClaimUpsell] = useState(false)
  const [anonShareOpen, setAnonShareOpen] = useState(false)
  const [sharedOnce, setSharedOnce] = useState(false)
  const [lightbox, setLightbox] = useState<MediaRecord | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const isShowcase = data?.project?.slug === SHOWCASE_SLUG

  useEffect(() => {
    if (typeof window === 'undefined') return
    const pid = data?.project?.id
    if (!pid) return
    const anonOwns = sessionStorage.getItem(`waytico:anon-owns-${pid}`)
    if (anonOwns === '1') {
      setIsAnonCreator(true)
      setIsOwner(true)
      setProjectIdForClaim(pid)
    }
  }, [data?.project?.id])

  useEffect(() => {
    const claimId = searchParams.get('claim')
    if (!claimId || !isLoaded || !isSignedIn) return
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const res = await apiFetch(`/api/projects/${claimId}/claim`, {
          method: 'POST',
          token,
        })
        if (res.ok) {
          toast.success('Saved to your account')
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(`waytico:anon-owns-${claimId}`)
          }
          setIsAnonCreator(false)
          setSharedOnce(false)
          setOwnerRefreshKey((k) => k + 1)
          setShowPostClaimUpsell(true)
        }
      } catch {
        /* ignore */
      }
      router.replace(`/v2/t/${slug}`)
    })()
  }, [searchParams, isSignedIn, isLoaded, getToken, slug, router])

  useEffect(() => {
    if (isShowcase) setIsOwner(true)
  }, [isShowcase])

  const { polling, refreshOwnerData, handleTripUpdated } = useTripData({
    slug,
    initialData: data as never,
    setData: setData as never,
    setTasks: setTasks as never,
    setMedia,
    isOwner,
    setIsOwner,
    projectId: data?.project?.id,
    ownerRefreshKey,
  })

  const {
    saveProjectPatch,
    saveTaskPatch,
    saveDayPatch,
    saveAccommodationCreate,
    saveAccommodationPatch,
    saveAccommodationDelete,
    saveWhatToBring,
    handleDeleteProject,
  } = useTripMutations({
    projectId: data?.project?.id,
    setData: setData as never,
    setTasks: setTasks as never,
    isShowcase,
  })

  const { uploadingByDay, handleUpload, handleDelete, handleHeroUpload } =
    usePhotoUpload({
      projectId: data?.project?.id,
      media,
      setMedia,
      isShowcase,
      isAnon: isAnonCreator,
    })

  const interceptPhotoAction = isAnonCreator
    ? () => toast.error('Sign up to edit')
    : undefined

  useEffect(() => {
    if (isOwner) return
    if (initialData?.media) setMedia(initialData.media as MediaRecord[])
    if (initialData?.tasks) setTasks(initialData.tasks as unknown[])
  }, [initialData, isOwner])

  useEffect(() => {
    if (!initialData?.project) return
    setData((prev) => {
      if (!prev?.project) return initialData
      return { ...prev, project: initialData.project }
    })
  }, [initialData])

  useEffect(() => {
    const handler = () => setOwnerRefreshKey((k) => k + 1)
    window.addEventListener('waytico:trip-refresh', handler)
    return () => window.removeEventListener('waytico:trip-refresh', handler)
  }, [])

  const toggleTaskVisibility = useCallback(
    async (taskId: string, nextVisible: boolean) => {
      const prev = tasks
      setTasks((cur) =>
        (cur as Array<Record<string, unknown>>).map((t) =>
          t.id === taskId ? { ...t, visible_to_client: nextVisible } : t,
        ),
      )
      if (isShowcase) {
        toast.success(nextVisible ? 'Visible to client' : 'Hidden from client')
        return
      }
      try {
        const token = await getToken()
        const res = await apiFetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ visibleToClient: nextVisible }),
        })
        if (!res.ok) throw new Error(`PATCH task failed (${res.status})`)
        toast.success(nextVisible ? 'Visible to client' : 'Hidden from client')
      } catch (err: unknown) {
        setTasks(prev)
        toast.error((err as Error)?.message || 'Could not update task')
      }
    },
    [tasks, getToken, isShowcase],
  )

  const toggleMediaVisibility = useCallback(
    async (mediaId: string, nextVisible: boolean) => {
      const prev = media
      setMedia((cur) =>
        cur.map((m) =>
          m.id === mediaId
            ? ({ ...m, visible_to_client: nextVisible } as MediaRecord)
            : m,
        ),
      )
      if (isShowcase) {
        toast.success(nextVisible ? 'Visible to client' : 'Hidden from client')
        return
      }
      try {
        const token = await getToken()
        const res = await apiFetch(`/api/media/${mediaId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ visibleToClient: nextVisible }),
        })
        if (!res.ok) throw new Error(`PATCH media failed (${res.status})`)
        toast.success(nextVisible ? 'Visible to client' : 'Hidden from client')
      } catch (err: unknown) {
        setMedia(prev)
        toast.error((err as Error)?.message || 'Could not update document')
      }
    },
    [media, getToken, isShowcase],
  )

  const deleteDocument = useCallback(
    async (mediaId: string) => {
      const prev = media
      setMedia((cur) => cur.filter((m) => m.id !== mediaId))
      if (isShowcase) {
        toast.success('Document removed')
        return
      }
      try {
        const token = await getToken()
        const res = await apiFetch(`/api/media/${mediaId}`, {
          method: 'DELETE',
          token,
        })
        if (!res.ok && res.status !== 204)
          throw new Error(`Delete failed (${res.status})`)
        toast.success('Document removed')
      } catch (err: unknown) {
        setMedia(prev)
        toast.error((err as Error)?.message || 'Could not delete document')
      }
    },
    [media, getToken, isShowcase],
  )

  const handleDocumentUpload = useCallback(
    async (files: File[]) => {
      const projectId = data?.project?.id
      if (!projectId || files.length === 0) return
      if (isShowcase) {
        for (const file of files) {
          if (!DOC_MIMES.includes(file.type)) {
            toast.error(
              `Unsupported: ${file.name}. Use PDF, DOCX, XLSX, JPEG or PNG.`,
            )
            continue
          }
          if (file.size > DOC_MAX_SIZE) {
            toast.error(`Too large: ${file.name} (max 10MB).`)
            continue
          }
          const fakeId =
            'showcase-doc-' + Math.random().toString(36).slice(2, 10)
          const blobUrl = URL.createObjectURL(file)
          setMedia((cur) => [
            ...cur,
            {
              id: fakeId,
              project_id: projectId,
              user_id: '',
              type: 'document',
              url: blobUrl,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              visible_to_client: true,
              sort_order: cur.length,
            } as unknown as MediaRecord,
          ])
        }
        toast.success('Document uploaded')
        return
      }
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again')
        return
      }
      for (const file of files) {
        if (!DOC_MIMES.includes(file.type)) {
          toast.error(
            `Unsupported: ${file.name}. Use PDF, DOCX, XLSX, JPEG or PNG.`,
          )
          continue
        }
        if (file.size > DOC_MAX_SIZE) {
          toast.error(`Too large: ${file.name} (max 10MB).`)
          continue
        }
        setUploadingDoc(true)
        try {
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch(
            `${API_URL}/api/projects/${projectId}/documents`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: fd,
            },
          )
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}))
            throw new Error(errBody.error || `Upload failed (${res.status})`)
          }
          const body = await res.json()
          const appliedCount = Array.isArray(body?.applied?.changes)
            ? body.applied.changes.filter(
                (c: { action?: string }) =>
                  c.action === 'created' || c.action === 'task_created',
              ).length
            : 0
          toast.success(
            appliedCount > 0
              ? `Uploaded — ${appliedCount} item${appliedCount === 1 ? '' : 's'} added to itinerary`
              : 'Document uploaded',
          )
        } catch (err: unknown) {
          toast.error((err as Error)?.message || `Upload failed: ${file.name}`)
        } finally {
          setUploadingDoc(false)
        }
      }
      try {
        const pubRes = await fetch(`${API_URL}/api/public/projects/${slug}`, {
          cache: 'no-store',
        })
        if (pubRes.ok) setData(await pubRes.json())
      } catch {
        /* ignore */
      }
      await refreshOwnerData()
    },
    [data?.project?.id, getToken, slug, refreshOwnerData, isShowcase],
  )

  const applyShowcaseActions = useCallback(
    (actions: unknown[]) => {
      if (!Array.isArray(actions) || actions.length === 0) return
      for (const raw of actions) {
        const a = raw as Record<string, unknown>
        if (!a || typeof a.type !== 'string') continue

        if (a.type === 'set_field' && typeof a.field === 'string') {
          const fieldMap: Record<string, string> = {
            title: 'title',
            description: 'description',
            region: 'region',
            country: 'country',
            included: 'included',
            not_included: 'notIncluded',
            terms: 'terms',
            currency: 'currency',
          }
          const camelKey = fieldMap[a.field]
          if (camelKey) void saveProjectPatch({ [camelKey]: a.value })
          continue
        }

        if (a.type === 'set_pricing') {
          const patch: Record<string, unknown> = {}
          if (typeof a.pricePerPerson === 'number')
            patch.pricePerPerson = a.pricePerPerson
          if (typeof a.priceTotal === 'number') patch.priceTotal = a.priceTotal
          if (typeof a.pricingMode === 'string')
            patch.pricingMode = a.pricingMode
          if (typeof a.groupSize === 'number') patch.groupSize = a.groupSize
          if (Object.keys(patch).length > 0) void saveProjectPatch(patch)
          continue
        }

        if (a.type === 'update_day' && typeof a.dayNumber === 'number') {
          const cur =
            (data?.project?.itinerary as Array<Record<string, unknown>>) || []
          const day = cur.find((d) => d?.dayNumber === a.dayNumber)
          const dayId = day?.id as string | undefined
          if (!dayId) continue
          const patch: Record<string, unknown> = {}
          if (typeof a.title === 'string') patch.title = a.title
          if (typeof a.description === 'string')
            patch.description = a.description
          if (Object.keys(patch).length > 0) void saveDayPatch(dayId, patch)
          continue
        }

        if (a.type === 'add_day') {
          const cur =
            (data?.project?.itinerary as Array<Record<string, unknown>>) || []
          const pos = Math.max(
            0,
            Math.min(cur.length, Number(a.position ?? cur.length)),
          )
          const newDay = {
            id:
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? (crypto as Crypto).randomUUID()
                : 'showcase-day-' + Math.random().toString(36).slice(2, 10),
            dayNumber: pos + 1,
            date: null,
            title: typeof a.title === 'string' ? a.title : 'New day',
            description:
              typeof a.description === 'string' ? a.description : '',
            segments: [],
          }
          const next = [...cur]
          next.splice(pos, 0, newDay)
          const renumbered = next.map((d, i) => ({ ...d, dayNumber: i + 1 }))
          void saveProjectPatch({
            itinerary: renumbered,
            durationDays: renumbered.length,
          })
          continue
        }

        if (a.type === 'delete_day' && typeof a.dayNumber === 'number') {
          const cur =
            (data?.project?.itinerary as Array<Record<string, unknown>>) || []
          const next = cur.filter((d) => d?.dayNumber !== a.dayNumber)
          if (next.length === cur.length) continue
          const renumbered = next.map((d, i) => ({ ...d, dayNumber: i + 1 }))
          void saveProjectPatch({
            itinerary: renumbered,
            durationDays: renumbered.length,
          })
          continue
        }
      }
    },
    [data?.project?.itinerary, saveProjectPatch, saveDayPatch],
  )

  const precomputed = useMemo<PrecomputedV2>(() => {
    const p = data?.project
    if (!p) return EMPTY_PRECOMPUTED
    const pp = coercePrice(p.price_per_person)
    const total = coercePrice(p.price_total)
    const mode: PricingMode = ((p.pricing_mode as PricingMode | null) ||
      'per_group') as PricingMode
    const headlineNum = mode === 'per_traveler' ? pp : total
    const headlineFormatted = fmtPrice(headlineNum, p.currency)
    const priceLabel =
      mode === 'per_traveler'
        ? UI.perTraveler
        : mode === 'other'
          ? p.pricing_label || UI.forTheGroup
          : UI.forTheGroup
    const proposalHead = p.proposal_date
      ? String(p.proposal_date).slice(0, 10)
      : null
    const createdAt = (p as unknown as { created_at?: string | null }).created_at
    const createdHead = createdAt ? String(createdAt).slice(0, 10) : null
    const proposalDateISO = proposalHead || createdHead || null
    const validHead = p.valid_until ? String(p.valid_until).slice(0, 10) : null
    const validUntilISO =
      validHead || (createdHead ? addDaysISO(createdHead, 14) : null)
    return {
      pricingMode: mode,
      pricePerPersonNum: pp,
      priceTotalNum: total,
      pricePerPersonFormatted: fmtPrice(pp, p.currency),
      priceTotalFormatted: fmtPrice(total, p.currency),
      heroHeadlineNum: headlineNum,
      heroHeadlineFormatted: headlineFormatted,
      heroPriceLabel: priceLabel,
      proposalDateISO,
      validUntilISO,
      dateRange: fmtDateRange(p.dates_start, p.dates_end),
    }
  }, [data?.project])

  const visibility = useMemo<SectionVisibilityV2>(() => {
    const p = data?.project
    if (!p) return EMPTY_VISIBILITY
    const ed = showOwnerUI
    const itinerary = Array.isArray(p.itinerary) ? p.itinerary : []
    const accommodations = Array.isArray(data?.accommodations)
      ? data.accommodations
      : []
    const owner = data?.owner
    const operatorContact = p.operator_contact ?? null
    return {
      overview: ed || !!(p.description && p.description.trim()),
      itinerary: ed || itinerary.length > 0,
      accommodations: ed || accommodations.length > 0,
      price:
        ed ||
        precomputed.pricePerPersonNum != null ||
        precomputed.priceTotalNum != null,
      included:
        ed ||
        !!(p.included && p.included.trim()) ||
        !!(p.not_included && p.not_included.trim()),
      terms:
        ed ||
        !!((p.terms || '').trim() || (owner?.brand_terms || '').trim()),
      contacts:
        ed ||
        !!(
          owner &&
          (owner.brand_email ||
            owner.brand_phone ||
            owner.brand_whatsapp ||
            owner.brand_telegram ||
            owner.brand_website)
        ) ||
        !!(
          operatorContact &&
          (operatorContact.email ||
            operatorContact.phone ||
            operatorContact.whatsapp ||
            operatorContact.telegram ||
            operatorContact.website)
        ),
    }
  }, [
    data,
    showOwnerUI,
    precomputed.pricePerPersonNum,
    precomputed.priceTotalNum,
  ])

  const lightboxAPI = useMemo(
    () => ({
      open: (m: unknown) => setLightbox(m as MediaRecord),
      close: () => setLightbox(null),
    }),
    [],
  )

  const accommodationUpload = useMemo<AccommodationPhotoUploaderV2 | undefined>(
    () => {
      if (!showOwnerUI) return undefined
      return {
        upload: async (accommodationId, file) => {
          if (isAnonCreator) {
            toast.error('Sign up to edit')
            return null
          }
          if (isShowcase) {
            return { cdnUrl: URL.createObjectURL(file) }
          }
          try {
            const token = await getToken()
            if (!token) {
              toast.error('Sign in again')
              return null
            }
            return await uploadAccommodationPhoto(accommodationId, file, token)
          } catch (err: unknown) {
            toast.error((err as Error)?.message || 'Upload failed')
            return null
          }
        },
      }
    },
    [showOwnerUI, isAnonCreator, isShowcase, getToken],
  )

  const active = useMemo<ActiveSectionsV2 | undefined>(() => {
    if (!showOwnerUI) return undefined
    return {
      saveTaskPatch,
      saveWhatToBring,
      toggleTaskVisibility,
      toggleMediaVisibility,
      deleteDocument,
      handleDocumentUpload,
      uploadingDoc,
    }
  }, [
    showOwnerUI,
    saveTaskPatch,
    saveWhatToBring,
    toggleTaskVisibility,
    toggleMediaVisibility,
    deleteDocument,
    handleDocumentUpload,
    uploadingDoc,
  ])

  const themeCtx: ThemeContextV2 = useMemo(
    () => ({
      editable: showOwnerUI,
      mutations: {
        saveProjectPatch,
        saveDayPatch,
        saveAccommodationCreate,
        saveAccommodationPatch,
        saveAccommodationDelete,
      },
      photo: {
        handleUpload,
        handleDelete,
        handleHeroUpload,
        uploadingByDay,
        setMedia: setMedia as never,
      },
      precomputed,
      visibility,
      lightbox: lightboxAPI,
      accommodationUpload,
      active,
      interceptPhotoAction,
    }),
    [
      showOwnerUI,
      saveProjectPatch,
      saveDayPatch,
      saveAccommodationCreate,
      saveAccommodationPatch,
      saveAccommodationDelete,
      handleUpload,
      handleDelete,
      handleHeroUpload,
      uploadingByDay,
      precomputed,
      visibility,
      lightboxAPI,
      accommodationUpload,
      active,
      interceptPhotoAction,
    ],
  )

  const tripContext = useMemo(() => {
    if (!isShowcase) return undefined
    const itinerary =
      (data?.project?.itinerary as Array<Record<string, unknown>>) || []
    const daysSummary = itinerary
      .map((d) => `Day ${d.dayNumber || ''} — ${d.title || ''}`)
      .join('; ')
    const p = data?.project
    return [
      `Trip: ${p?.title || ''}.`,
      `Region: ${p?.region || ''}, ${p?.country || ''}.`,
      `Days: ${daysSummary}.`,
      `Total: ${precomputed.heroHeadlineFormatted || ''} ${precomputed.heroPriceLabel || ''}.`,
    ].join('\n')
  }, [
    isShowcase,
    data?.project,
    precomputed.heroHeadlineFormatted,
    precomputed.heroPriceLabel,
  ])

  // Magazine ActiveSections reads data.tasks; the local `tasks` state
  // is the source of truth (saveTaskPatch + toggleTaskVisibility update
  // it directly, useTripData refills it from /full). Spread it into the
  // dataWithMedia hand-off so the section sees fresh tasks instead of
  // SSR-stale ones.
  const dataWithMedia: TripDataV2 | null = useMemo(() => {
    if (!data) return null
    return {
      ...data,
      media: media as never,
      tasks: tasks as never,
    }
  }, [data, media, tasks])

  void searchParams.get('activated')
  void searchParams.get('cancelled')

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        {polling ? (
          <>
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-lg text-foreground/70">Building your trip page…</p>
            <p className="text-sm text-muted-foreground">
              This usually takes 30–60 seconds
            </p>
          </>
        ) : (
          <>
            <p className="text-lg text-foreground/70">Trip page not found</p>
            <a href="/" className="text-accent hover:underline">
              ← Back to home
            </a>
          </>
        )}
      </div>
    )
  }

  const p = data.project

  const mode: TripMode = isShowcase
    ? 'showcase'
    : isAnonCreator
      ? 'anon'
      : showOwnerUI
        ? 'owner'
        : 'public'

  const shareUrl = `${APP_URL}/v2/t/${slug}`

  return (
    <div
      data-owner-view={showOwnerUI ? 'true' : 'false'}
      data-showcase={isShowcase ? 'true' : 'false'}
    >
      {showOwnerUI && !isShowcase && !isAnonCreator && <Header />}

      {isShowcase && <ShowcaseBanner />}

      {isAnonCreator && p.status === 'quoted' && projectIdForClaim && (
        <>
          <div className="sticky top-0 z-40 bg-highlight border-b border-border">
            <div
              className="max-w-7xl mx-auto px-4 flex items-center gap-3"
              style={{ height: 52 }}
            >
              <div className="text-sm text-foreground/80 flex-1 min-w-0 leading-none">
                <button
                  onClick={() => {
                    const redirectUrl = `/v2/t/${slug}?claim=${projectIdForClaim}`
                    router.push(
                      `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`,
                    )
                  }}
                  className="font-semibold text-accent hover:text-accent/80 underline underline-offset-2"
                >
                  Sign up for free
                </button>
                <span> to edit, add photos, change design, and save to your account.</span>
              </div>
              <div className="relative flex-shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={() => setAnonShareOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 transition-colors whitespace-nowrap"
                >
                  Share as is →
                </button>
                <ShareMenu
                  title={p.title || 'Your trip'}
                  url={shareUrl}
                  publicStatus={p.status}
                  forceOpen={anonShareOpen}
                  onOpenChange={setAnonShareOpen}
                  hideTrigger
                  onShareAction={() => setSharedOnce(true)}
                />
              </div>
            </div>
          </div>

          {sharedOnce && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-[400px]">
              <div className="bg-background border border-border rounded-xl shadow-2xl p-4 pr-9 relative">
                <button
                  type="button"
                  onClick={() => setSharedOnce(false)}
                  aria-label="Dismiss"
                  className="absolute top-2 right-2 p-1 text-foreground/50 hover:text-foreground hover:bg-secondary rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-sm text-foreground/80 mb-2 leading-snug">
                  Your client received an unregistered link — it will stop working in 3 days.
                </p>
                <button
                  onClick={() => {
                    const redirectUrl = `/v2/t/${slug}?claim=${projectIdForClaim}`
                    router.push(
                      `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`,
                    )
                  }}
                  className="text-sm font-semibold text-accent hover:text-accent/80 underline underline-offset-2"
                >
                  Sign up free to save it →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {previewAsClient && (
        <div className="sticky top-0 z-40 bg-accent text-accent-foreground">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-sm flex-1 min-w-0 flex items-center gap-2">
              <Eye className="w-4 h-4 flex-shrink-0" />
              <span>You&apos;re previewing as your client sees this page.</span>
            </p>
            <button
              onClick={() => setPreviewAsClient(false)}
              className="text-sm font-semibold px-3 py-1 rounded-full bg-accent-foreground/15 hover:bg-accent-foreground/25 transition-colors animate-pulse flex-shrink-0"
            >
              Exit preview
            </button>
          </div>
        </div>
      )}

      {showOwnerUI && !isShowcase && !isAnonCreator && p.id && (
        <TripActionBar
          projectId={p.id}
          status={p.status}
          title={p.title || 'Trip'}
          shareUrl={shareUrl}
          canShare={true}
          designTheme={p.design_theme}
          onPreviewAsClient={() => setPreviewAsClient(true)}
          onStatusChanged={() => setOwnerRefreshKey((k) => k + 1)}
          onRequestArchive={() => setArchiveOpen(true)}
          onRequestDelete={() => {
            void handleDeleteProject(p.title || 'this trip')
          }}
          isShowcase={isShowcase}
          topOffset={isShowcase ? SHOWCASE_BANNER_HEIGHT : 0}
          onLocalThemeChange={(next: ThemeId) => {
            setData((prev) =>
              prev?.project
                ? { ...prev, project: { ...prev.project, design_theme: next } }
                : prev,
            )
          }}
        />
      )}

      {showOwnerUI && !isShowcase && !isAnonCreator && p.id && (
        <ClientInfo
          projectId={p.id}
          client={data.client ?? null}
          bookingRef={p.booking_ref ?? null}
          internalNotes={p.internal_notes ?? null}
          specialRequests={p.special_requests ?? null}
          saveProjectPatch={saveProjectPatch}
          onClientChanged={() => setOwnerRefreshKey((k) => k + 1)}
        />
      )}

      {showOwnerUI && !isShowcase && !isAnonCreator && p.id && (
        <ArchiveDialog
          projectId={p.id}
          projectTitle={p.title || 'Trip'}
          currentContact={{
            name: data.client?.name ?? null,
            email: data.client?.email ?? null,
            phone: data.client?.phone ?? null,
          }}
          open={archiveOpen}
          onClose={() => setArchiveOpen(false)}
          onArchived={() => {
            setArchiveOpen(false)
            router.push('/dashboard')
          }}
        />
      )}

      <ActivationToast />

      {isAnonCreator && p.status === 'quoted' && projectIdForClaim && (
        <AnonUpsellModal
          tripTitle={p.title || 'Trip'}
          tripUrl={shareUrl}
          signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(`/v2/t/${slug}?claim=${projectIdForClaim}`)}`}
          onShareClick={() => setAnonShareOpen(true)}
        />
      )}

      <PostClaimUpsellModal
        show={showPostClaimUpsell}
        onClose={() => setShowPostClaimUpsell(false)}
      />

      {isShowcase && <ShowcasePills />}

      <TripHostV2 data={dataWithMedia!} mode={mode} ctx={themeCtx} />

      <PhotoLightbox
        media={lightbox}
        owner={showOwnerUI}
        projectId={p.id || null}
        onClose={() => setLightbox(null)}
        onReplaced={(updated) => {
          setMedia((cur) => cur.map((m) => (m.id === updated.id ? updated : m)))
          setLightbox(updated)
        }}
      />

      {showOwnerUI && !isAnonCreator && p.id && (
        <>
          <TripCommandBar
            projectId={p.id}
            getToken={getToken}
            status={p.status}
            theme={p.design_theme}
            onTripUpdated={handleTripUpdated}
            isShowcase={isShowcase}
        