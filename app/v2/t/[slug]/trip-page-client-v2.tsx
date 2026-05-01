/**
 * Trip page v2 — client component (stage 3).
 *
 * Stage 3 scope:
 *   - SSR-fetched payload + polling/owner-detect through useTripData
 *   - Mode resolution (public / owner / anon / showcase)
 *   - Owner-mode mutations through useTripMutations (project / day /
 *     accommodation CRUD), photo upload through usePhotoUpload
 *   - Anon-creator flow: sessionStorage flag, claim handshake on
 *     ?claim={projectId}, post-claim upsell modal one-shot
 *   - Showcase: short-circuit mutations, ShowcaseBanner / ShowcasePills
 *   - Full chrome (Header / TripActionBar / ClientInfo / TripCommandBar /
 *     TripFooter / ScrollToTop / Archive / Activate / AnonUpsell /
 *     PostClaim / ActivationToast)
 *   - ThemeContextV2 populated and passed to TripHostV2 so each Magazine
 *     section can read mutations + photo handlers without prop-drilling
 *
 * What's NOT in stage 3 (deferred to stage 4 / 5):
 *   - Document upload + auto-apply to itinerary
 *   - Eye-toggles for tasks / media (visible_to_client) — mutations
 *     wiring is here in spirit but the UI lives inside the Magazine
 *     theme on stage 4
 *   - showcase AI command-bar action plumbing
 *   - previewAsClient toggle (low value vs cost; reach for it later)
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'

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

import { TripHostV2 } from '@/components/trip-host-v2'
import type { ThemeContextV2 } from '@/lib/theme-context-v2'

import { useTripData } from '@/hooks/use-trip-data'
import { useTripMutations } from '@/hooks/use-trip-mutations'
import { usePhotoUpload, type MediaRecord } from '@/hooks/use-photo-upload'
import { apiFetch } from '@/lib/api'
import type { TripDataV2, TripMode } from '@/types/theme-v2'

const SHOWCASE_SLUG = 'paris-weekend-getaway'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://waytico.com'

type Props = {
  slug: string
  initialData: TripDataV2 | null
}

export default function TripPageClientV2({ slug, initialData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, getToken, isLoaded } = useAuth()

  // ─── State ──────────────────────────────────────────────────────────────
  const [data, setData] = useState<TripDataV2 | null>(initialData)
  const [tasks, setTasks] = useState<unknown[]>(initialData?.tasks ?? [])
  const [media, setMedia] = useState<MediaRecord[]>(
    (initialData?.media ?? []) as MediaRecord[]
  )
  const [isOwner, setIsOwner] = useState(false)
  const [previewAsClient] = useState(false)
  const showOwnerUI = isOwner && !previewAsClient
  const [isAnonCreator, setIsAnonCreator] = useState(false)
  const [projectIdForClaim, setProjectIdForClaim] = useState<string | null>(null)
  const [ownerRefreshKey, setOwnerRefreshKey] = useState(0)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [showPostClaimUpsell, setShowPostClaimUpsell] = useState(false)

  const isShowcase = data?.project?.slug === SHOWCASE_SLUG

  // ─── Anon-creator detection (sessionStorage flag) ───────────────────────
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

  // ─── Claim flow (?claim={projectId} after sign-up) ──────────────────────
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
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(`waytico:anon-owns-${claimId}`)
          }
          setIsAnonCreator(false)
          setOwnerRefreshKey((k) => k + 1)
          setShowPostClaimUpsell(true)
        }
      } catch {
        /* ignore */
      }
      router.replace(`/v2/t/${slug}`)
    })()
  }, [searchParams, isSignedIn, isLoaded, getToken, slug, router])

  // ─── Showcase forces isOwner=true (mutations short-circuit internally) ──
  useEffect(() => {
    if (isShowcase) setIsOwner(true)
  }, [isShowcase])

  // ─── useTripData: polling + owner-detect via /api/projects/:id/full ─────
  useTripData({
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

  // ─── Mutations + photo upload ───────────────────────────────────────────
  const {
    saveProjectPatch,
    saveDayPatch,
    saveAccommodationCreate,
    saveAccommodationPatch,
    saveAccommodationDelete,
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

  // ─── Showcase AI command-bar plumbing ───────────────────────────────────
  // POST /api/public/showcase/chat returns a structured action vocabulary
  // (set_field, set_pricing, update_day, add_day, delete_day). We translate
  // each action into a local-state mutation through saveProjectPatch /
  // saveDayPatch — both already short-circuit on isShowcase=true and
  // mutate React state instead of hitting the API. F5 resets — by design,
  // because the showcase trip is shared and changes must never persist.
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
          if (typeof a.pricePerPerson === 'number') patch.pricePerPerson = a.pricePerPerson
          if (typeof a.priceTotal === 'number') patch.priceTotal = a.priceTotal
          if (typeof a.pricingMode === 'string') patch.pricingMode = a.pricingMode
          if (typeof a.groupSize === 'number') patch.groupSize = a.groupSize
          if (Object.keys(patch).length > 0) void saveProjectPatch(patch)
          continue
        }

        if (a.type === 'update_day' && typeof a.dayNumber === 'number') {
          const cur = (data?.project?.itinerary as Array<Record<string, unknown>>) || []
          const day = cur.find((d) => d?.dayNumber === a.dayNumber)
          const dayId = day?.id as string | undefined
          if (!dayId) continue
          const patch: Record<string, unknown> = {}
          if (typeof a.title === 'string') patch.title = a.title
          if (typeof a.description === 'string') patch.description = a.description
          if (Object.keys(patch).length > 0) void saveDayPatch(dayId, patch)
          continue
        }

        if (a.type === 'add_day') {
          const cur = (data?.project?.itinerary as Array<Record<string, unknown>>) || []
          const pos = Math.max(0, Math.min(cur.length, Number(a.position ?? cur.length)))
          const newDay = {
            id:
              typeof crypto !== 'undefined' && 'randomUUID' in crypto
                ? (crypto as Crypto).randomUUID()
                : 'showcase-day-' + Math.random().toString(36).slice(2, 10),
            dayNumber: pos + 1,
            date: null,
            title: typeof a.title === 'string' ? a.title : 'New day',
            description: typeof a.description === 'string' ? a.description : '',
            segments: [],
          }
          const next = [...cur]
          next.splice(pos, 0, newDay)
          const renumbered = next.map((d, i) => ({ ...d, dayNumber: i + 1 }))
          void saveProjectPatch({ itinerary: renumbered, durationDays: renumbered.length })
          continue
        }

        if (a.type === 'delete_day' && typeof a.dayNumber === 'number') {
          const cur = (data?.project?.itinerary as Array<Record<string, unknown>>) || []
          const next = cur.filter((d) => d?.dayNumber !== a.dayNumber)
          if (next.length === cur.length) continue
          const renumbered = next.map((d, i) => ({ ...d, dayNumber: i + 1 }))
          void saveProjectPatch({ itinerary: renumbered, durationDays: renumbered.length })
          continue
        }
      }
    },
    [data?.project?.itinerary, saveProjectPatch, saveDayPatch],
  )

  // tripContext — short summary the showcase chat endpoint uses to ground
  // the AI's responses in this specific trip. Plain string, not JSON, so
  // an LLM consumer can read it without parsing.
  const tripContext = useMemo(() => {
    if (!isShowcase) return undefined
    const itinerary = (data?.project?.itinerary as Array<Record<string, unknown>>) || []
    const daysSummary = itinerary
      .map((d) => `Day ${d.dayNumber || ''} — ${d.title || ''}`)
      .join('; ')
    const p = data?.project
    return [
      `Trip: ${p?.title || ''}.`,
      `Region: ${p?.region || ''}, ${p?.country || ''}.`,
      `Days: ${daysSummary}.`,
      `Total: ${p?.price_total || ''} ${p?.currency || ''}.`,
    ].join('\n')
  }, [isShowcase, data?.project])


  // ─── Build the theme context ────────────────────────────────────────────
  const themeCtx: ThemeContextV2 | null = useMemo(() => {
    if (!showOwnerUI) return null
    return {
      editable: true,
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
      interceptPhotoAction,
    }
  }, [
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
    interceptPhotoAction,
  ])

  // ─── Activation/preview triggers come back via ?activated=1 / ?cancelled=1
  const activated = searchParams.get('activated') === '1'
  const cancelled = searchParams.get('cancelled') === '1'

  // ─── Render ─────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <main
        style={{
          padding: '64px 24px',
          fontFamily: 'ui-monospace, monospace',
          textAlign: 'center',
          color: '#6B5F58',
        }}
      >
        Trip not found.
      </main>
    )
  }

  const p = data.project
  const dataWithMedia: TripDataV2 = useMemoSyncMedia(data, media as never)

  const mode: TripMode = isShowcase
    ? 'showcase'
    : isAnonCreator
      ? 'anon'
      : showOwnerUI
        ? 'owner'
        : 'public'

  const shareUrl = `${APP_URL}/v2/t/${slug}`

  return (
    <>
      {/* Header — only for owners (not anon, not showcase) */}
      {showOwnerUI && !isShowcase && !isAnonCreator && <Header />}

      {/* Showcase banner — replaces Header in showcase mode */}
      {isShowcase && <ShowcaseBanner />}

      {/* Anon banner — sticky orange CTA strip */}
      {isAnonCreator && projectIdForClaim && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: '#C4622D',
            color: '#FFF',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontSize: 14,
          }}
        >
          <span style={{ flex: 1 }}>
            <strong style={{ fontWeight: 600 }}>Sign up free</strong> to keep
            this quote and edit it later — or share it as is.
          </span>
          <ShareMenu
            url={shareUrl}
            title={p.title || 'Trip'}
            publicStatus={p.status}
          />
        </div>
      )}

      {/* Action bar — owner only (not anon, not showcase) */}
      {showOwnerUI && !isShowcase && !isAnonCreator && p.id && (
        <TripActionBar
          projectId={p.id}
          status={p.status}
          title={p.title || 'Trip'}
          shareUrl={shareUrl}
          canShare={true}
          designTheme={p.design_theme}
          onPreviewAsClient={() => {
            /* deferred */
          }}
          onStatusChanged={() => setOwnerRefreshKey((k) => k + 1)}
          onRequestArchive={() => setArchiveOpen(true)}
          onRequestDelete={() => {
            void handleDeleteProject(p.title || 'this trip')
          }}
          isShowcase={isShowcase}
          topOffset={isShowcase ? SHOWCASE_BANNER_HEIGHT : 0}
        />
      )}

      {/* Operator service block (CRM) — owner only */}
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

      {/* Modals */}
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
          signUpUrl={`/sign-up?claim=${projectIdForClaim}&redirect_url=${encodeURIComponent(`/v2/t/${slug}?claim=${projectIdForClaim}`)}`}
          onShareClick={() => {
            /* could open share menu, deferred */
          }}
        />
      )}

      {/* PostClaim upsell — fires once after successful claim */}
      <PostClaimUpsellModal
        show={showPostClaimUpsell}
        onClose={() => setShowPostClaimUpsell(false)}
      />

      {/* Showcase pills (interactive demo hints) */}
      {isShowcase && <ShowcasePills />}

      {/* THEME — Magazine renders all sections inside */}
      <TripHostV2 data={dataWithMedia} mode={mode} ctx={themeCtx} />

      {/* Bottom chrome */}
      {showOwnerUI && !isAnonCreator && p.id && (
        <TripCommandBar
          projectId={p.id}
          getToken={getToken}
          status={p.status}
          theme={p.design_theme}
          onTripUpdated={() => setOwnerRefreshKey((k) => k + 1)}
          isShowcase={isShowcase}
          tripContext={tripContext}
          onShowcaseActions={isShowcase ? applyShowcaseActions : undefined}
        />
      )}

      <TripFooter editable={showOwnerUI && !isAnonCreator} />

      {/* Public viewers / anon get their own ScrollToTop; owners get one
          inside Footer through TripFooter (mode='owner'). */}
      {(!showOwnerUI || isAnonCreator) && <ScrollToTop bottomOffset={24} />}
    </>
  )
}

/**
 * Keep the rendered theme's `data.media` in sync with the local media
 * state (which photo upload mutates). Avoids stale photos on the
 * Magazine sections while leaving the SSR payload immutable.
 */
function useMemoSyncMedia(data: TripDataV2, media: never): TripDataV2 {
  return useMemo(() => ({ ...data, media: media as never }), [data, media])
}
