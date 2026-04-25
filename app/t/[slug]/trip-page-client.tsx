'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Eye, X } from 'lucide-react'
import ActivationToast from '@/components/activation-toast'
import PhotoLightbox from '@/components/photo-lightbox'
import AnonUpsellModal from '@/components/anon-upsell-modal'
import ShareMenu from '@/components/share-menu'
import { ScrollToTop } from '@/components/scroll-to-top'
import Header from '@/components/header'
import { TripCommandBar } from '@/components/trip/trip-command-bar'
import { TripActionBar } from '@/components/trip/trip-action-bar'
import { ArchiveDialog } from '@/components/trip/archive-dialog'
import { StudioDrawer } from '@/components/trip/editors'
import { EditableField } from '@/components/editable/editable-field'
import { apiFetch } from '@/lib/api'
import { resolveOperatorContact } from '@/lib/operator-contact'
import { useTripMutations } from '@/hooks/use-trip-mutations'
import { usePhotoUpload, type MediaRecord } from '@/hooks/use-photo-upload'
import { useTripData } from '@/hooks/use-trip-data'
import { useScrollSpy } from '@/hooks/use-scroll-spy'

import { ThemeRoot } from '@/components/trip/theme-root'
import { resolveTheme } from '@/lib/themes'
import {
  JournalNav,
  JournalHero,
  JournalOverview,
  JournalItinerary,
  JournalIncluded,
  JournalMap,
  JournalGallery,
  JournalPrice,
  JournalRatings,
  JournalHost,
  JournalOperator,
  JournalCTA,
  JournalTerms,
  JournalStickyCTA,
} from '@/components/trip/themes/journal'
import {
  AtelierNav,
  AtelierHero,
  AtelierOverview,
  AtelierItinerary,
  AtelierIncluded,
  AtelierMap,
  AtelierGallery,
  AtelierPrice,
  AtelierRatings,
  AtelierHost,
  AtelierOperator,
  AtelierCTA,
  AtelierTerms,
  AtelierStickyCTA,
} from '@/components/trip/themes/atelier'
import {
  ExpeditionNav,
  ExpeditionHero,
  ExpeditionOverview,
  ExpeditionItinerary,
  ExpeditionIncluded,
  ExpeditionMap,
  ExpeditionGallery,
  ExpeditionPrice,
  ExpeditionRatings,
  ExpeditionHost,
  ExpeditionOperator,
  ExpeditionCTA,
  ExpeditionTerms,
  ExpeditionStickyCTA,
} from '@/components/trip/themes/expedition'
import { TasksBlock, DocumentsBlock, WhatToBringBlock } from '@/components/trip/themes/shared'

type Location = {
  id: string
  name: string
  type: string
  latitude: string
  longitude: string
  day_number: number
  notes: string | null
  sort_order?: number | null
}

export type TripOwnerInfo = {
  id: string
  name: string | null
  business_name: string | null
  brand_logo_url: string | null
  brand_tagline: string | null
  email: string | null
}

export type TripInitialData = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  project: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tasks: any[]
  locations: Location[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  media: any[]
  owner?: TripOwnerInfo | null
}

type Props = {
  slug: string
  initialData: TripInitialData | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://waytico-web.onrender.com'

const DOC_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
]
const DOC_MAX_SIZE = 10 * 1024 * 1024

export default function TripPageClient({ slug, initialData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, getToken, isLoaded } = useAuth()

  const [data, setData] = useState(initialData)
  const [showBanner, setShowBanner] = useState(false)
  const [isAnonCreator, setIsAnonCreator] = useState(false)
  const [projectIdForClaim, setProjectIdForClaim] = useState<string | null>(null)
  const [anonShareOpen, setAnonShareOpen] = useState(false)
  const [ownerRefreshKey, setOwnerRefreshKey] = useState(0)

  // ─── Anon-owner banner wiring ────────────────────────────────────────
  useEffect(() => {
    try {
      if (!data?.project) return
      const pid = data.project.id as string | undefined
      if (!pid) return

      const anonOwns = sessionStorage.getItem(`waytico:anon-owns-${pid}`)
      if (anonOwns === '1') {
        setIsAnonCreator(true)
        setProjectIdForClaim(pid)
      }

      const bannerDismissed = sessionStorage.getItem(`waytico:banner-dismissed-${pid}`)
      if (anonOwns === '1' && !bannerDismissed && data.project.status === 'quoted') {
        setShowBanner(true)
      }
    } catch {}
  }, [data])

  // ─── Claim flow ─────────────────────────────────────────────────────
  useEffect(() => {
    const claimId = searchParams.get('claim')
    if (!claimId || !isLoaded || !isSignedIn) return
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const res = await fetch(`${API_URL}/api/projects/${claimId}/claim`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          toast.success('Saved to your account')
          try {
            sessionStorage.removeItem(`waytico:anon-owns-${claimId}`)
            sessionStorage.removeItem(`waytico:banner-dismissed-${claimId}`)
          } catch {}
          setShowBanner(false)
          setIsAnonCreator(false)
          setOwnerRefreshKey((k) => k + 1)
        }
      } catch {}
      router.replace(`/t/${slug}`)
    })()
  }, [searchParams, isSignedIn, isLoaded, getToken, slug, router])

  // ─── Owner / photos / tasks state ───────────────────────────────────
  const [isOwner, setIsOwner] = useState(false)
  const [previewAsClient, setPreviewAsClient] = useState(false)
  const showOwnerUI = isOwner && !previewAsClient
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [studioOpen, setStudioOpen] = useState(false)
  const [media, setMedia] = useState<MediaRecord[]>(
    (initialData?.media as MediaRecord[]) || [],
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tasks, setTasks] = useState<any[]>(initialData?.tasks || [])
  const [lightbox, setLightbox] = useState<MediaRecord | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)

  const { polling, refreshOwnerData, handleTripUpdated } = useTripData({
    slug,
    initialData,
    setData,
    setTasks,
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
    saveSegmentPatch,
    saveWhatToBring,
    handleDeleteProject: _handleDeleteProject,
  } = useTripMutations({
    projectId: data?.project?.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setData: setData as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTasks: setTasks as any,
  })

  const handleDeleteProject = useCallback(async () => {
    const title = data?.project?.title || 'this trip'
    await _handleDeleteProject(title)
  }, [_handleDeleteProject, data?.project?.title])

  // Keep media/tasks in sync with SSR data when we don't have owner payload.
  useEffect(() => {
    if (isOwner) return
    if (initialData?.media) setMedia(initialData.media as MediaRecord[])
    if (initialData?.tasks) setTasks(initialData.tasks)
  }, [initialData, isOwner])

  // Replace project state when SSR refreshes (e.g. after Stripe redirect).
  useEffect(() => {
    if (!initialData?.project) return
    setData((prev) => {
      if (!prev?.project) return initialData
      return { ...prev, project: initialData.project }
    })
  }, [initialData])

  // External trigger: refresh owner-side /full payload on 'waytico:trip-refresh'.
  useEffect(() => {
    const handler = () => setOwnerRefreshKey((k) => k + 1)
    window.addEventListener('waytico:trip-refresh', handler)
    return () => window.removeEventListener('waytico:trip-refresh', handler)
  }, [])

  const { uploadingByDay, handleUpload, handleDelete, handleHeroUpload } = usePhotoUpload({
    projectId: data?.project?.id,
    media,
    setMedia,
  })

  // ─── Visibility toggles (owner only) ────────────────────────────────
  const toggleTaskVisibility = useCallback(
    async (taskId: string, nextVisible: boolean) => {
      const prev = tasks
      setTasks((cur) =>
        cur.map((t) => (t.id === taskId ? { ...t, visible_to_client: nextVisible } : t)),
      )
      try {
        const token = await getToken()
        const res = await apiFetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ visibleToClient: nextVisible }),
        })
        if (!res.ok) throw new Error(`PATCH task failed (${res.status})`)
        toast.success(nextVisible ? 'Visible to client' : 'Hidden from client')
      } catch (err) {
        setTasks(prev)
        toast.error(err instanceof Error ? err.message : 'Could not update task')
      }
    },
    [tasks, getToken],
  )

  const toggleMediaVisibility = useCallback(
    async (mediaId: string, nextVisible: boolean) => {
      const prev = media
      setMedia((cur) =>
        cur.map((m) =>
          m.id === mediaId ? ({ ...m, visible_to_client: nextVisible } as MediaRecord) : m,
        ),
      )
      try {
        const token = await getToken()
        const res = await apiFetch(`/api/media/${mediaId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ visibleToClient: nextVisible }),
        })
        if (!res.ok) throw new Error(`PATCH media failed (${res.status})`)
        toast.success(nextVisible ? 'Visible to client' : 'Hidden from client')
      } catch (err) {
        setMedia(prev)
        toast.error(err instanceof Error ? err.message : 'Could not update document')
      }
    },
    [media, getToken],
  )

  const deleteDocument = useCallback(
    async (mediaId: string) => {
      const prev = media
      setMedia((cur) => cur.filter((m) => m.id !== mediaId))
      try {
        const token = await getToken()
        const res = await apiFetch(`/api/media/${mediaId}`, {
          method: 'DELETE',
          token,
        })
        if (!res.ok && res.status !== 204) {
          throw new Error(`Delete failed (${res.status})`)
        }
        toast.success('Document removed')
      } catch (err) {
        setMedia(prev)
        toast.error(err instanceof Error ? err.message : 'Could not delete document')
      }
    },
    [media, getToken],
  )

  // ─── Document upload (owner only) ──────────────────────────────────
  const handleDocumentUpload = useCallback(
    async (files: File[]) => {
      const projectId = data?.project?.id
      if (!projectId || files.length === 0) return
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again')
        return
      }

      for (const file of files) {
        if (!DOC_MIMES.includes(file.type)) {
          toast.error(`Unsupported: ${file.name}. Use PDF, DOCX, XLSX, JPEG or PNG.`)
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
          const res = await fetch(`${API_URL}/api/projects/${projectId}/documents`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd,
          })
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}))
            throw new Error(errBody.error || `Upload failed (${res.status})`)
          }
          const body = await res.json()
          const appliedCount = Array.isArray(body?.applied?.changes)
            ? body.applied.changes.filter(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (c: any) => c.action === 'created' || c.action === 'task_created',
              ).length
            : 0
          toast.success(
            appliedCount > 0
              ? `Uploaded — ${appliedCount} item${appliedCount === 1 ? '' : 's'} added to itinerary`
              : 'Document uploaded',
          )
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : `Upload failed: ${file.name}`,
          )
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
    [data?.project?.id, getToken, slug, refreshOwnerData],
  )

  const isReady = data && data.project?.status !== 'generating'

  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        {polling ? (
          <>
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-lg text-foreground/70">Building your trip page…</p>
            <p className="text-sm text-muted-foreground">This usually takes 30–60 seconds</p>
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itinerary: any[] = p.itinerary || []
  const locations: Location[] = data.locations || []
  const shareUrl = `${APP_URL}/t/${slug}`
  const ownerInfo = data.owner ?? null
  const operatorContact = resolveOperatorContact(p.operator_contact, ownerInfo)
  const activeSection = useScrollSpy()
  const heroPhoto = media.find((m) => m.placement === 'hero')
  const durationLabel = p.duration_days ? `${p.duration_days} days` : null

  return (
    <div className="min-h-screen bg-background">
      {/* Owner chrome — outside ThemeRoot, uses global tokens */}
      {showOwnerUI && <Header />}

      {showOwnerUI && p.id && (
        <TripActionBar
          projectId={p.id}
          status={p.status}
          title={p.title}
          shareUrl={shareUrl}
          canShare={showOwnerUI || isAnonCreator}
          onPreviewAsClient={() => setPreviewAsClient(true)}
          onStatusChanged={() => setOwnerRefreshKey((k) => k + 1)}
          onRequestArchive={() => setArchiveOpen(true)}
          onRequestDelete={handleDeleteProject}
          onOpenStudio={() => setStudioOpen(true)}
        />
      )}

      {showOwnerUI && p.id && (
        <StudioDrawer
          open={studioOpen}
          onClose={() => setStudioOpen(false)}
          projectId={p.id}
          initialDesignTheme={p.design_theme}
          initialRatings={p.ratings}
          initialHost={p.host}
          initialOperatorContact={p.operator_contact}
          initialBrand={
            ownerInfo
              ? {
                  brand_logo_url: ownerInfo.brand_logo_url,
                  brand_tagline: ownerInfo.brand_tagline,
                }
              : null
          }
          onSaved={() => {
            setOwnerRefreshKey((k) => k + 1)
            router.refresh()
          }}
        />
      )}

      {showOwnerUI && p.id && (
        <ArchiveDialog
          open={archiveOpen}
          projectId={p.id}
          projectTitle={p.title}
          currentContact={{
            name: p.client_name,
            email: p.client_email,
            phone: p.client_phone,
          }}
          onClose={() => setArchiveOpen(false)}
          onArchived={() => {
            setOwnerRefreshKey((k) => k + 1)
            router.refresh()
          }}
        />
      )}

      <ActivationToast />

      {previewAsClient && (
        <div className="sticky top-0 z-40 bg-foreground text-background">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <p className="text-sm flex-1 min-w-0 flex items-center gap-2">
              <Eye className="w-4 h-4 flex-shrink-0" />
              <span>You&apos;re previewing as your client sees this page.</span>
            </p>
            <button
              onClick={() => setPreviewAsClient(false)}
              className="text-sm font-semibold underline underline-offset-2 hover:opacity-80 flex-shrink-0"
            >
              Exit preview
            </button>
          </div>
        </div>
      )}

      {showBanner && projectIdForClaim && (
        <div className="sticky top-0 z-40 bg-highlight border-b border-border">
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
            <p className="text-sm text-foreground/80 flex-1 min-w-0">
              <span className="hidden sm:inline">This quote is available for 3 days. </span>
              <span className="sm:hidden">Available 3 days. </span>
              <button
                onClick={() => {
                  const redirectUrl = `/t/${slug}?claim=${projectIdForClaim}`
                  router.push(`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`)
                }}
                className="font-semibold text-accent hover:text-accent/80 underline underline-offset-2"
              >
                Sign up for free
              </button>
              <span className="hidden sm:inline">
                {' '}
                to edit, add photos, and save to your account.
              </span>
              <span className="sm:hidden"> to save.</span>
            </p>
          </div>
        </div>
      )}

      {/* ─── Anon upsell modal + floating share trigger ─── */}
      {isAnonCreator && data?.project?.status === 'quoted' && (
        <>
          <AnonUpsellModal
            tripTitle={data.project.title || 'Your trip'}
            tripUrl={shareUrl}
            signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(`/t/${slug}?claim=${projectIdForClaim || data.project.id}`)}`}
            onShareClick={() => setAnonShareOpen(true)}
          />
          {/* Share as is — fixed top-right, same visual row as hero brand strip */}
          <div className="fixed top-0 right-0 z-50 px-4 md:px-[72px] py-4 md:py-7">
            <ShareMenu
              title={data.project.title || 'Your trip'}
              url={shareUrl}
              publicStatus={data.project.status}
              forceOpen={anonShareOpen}
              onOpenChange={setAnonShareOpen}
              label="Share as is →"
            />
          </div>
        </>
      )}

      {/* ─── Themed content ─────────────────────────────────────────── */}
      {(() => {
        const theme = resolveTheme(p.design_theme)

        const activeStatusBlocks = p.status === 'active' && (
          <div className="max-w-3xl mx-auto px-6 md:px-[72px] py-16 space-y-16">
            <TasksBlock
              tasks={tasks}
              owner={showOwnerUI}
              onSaveTask={saveTaskPatch}
              onToggleVisibility={toggleTaskVisibility}
            />
            <DocumentsBlock
              media={media}
              owner={showOwnerUI}
              uploading={uploadingDoc}
              onUpload={handleDocumentUpload}
              onToggleVisibility={toggleMediaVisibility}
              onDelete={deleteDocument}
            />

            {/* What to Bring — shared block, theme-agnostic */}
            <WhatToBringBlock
              whatToBring={p.what_to_bring}
              owner={showOwnerUI}
              onSave={saveWhatToBring}
            />
          </div>
        )

        if (theme === 'expedition') {
          return (
            <ThemeRoot theme="expedition">
              <ExpeditionHero
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                project={p as any}
                owner={showOwnerUI}
                heroPhoto={heroPhoto}
                uploadingHero={uploadingByDay['hero'] || 0}
                ownerProfile={ownerInfo}
                onHeroUpload={handleHeroUpload}
                onHeroDelete={handleDelete}
                onSaveProject={saveProjectPatch}
              />
              <ExpeditionNav activeSection={activeSection} />
              <ExpeditionOverview
                description={p.description}
                owner={showOwnerUI}
                onSave={(v) => saveProjectPatch({ description: v })}
                host={p.host}
              />
              <ExpeditionItinerary
                itinerary={itinerary}
                media={media}
                owner={showOwnerUI}
                uploadingByDay={uploadingByDay}
                onUpload={handleUpload}
                onDelete={handleDelete}
                onOpenPhoto={setLightbox}
                onSaveDay={saveDayPatch}
                onSaveSegment={saveSegmentPatch}
              />
              <ExpeditionIncluded
                included={p.included}
                notIncluded={p.not_included}
                owner={showOwnerUI}
                onSaveIncluded={(v) => saveProjectPatch({ included: v })}
                onSaveNotIncluded={(v) => saveProjectPatch({ notIncluded: v })}
              />
              <ExpeditionMap locations={locations} />
              <ExpeditionGallery
                media={media}
                owner={showOwnerUI}
                uploading={uploadingByDay['tour'] || 0}
                onUpload={handleUpload}
                onOpenPhoto={setLightbox}
              />
              <ExpeditionPrice
                projectId={p.id}
                status={p.status}
                pricePerPerson={p.price_per_person}
                currency={p.currency}
                priceNote={null}
                owner={showOwnerUI}
                onSave={saveProjectPatch}
              />
              <ExpeditionRatings ratings={p.ratings} />
              <ExpeditionHost host={p.host} />
              <ExpeditionOperator
                contact={operatorContact}
                brandLogoUrl={ownerInfo?.brand_logo_url}
                brandTagline={ownerInfo?.brand_tagline}
                hostAvatarUrl={p.host?.avatarUrl}
              />
              <ExpeditionCTA
                tripTitle={p.title}
                shareUrl={shareUrl}
                contact={operatorContact}
              />
              {activeStatusBlocks}
              <ExpeditionTerms
                terms={p.terms}
                owner={showOwnerUI}
                onSave={(v) => saveProjectPatch({ terms: v })}
                slug={slug}
                businessName={ownerInfo?.business_name}
              />
              <ExpeditionStickyCTA
                projectId={p.id}
                status={p.status}
                pricePerPerson={p.price_per_person}
                currency={p.currency}
                contact={operatorContact}
              />
            </ThemeRoot>
          )
        }

        if (theme === 'atelier') {
          return (
            <ThemeRoot theme="atelier">
              <AtelierHero
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                project={p as any}
                owner={showOwnerUI}
                heroPhoto={heroPhoto}
                uploadingHero={uploadingByDay['hero'] || 0}
                ownerProfile={ownerInfo}
                host={p.host}
                onHeroUpload={handleHeroUpload}
                onHeroDelete={handleDelete}
                onSaveProject={saveProjectPatch}
              />
              <AtelierNav activeSection={activeSection} />
              <AtelierOverview
                description={p.description}
                owner={showOwnerUI}
                onSave={(v) => saveProjectPatch({ description: v })}
              />
              <AtelierItinerary
                itinerary={itinerary}
                media={media}
                owner={showOwnerUI}
                uploadingByDay={uploadingByDay}
                onUpload={handleUpload}
                onDelete={handleDelete}
                onOpenPhoto={setLightbox}
                onSaveDay={saveDayPatch}
                onSaveSegment={saveSegmentPatch}
              />
              <AtelierIncluded
                included={p.included}
                notIncluded={p.not_included}
                owner={showOwnerUI}
                onSaveIncluded={(v) => saveProjectPatch({ included: v })}
                onSaveNotIncluded={(v) => saveProjectPatch({ notIncluded: v })}
              />
              <AtelierMap locations={locations} />
              <AtelierGallery
                media={media}
                owner={showOwnerUI}
                uploading={uploadingByDay['tour'] || 0}
                onUpload={handleUpload}
                onOpenPhoto={setLightbox}
              />
              <AtelierPrice
                projectId={p.id}
                status={p.status}
                pricePerPerson={p.price_per_person}
                currency={p.currency}
                priceNote={null}
                owner={showOwnerUI}
                onSave={saveProjectPatch}
              />
              <AtelierRatings ratings={p.ratings} />
              <AtelierHost host={p.host} />
              <AtelierOperator
                contact={operatorContact}
                brandLogoUrl={ownerInfo?.brand_logo_url}
                brandTagline={ownerInfo?.brand_tagline}
                hostAvatarUrl={p.host?.avatarUrl}
              />
              <AtelierCTA
                tripTitle={p.title}
                shareUrl={shareUrl}
                contact={operatorContact}
              />
              {activeStatusBlocks}
              <AtelierTerms
                terms={p.terms}
                owner={showOwnerUI}
                onSave={(v) => saveProjectPatch({ terms: v })}
                slug={slug}
                businessName={ownerInfo?.business_name}
              />
              <AtelierStickyCTA
                projectId={p.id}
                status={p.status}
                pricePerPerson={p.price_per_person}
                currency={p.currency}
                contact={operatorContact}
              />
            </ThemeRoot>
          )
        }

        // Default: Journal (also used for `custom` until that theme ships)
        return (
          <ThemeRoot theme={theme}>
            <JournalHero
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              project={p as any}
              owner={showOwnerUI}
              heroPhoto={heroPhoto}
              uploadingHero={uploadingByDay['hero'] || 0}
              ownerProfile={ownerInfo}
              onHeroUpload={handleHeroUpload}
              onHeroDelete={handleDelete}
              onSaveProject={saveProjectPatch}
            />
            <JournalNav activeSection={activeSection} />
            <JournalOverview
              description={p.description}
              owner={showOwnerUI}
              onSave={(v) => saveProjectPatch({ description: v })}
              host={p.host}
            />
            <JournalItinerary
              itinerary={itinerary}
              media={media}
              owner={showOwnerUI}
              uploadingByDay={uploadingByDay}
              onUpload={handleUpload}
              onDelete={handleDelete}
              onOpenPhoto={setLightbox}
              onSaveDay={saveDayPatch}
              onSaveSegment={saveSegmentPatch}
              durationLabel={durationLabel}
            />
            <JournalIncluded
              included={p.included}
              notIncluded={p.not_included}
              owner={showOwnerUI}
              onSaveIncluded={(v) => saveProjectPatch({ included: v })}
              onSaveNotIncluded={(v) => saveProjectPatch({ notIncluded: v })}
            />
            <JournalMap locations={locations} />
            <JournalGallery
              media={media}
              owner={showOwnerUI}
              uploading={uploadingByDay['tour'] || 0}
              onUpload={handleUpload}
              onOpenPhoto={setLightbox}
            />
            <JournalPrice
              projectId={p.id}
              status={p.status}
              pricePerPerson={p.price_per_person}
              currency={p.currency}
              priceNote={null}
              owner={showOwnerUI}
              onSave={saveProjectPatch}
            />
            <JournalRatings ratings={p.ratings} />
            <JournalHost host={p.host} businessName={ownerInfo?.business_name} />
            <JournalOperator
              contact={operatorContact}
              brandLogoUrl={ownerInfo?.brand_logo_url}
              brandTagline={ownerInfo?.brand_tagline}
            />
            <JournalCTA
              tripTitle={p.title}
              shareUrl={shareUrl}
              contact={operatorContact}
              status={p.status}
            />
            {activeStatusBlocks}
            <JournalTerms
              terms={p.terms}
              owner={showOwnerUI}
              onSave={(v) => saveProjectPatch({ terms: v })}
              slug={slug}
              businessName={ownerInfo?.business_name}
            />
            <JournalStickyCTA
              projectId={p.id}
              status={p.status}
              pricePerPerson={p.price_per_person}
              currency={p.currency}
              contact={operatorContact}
            />
          </ThemeRoot>
        )
      })()}

      <PhotoLightbox
        media={lightbox}
        owner={showOwnerUI}
        projectId={data.project?.id || null}
        onClose={() => setLightbox(null)}
        onReplaced={(updated) => {
          setMedia((cur) => cur.map((m) => (m.id === updated.id ? updated : m)))
          setLightbox(updated)
        }}
      />

      {showOwnerUI && (
        <>
          <TripCommandBar
            projectId={p.id}
            getToken={getToken}
            onTripUpdated={handleTripUpdated}
          />
          {/* Spacer so the fixed command bar doesn't cover the footer */}
          <div className="h-24 md:h-28" aria-hidden="true" />
        </>
      )}

      {/* Scroll-to-top — visible for all users once scrolled 300px.
          Owner has a fixed bottom command bar (~72px), so offset higher. */}
      <ScrollToTop bottomOffset={showOwnerUI ? 88 : 24} />
    </div>
  )
}
