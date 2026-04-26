'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Trash2, Eye, EyeOff, FileText, Upload, X } from 'lucide-react'

import ActivateButton from '@/components/activate-button'
import ActivationToast from '@/components/activation-toast'
import PhotosBlock from '@/components/photos-block'
import PhotoLightbox from '@/components/photo-lightbox'
import Header from '@/components/header'
import { TripCommandBar } from '@/components/trip/trip-command-bar'
import { TripActionBar } from '@/components/trip/trip-action-bar'
import { ArchiveDialog } from '@/components/trip/archive-dialog'
import { EditableField } from '@/components/editable/editable-field'

import { ThemeRoot } from '@/components/trip/theme-root'
import { TripNav } from '@/components/trip/nav'
import { TripHero } from '@/components/trip/hero'
import { TripOverview } from '@/components/trip/overview'
import { TripItinerary } from '@/components/trip/itinerary'
import { TripIncluded, IncludedList } from '@/components/trip/included'
import { TripPrice } from '@/components/trip/price'
import { TripTerms } from '@/components/trip/terms'
import { HeroOwnerOverlay, HeroDropZone } from '@/components/trip/owner-extras'

import { apiFetch } from '@/lib/api'
import { resolveTheme } from '@/lib/themes'
import { UI } from '@/lib/ui-strings'
import {
  fmtDateRange,
  fmtPrice,
  coercePrice,
  todayISO,
  addDaysISO,
} from '@/lib/trip-format'
import { useTripMutations } from '@/hooks/use-trip-mutations'
import { usePhotoUpload, type MediaRecord } from '@/hooks/use-photo-upload'
import { useTripData } from '@/hooks/use-trip-data'

type Location = {
  id: string; name: string; type: string
  latitude: string; longitude: string
  day_number: number; notes: string | null
}

type Props = {
  slug: string
  initialData: { project: Record<string, any>; tasks: any[]; locations: Location[]; media: any[] } | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://waytico-web.onrender.com'

export default function TripPageClient({ slug, initialData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, getToken, isLoaded } = useAuth()

  const [data, setData] = useState(initialData)
  const [showBanner, setShowBanner] = useState(false)
  const [isAnonCreator, setIsAnonCreator] = useState(false)
  const [projectIdForClaim, setProjectIdForClaim] = useState<string | null>(null)
  const [ownerRefreshKey, setOwnerRefreshKey] = useState(0)

  // Show sticky banner for anon-owned projects until dismissed or claimed.
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

  // Claim flow: after sign-up, redirect back with ?claim=projectId
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

  // ─── Photos / owner state ──────────────────────────────────
  const [isOwner, setIsOwner] = useState(false)
  const [previewAsClient, setPreviewAsClient] = useState(false)
  const showOwnerUI = isOwner && !previewAsClient
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [media, setMedia] = useState<MediaRecord[]>(
    (initialData?.media as MediaRecord[]) || [],
  )
  const [tasks, setTasks] = useState<any[]>(initialData?.tasks || [])
  const [lightbox, setLightbox] = useState<MediaRecord | null>(null)
  const [heroDragOver, setHeroDragOver] = useState(false)
  const [docDragOver, setDocDragOver] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const heroInputRef = useRef<HTMLInputElement | null>(null)
  const docInputRef = useRef<HTMLInputElement | null>(null)

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
    setData: setData as any,
    setTasks: setTasks as any,
  })

  const handleDeleteProject = useCallback(async () => {
    const title = data?.project?.title || 'this trip'
    await _handleDeleteProject(title)
  }, [_handleDeleteProject, data?.project?.title])

  useEffect(() => {
    if (isOwner) return
    if (initialData?.media) setMedia(initialData.media as MediaRecord[])
    if (initialData?.tasks) setTasks(initialData.tasks)
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

  const { uploadingByDay, handleUpload, handleDelete, handleHeroUpload } = usePhotoUpload({
    projectId: data?.project?.id,
    media,
    setMedia,
  })

  // ─── Visibility toggles (owner only) ──────────────────────────
  const toggleTaskVisibility = useCallback(
    async (taskId: string, nextVisible: boolean) => {
      const prev = tasks
      setTasks((cur) => cur.map((t) => (t.id === taskId ? { ...t, visible_to_client: nextVisible } : t)))
      try {
        const token = await getToken()
        const res = await apiFetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ visibleToClient: nextVisible }),
        })
        if (!res.ok) throw new Error(`PATCH task failed (${res.status})`)
        toast.success(nextVisible ? 'Visible to client' : 'Hidden from client')
      } catch (err: any) {
        setTasks(prev)
        toast.error(err?.message || 'Could not update task')
      }
    },
    [tasks, getToken],
  )

  const toggleMediaVisibility = useCallback(
    async (mediaId: string, nextVisible: boolean) => {
      const prev = media
      setMedia((cur) => cur.map((m) => (m.id === mediaId ? ({ ...m, visible_to_client: nextVisible } as MediaRecord) : m)))
      try {
        const token = await getToken()
        const res = await apiFetch(`/api/media/${mediaId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({ visibleToClient: nextVisible }),
        })
        if (!res.ok) throw new Error(`PATCH media failed (${res.status})`)
        toast.success(nextVisible ? 'Visible to client' : 'Hidden from client')
      } catch (err: any) {
        setMedia(prev)
        toast.error(err?.message || 'Could not update document')
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
        const res = await apiFetch(`/api/media/${mediaId}`, { method: 'DELETE', token })
        if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`)
        toast.success('Document removed')
      } catch (err: any) {
        setMedia(prev)
        toast.error(err?.message || 'Could not delete document')
      }
    },
    [media, getToken],
  )

  // ─── Document upload (owner only) ─────────────────────────────
  const DOC_MIMES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
  ]
  const DOC_MAX_SIZE = 10 * 1024 * 1024

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
                (c: any) => c.action === 'created' || c.action === 'task_created',
              ).length
            : 0
          toast.success(
            appliedCount > 0
              ? `Uploaded — ${appliedCount} item${appliedCount === 1 ? '' : 's'} added to itinerary`
              : 'Document uploaded',
          )
        } catch (err: any) {
          toast.error(err?.message || `Upload failed: ${file.name}`)
        } finally {
          setUploadingDoc(false)
        }
      }
      try {
        const pubRes = await fetch(`${API_URL}/api/public/projects/${slug}`, { cache: 'no-store' })
        if (pubRes.ok) setData(await pubRes.json())
      } catch {}
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
            <a href="/" className="text-accent hover:underline">← Back to home</a>
          </>
        )}
      </div>
    )
  }

  const p = data.project
  const itinerary: any[] = Array.isArray(p.itinerary) ? p.itinerary : []
  const shareUrl = `${APP_URL}/t/${slug}`
  const ed = showOwnerUI

  // TZ-6 §3: NUMERIC arrives from PostgreSQL as string ("3450.00") — coerce
  // exactly once at the top of trip-page-client before forwarding to children.
  const pricePerPersonNum = coercePrice(p.price_per_person)
  const priceTotalNum = coercePrice(p.price_total)
  const priceFormatted = fmtPrice(pricePerPersonNum, p.currency)
  const totalFormatted = fmtPrice(priceTotalNum, p.currency)
  const dateRange = fmtDateRange(p.dates_start, p.dates_end)

  const resolvedTheme = resolveTheme(p.design_theme)
  const heroPhoto = media.find((m) => m.placement === 'hero') || null
  const hasHeroBg = !!heroPhoto

  const today = todayISO()
  const validUntil = addDaysISO(today, 7)

  // ── Slot builders (owner mode wraps with EditableField, public uses static values) ──

  const titleSlot: ReactNode = ed ? (
    <EditableField
      as="text"
      editable
      value={p.title}
      required
      className="w-full"
      onSave={(v) => saveProjectPatch({ title: v })}
    />
  ) : (
    p.title || ''
  )

  const firstParagraph = (text: string | null | undefined): string | null => {
    if (!text) return null
    const para = text.split('\n\n')[0]
    return para || null
  }

  const overviewBodySlot: ReactNode = ed ? (
    <EditableField
      as="multiline"
      editable
      value={p.description}
      placeholder="Click to add overview"
      rows={5}
      className="w-full"
      onSave={(v) => saveProjectPatch({ description: v })}
    />
  ) : (
    <DescriptionParagraphs text={p.description} />
  )

  const heroDescriptionSlot: ReactNode = (() => {
    const para = firstParagraph(p.description)
    if (ed) {
      // Show first paragraph plain — full editing happens in Overview body.
      return para ? <span>{para}</span> : null
    }
    return para
  })()

  const activityChipSlot: ReactNode | null =
    p.activity_type || ed ? (
      <span className="tp-chip">
        {ed ? (
          <EditableField
            as="text"
            editable
            value={p.activity_type}
            placeholder="Add type"
            maxLength={40}
            className="uppercase"
            onSave={(v) => saveProjectPatch({ activityType: v })}
          />
        ) : (
          p.activity_type
        )}
      </span>
    ) : null

  const regionEyebrowSlot: ReactNode | null =
    p.region || p.country || ed ? (
      <span className="tp-eyebrow">
        {ed ? (
          <>
            <EditableField
              as="text"
              editable
              value={p.region}
              placeholder="Region"
              onSave={(v) => saveProjectPatch({ region: v })}
            />
            {(p.country || ed) && (
              <>
                {p.region ? ', ' : ''}
                <EditableField
                  as="text"
                  editable
                  value={p.country}
                  placeholder="Country"
                  onSave={(v) => saveProjectPatch({ country: v })}
                />
              </>
            )}
          </>
        ) : (
          [p.region, p.country].filter(Boolean).join(', ').toUpperCase()
        )}
      </span>
    ) : null

  // Render an Included list block — owner mode: EditableField; public mode: parsed list.
  const includedBodySlot: ReactNode = (() => {
    if (ed) {
      return (
        <EditableField
          as="multiline"
          editable
          value={p.included}
          placeholder="Click to add — one item per line"
          rows={5}
          className="w-full"
          onSave={(v) => saveProjectPatch({ included: v })}
          renderDisplay={(val: string) => <IncludedList source={val} kind="in" />}
        />
      )
    }
    return <IncludedList source={p.included} kind="in" />
  })()

  const notIncludedBodySlot: ReactNode = (() => {
    if (ed) {
      return (
        <EditableField
          as="multiline"
          editable
          value={p.not_included}
          placeholder="Click to add — one item per line"
          rows={5}
          className="w-full"
          onSave={(v) => saveProjectPatch({ notIncluded: v })}
          renderDisplay={(val: string) => <IncludedList source={val} kind="out" />}
        />
      )
    }
    return <IncludedList source={p.not_included} kind="out" />
  })()

  const includedVisible = ed || !!(p.included && p.included.trim()) || !!(p.not_included && p.not_included.trim())

  // Price slot — owner: editable currency + amount. Public: pre-formatted string.
  const priceAmountSlot: ReactNode = (() => {
    if (ed) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
          <EditableField
            as="text"
            editable
            value={p.currency || 'USD'}
            maxLength={3}
            className="uppercase"
            onSave={(v) => saveProjectPatch({ currency: v.toUpperCase() })}
          />
          <EditableField
            as="number"
            editable
            value={pricePerPersonNum}
            placeholder="Price"
            min={0}
            step={1}
            onSave={(v) => saveProjectPatch({ pricePerPerson: v })}
          />
        </span>
      )
    }
    return priceFormatted
  })()

  const priceCtaSlot: ReactNode | null = (() => {
    if (p.status === 'quoted' && p.id) {
      return <ActivateButton projectId={p.id} publicStatus={p.status} />
    }
    return null
  })()

  const priceVisible = ed || pricePerPersonNum != null

  const termsBodySlot: ReactNode = ed ? (
    <EditableField
      as="multiline"
      editable
      value={p.terms}
      placeholder="Click to add terms"
      rows={4}
      className="w-full"
      onSave={(v) => saveProjectPatch({ terms: v })}
    />
  ) : (
    <DescriptionParagraphs text={p.terms} />
  )

  const termsVisible = ed || !!(p.terms && p.terms.trim())

  const overviewVisible = ed || !!(p.description && p.description.trim())

  // ── Itinerary slot renderers ──
  const renderDayTitle = (day: any): ReactNode =>
    ed ? (
      <EditableField
        as="text"
        editable
        value={day.title}
        required
        className="w-full"
        onSave={(v) => (day.id ? saveDayPatch(day.id, { title: v }) : Promise.resolve(false))}
      />
    ) : (
      day.title || ''
    )

  const renderDayDescription = (day: any): ReactNode => {
    if (ed) {
      return (
        <EditableField
          as="multiline"
          editable
          value={day.description}
          placeholder="Click to add a short summary of this day"
          rows={2}
          className="w-full"
          onSave={(v) => (day.id ? saveDayPatch(day.id, { description: v }) : Promise.resolve(false))}
        />
      )
    }
    return day.description || null
  }

  const renderSegmentTitle = (day: any, s: any): ReactNode =>
    ed ? (
      <EditableField
        as="text"
        editable
        value={s.title}
        required
        className="w-full"
        onSave={(v) =>
          day.id && s.id ? saveSegmentPatch(day.id, s.id, { title: v }) : Promise.resolve(false)
        }
      />
    ) : (
      s.title || ''
    )

  const renderDayExtras = (day: any): ReactNode => {
    if (!ed && !day.id) return null
    const dayMedia = media.filter((m) => m.day_id && m.day_id === day.id)
    if (!day.id || (!ed && dayMedia.length === 0)) return null
    return (
      <div style={{ marginTop: 16 }}>
        <PhotosBlock
          dayId={day.id}
          media={dayMedia}
          owner={ed}
          uploading={uploadingByDay[day.id] || 0}
          onUpload={handleUpload}
          onDelete={handleDelete}
          onOpen={setLightbox}
        />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Owner chrome — outside ThemeRoot so it uses shadcn semantic tokens
          (per TZ-6 §11 — owner UI must work even on a dark Expedition theme). */}
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
        />
      )}

      {showOwnerUI && p.id && (
        <ArchiveDialog
          open={archiveOpen}
          projectId={p.id}
          projectTitle={p.title}
          currentContact={{ name: p.client_name, email: p.client_email, phone: p.client_phone }}
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
              <span>You're previewing as your client sees this page.</span>
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
          <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
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
              <span className="hidden sm:inline"> to edit, add photos, and save to your account.</span>
              <span className="sm:hidden"> to save.</span>
            </p>
            <button
              onClick={() => {
                try {
                  sessionStorage.setItem(`waytico:banner-dismissed-${projectIdForClaim}`, '1')
                } catch {}
                setShowBanner(false)
              }}
              className="p-1 text-foreground/50 hover:text-foreground transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Themed surface — switching data-theme reflows tokens in styles/themes.css.
          Owner edit UX rides through via slot props; structural variants
          (split/overlay/card hero, timeline/photo-cards/grid itinerary) live
          inside Hero.tsx / Itinerary.tsx as `if (heroStyle === ...)` branches. */}
      <ThemeRoot theme={p.design_theme}>
        <TripNav />

        <HeroDropZone
          enabled={showOwnerUI}
          onDrop={(files) => handleHeroUpload(files)}
          onDragOver={() => setHeroDragOver(true)}
          onDragLeave={() => setHeroDragOver(false)}
        >
          <TripHero
            theme={resolvedTheme}
            heroPhoto={heroPhoto?.url || null}
            status={!showOwnerUI ? p.status : null}
            dateRange={dateRange}
            durationDays={p.duration_days}
            groupSize={p.group_size}
            pricePerPersonFormatted={priceFormatted}
            activityChipSlot={activityChipSlot}
            regionEyebrowSlot={regionEyebrowSlot}
            titleSlot={titleSlot}
            descriptionSlot={heroDescriptionSlot}
            ownerOverlay={
              showOwnerUI ? (
                <HeroOwnerOverlay
                  hasBg={hasHeroBg}
                  uploadingHero={uploadingByDay['hero'] || 0}
                  heroPhotoId={heroPhoto?.id || null}
                  onDelete={() => heroPhoto && handleDelete(heroPhoto.id)}
                  onPickFile={() => heroInputRef.current?.click()}
                  dragOver={heroDragOver}
                  emptyState={!hasHeroBg}
                />
              ) : undefined
            }
          />
        </HeroDropZone>

        {showOwnerUI && (
          <input
            ref={heroInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files
              if (files && files.length > 0) {
                const list = Array.from(files).filter(
                  (f) =>
                    ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) &&
                    f.size <= 15 * 1024 * 1024,
                )
                if (list.length !== files.length) {
                  toast.error('Some files skipped — use JPEG/PNG/WebP, max 15MB')
                }
                if (list.length) handleHeroUpload(list)
              }
              e.target.value = ''
            }}
          />
        )}

        <TripOverview
          dateRange={dateRange}
          durationDays={p.duration_days}
          groupSize={p.group_size}
          activityType={p.activity_type}
          region={p.region}
          country={p.country}
          bodySlot={overviewBodySlot}
          visible={overviewVisible}
        />

        <TripItinerary
          theme={resolvedTheme}
          itinerary={itinerary as any}
          media={media as any}
          renderDayTitle={renderDayTitle}
          renderDayDescription={renderDayDescription}
          renderSegmentTitle={renderSegmentTitle}
          renderDayExtras={renderDayExtras}
        />

        <TripIncluded
          includedBodySlot={includedBodySlot}
          notIncludedBodySlot={notIncludedBodySlot}
          visible={includedVisible}
        />

        <TripPrice
          amountSlot={priceAmountSlot}
          totalFormatted={totalFormatted}
          groupSize={p.group_size}
          ctaSlot={priceCtaSlot}
          visible={priceVisible}
        />

        <TripTerms
          bodySlot={termsBodySlot}
          proposalISO={today}
          validUntilISO={validUntil}
          visible={termsVisible}
        />

        {/* Active-trip sections — render as themed sections that reuse the
            tokenised palette but keep their existing edit affordances. */}
        {p.status === 'active' && (
          <ActiveSections
            tasks={tasks}
            media={media}
            showOwnerUI={showOwnerUI}
            uploadingDoc={uploadingDoc}
            docDragOver={docDragOver}
            setDocDragOver={setDocDragOver}
            docInputRef={docInputRef}
            saveTaskPatch={saveTaskPatch}
            toggleTaskVisibility={toggleTaskVisibility}
            toggleMediaVisibility={toggleMediaVisibility}
            deleteDocument={deleteDocument}
            handleDocumentUpload={handleDocumentUpload}
          />
        )}

        {/* What-to-bring — kept inside themed surface so colours track theme. */}
        {((p.what_to_bring?.length > 0) || showOwnerUI) && (
          <WhatToBringSection
            categories={p.what_to_bring || []}
            showOwnerUI={showOwnerUI}
            saveWhatToBring={saveWhatToBring}
          />
        )}
      </ThemeRoot>

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
          <TripCommandBar projectId={p.id} getToken={getToken} onTripUpdated={handleTripUpdated} />
          <div className="h-24 md:h-28" aria-hidden="true" />
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Helpers — kept in the same file to avoid further fragmentation.
// ─────────────────────────────────────────────────────────────────

function DescriptionParagraphs({ text }: { text: string | null | undefined }) {
  if (!text) return null
  const paras = text.split('\n\n').filter(Boolean)
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} style={{ marginTop: i === 0 ? 0 : '1em' }}>
          {p}
        </p>
      ))}
    </>
  )
}

function ActiveSections({
  tasks,
  media,
  showOwnerUI,
  uploadingDoc,
  docDragOver,
  setDocDragOver,
  docInputRef,
  saveTaskPatch,
  toggleTaskVisibility,
  toggleMediaVisibility,
  deleteDocument,
  handleDocumentUpload,
}: {
  tasks: any[]
  media: any[]
  showOwnerUI: boolean
  uploadingDoc: boolean
  docDragOver: boolean
  setDocDragOver: (v: boolean) => void
  docInputRef: React.RefObject<HTMLInputElement>
  saveTaskPatch: (id: string, patch: Record<string, any>) => Promise<boolean>
  toggleTaskVisibility: (id: string, next: boolean) => void
  toggleMediaVisibility: (id: string, next: boolean) => void
  deleteDocument: (id: string) => void
  handleDocumentUpload: (files: File[]) => void
}) {
  const allTasks = Array.isArray(tasks) ? tasks : []
  const visibleForClient = allTasks.filter((t: any) => t.visible_to_client !== false)
  const renderTaskList = showOwnerUI ? allTasks : visibleForClient

  const allDocs = (Array.isArray(media) ? media : []).filter((m: any) => m.type === 'document')
  const visibleDocs = allDocs.filter((m: any) => m.visible_to_client !== false)
  const renderDocs = showOwnerUI ? allDocs : visibleDocs

  return (
    <>
      {renderTaskList.length > 0 && (
        <section className="tp-section">
          <div className="tp-container">
            <header className="tp-section-head">
              <h2 className="tp-display tp-section-title">Before you go</h2>
            </header>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...renderTaskList]
                .sort((a: any, b: any) => {
                  const ad = a.deadline || '9999-12-31'
                  const bd = b.deadline || '9999-12-31'
                  if (ad !== bd) return ad.localeCompare(bd)
                  return (a.sort_order ?? 0) - (b.sort_order ?? 0)
                })
                .map((t: any) => {
                  const hidden = t.visible_to_client === false
                  return (
                    <div
                      key={t.id}
                      className="tp-incl-card"
                      style={{ opacity: hidden ? 0.6 : 1 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 18 }}>
                          <EditableField
                            as="text"
                            editable={showOwnerUI}
                            value={t.title}
                            required
                            className="w-full"
                            onSave={(v) => saveTaskPatch(t.id, { title: v })}
                          />
                        </h3>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {t.deadline && (
                            <span style={{ fontSize: 12, color: 'var(--ink-mute)' }}>
                              by {new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {showOwnerUI && (
                            <button
                              type="button"
                              onClick={() => toggleTaskVisibility(t.id, hidden)}
                              style={{ background: 'transparent', border: 0, color: 'var(--ink-mute)', cursor: 'pointer' }}
                              aria-label={hidden ? 'Show to client' : 'Hide from client'}
                            >
                              {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                      {(t.description || showOwnerUI) && (
                        <div style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-soft)' }}>
                          <EditableField
                            as="multiline"
                            editable={showOwnerUI}
                            value={t.description}
                            placeholder="Click to add details"
                            rows={2}
                            className="w-full"
                            onSave={(v) => saveTaskPatch(t.id, { description: v })}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        </section>
      )}

      {(renderDocs.length > 0 || showOwnerUI) && (
        <section className="tp-section">
          <div className="tp-container">
            <header className="tp-section-head">
              <h2 className="tp-display tp-section-title">Documents</h2>
              {showOwnerUI && (
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  disabled={uploadingDoc}
                  style={{ background: 'transparent', color: 'var(--accent)', border: 0, cursor: 'pointer', fontSize: 13 }}
                >
                  <Upload className="inline w-3.5 h-3.5 mr-1" /> {uploadingDoc ? 'Uploading…' : 'Add document'}
                </button>
              )}
            </header>

            {showOwnerUI && (
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.docx,.xlsx,image/jpeg,image/png"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  e.target.value = ''
                  if (files.length > 0) void handleDocumentUpload(files)
                }}
              />
            )}

            {showOwnerUI && (
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDocDragOver(true)
                }}
                onDragLeave={() => setDocDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDocDragOver(false)
                  const files = Array.from(e.dataTransfer.files || [])
                  if (files.length > 0) void handleDocumentUpload(files)
                }}
                style={{
                  marginBottom: 16,
                  padding: 24,
                  textAlign: 'center',
                  border: docDragOver
                    ? '2px dashed var(--accent)'
                    : '2px dashed var(--rule)',
                  background: docDragOver ? 'var(--chip-bg)' : 'transparent',
                  color: docDragOver ? 'var(--accent)' : 'var(--ink-mute)',
                  borderRadius: 'var(--r-card)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
                onClick={() => docInputRef.current?.click()}
              >
                {uploadingDoc ? (
                  <span>Uploading & parsing…</span>
                ) : (
                  <>
                    <FileText className="w-5 h-5" style={{ display: 'inline', marginBottom: 4 }} />
                    <div>Drop a booking, voucher or ticket here</div>
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>
                      PDF · DOCX · XLSX · JPEG · PNG — auto-applied to itinerary
                    </div>
                  </>
                )}
              </div>
            )}

            {renderDocs.length > 0 ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {renderDocs.map((m: any) => {
                  const hidden = m.visible_to_client === false
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        border: '1px solid var(--rule)',
                        borderRadius: 'var(--r-card)',
                        opacity: hidden ? 0.6 : 1,
                      }}
                    >
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, color: 'var(--ink)' }}
                      >
                        <FileText className="w-4 h-4" style={{ color: 'var(--ink-mute)', flexShrink: 0 }} />
                        <span style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.caption || m.file_name || 'Document'}
                        </span>
                      </a>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent)', fontSize: 12, padding: '0 8px' }}
                        >
                          Download ↗
                        </a>
                        {showOwnerUI && (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleMediaVisibility(m.id, hidden)}
                              style={{ background: 'transparent', border: 0, color: 'var(--ink-mute)', cursor: 'pointer', padding: 4 }}
                              aria-label={hidden ? 'Show to client' : 'Hide from client'}
                            >
                              {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteDocument(m.id)}
                              style={{ background: 'transparent', border: 0, color: 'var(--ink-mute)', cursor: 'pointer', padding: 4 }}
                              aria-label="Delete document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              showOwnerUI && (
                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-mute)', padding: '8px 0' }}>
                  No documents yet.
                </p>
              )
            )}
          </div>
        </section>
      )}
    </>
  )
}

function WhatToBringSection({
  categories,
  showOwnerUI,
  saveWhatToBring,
}: {
  categories: any[]
  showOwnerUI: boolean
  saveWhatToBring: (next: any[]) => Promise<boolean>
}) {
  return (
    <section className="tp-section">
      <div className="tp-container">
        <header className="tp-section-head">
          <h2 className="tp-display tp-section-title">What to bring</h2>
        </header>
        <div className="tp-incl-grid">
          {categories.map((cat: any, i: number) => {
            const itemStrings: string[] = (cat.items || [])
              .map((x: any) => (typeof x === 'string' ? x : x?.name || x?.item || ''))
              .filter(Boolean)
            const joined = itemStrings.join('\n')
            return (
              <div key={i} className="tp-incl-card">
                <h4>
                  <EditableField
                    as="text"
                    editable={showOwnerUI}
                    value={cat.category}
                    required
                    className="w-full"
                    onSave={(v) => {
                      const next = categories.map((c: any, idx: number) =>
                        idx === i
                          ? { category: v, items: itemStrings }
                          : {
                              category: c.category,
                              items: (c.items || [])
                                .map((x: any) =>
                                  typeof x === 'string' ? x : x?.name || x?.item || '',
                                )
                                .filter(Boolean),
                            },
                      )
                      return saveWhatToBring(next)
                    }}
                  />
                </h4>
                <EditableField
                  as="multiline"
                  editable={showOwnerUI}
                  value={joined}
                  placeholder="Click to add items — one per line"
                  rows={Math.max(3, itemStrings.length)}
                  className="w-full"
                  onSave={(v: string) => {
                    const newItems = v
                      .split('\n')
                      .map((s) => s.replace(/^[-•·]\s*/, '').trim())
                      .filter(Boolean)
                    const next = categories.map((c: any, idx: number) =>
                      idx === i
                        ? { category: cat.category, items: newItems }
                        : {
                            category: c.category,
                            items: (c.items || [])
                              .map((x: any) =>
                                typeof x === 'string' ? x : x?.name || x?.item || '',
                              )
                              .filter(Boolean),
                          },
                    )
                    return saveWhatToBring(next)
                  }}
                  renderDisplay={() => (
                    <ul>
                      {itemStrings.map((item, j) => (
                        <li key={j}>
                          <span className="mk">·</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
