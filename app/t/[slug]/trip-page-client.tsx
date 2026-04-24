'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { ImagePlus, Trash2, Check, X, Eye, EyeOff, FileText, Upload } from 'lucide-react'
import ActivateButton from '@/components/activate-button'
import ActivationToast from '@/components/activation-toast'
import ShareMenu from '@/components/share-menu'
import PhotosBlock from '@/components/photos-block'
import PhotoLightbox from '@/components/photo-lightbox'
import Header from '@/components/header'
import { TripCommandBar } from '@/components/trip/trip-command-bar'
import { TripActionBar } from '@/components/trip/trip-action-bar'
import { ArchiveDialog } from '@/components/trip/archive-dialog'
import { EditableField } from '@/components/editable/editable-field'
import { apiFetch } from '@/lib/api'
import { getStatusMeta } from '@/lib/trip-status'
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
      // Remove ?claim from URL
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

  // Trip-level data flows (polling, owner-detect, post-AI refresh) in a hook.
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

  // Mutation helpers (PATCH project / task / day / segment, PUT what-to-bring, DELETE project)
  // live in a shared hook so they can be reused and tested independently.
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

  // Thin wrapper so call sites don't need to pass title — it lives here.
  const handleDeleteProject = useCallback(async () => {
    const title = data?.project?.title || 'this trip'
    await _handleDeleteProject(title)
  }, [_handleDeleteProject, data?.project?.title])

  // Sync media/tasks when initialData changes (e.g., after polling completes).
  // Only applies when we don't have the richer owner payload yet.
  useEffect(() => {
    if (isOwner) return
    if (initialData?.media) setMedia(initialData.media as MediaRecord[])
    if (initialData?.tasks) setTasks(initialData.tasks)
  }, [initialData, isOwner])

  // Keep `data.project` in sync with the SSR payload. When a parent `router.refresh()`
  // re-fetches the trip (e.g. after Stripe activation redirect), the server returns
  // updated status/fields; without this sync the client would keep showing the old
  // status because `useState(initialData)` only reads the prop on first render.
  useEffect(() => {
    if (!initialData?.project) return
    setData((prev) => {
      if (!prev?.project) return initialData
      // Only replace if the server version is actually newer / different in a
      // user-visible way. We intentionally keep owner-side overlays (tasks/media
      // from /full) since those are managed via their own setters.
      return { ...prev, project: initialData.project }
    })
  }, [initialData])

  // External trigger: ActivationToast (and anyone else) dispatches
  // `waytico:trip-refresh` when they want the owner-side /full payload
  // (tasks, media) re-fetched on top of the SSR refresh.
  useEffect(() => {
    const handler = () => setOwnerRefreshKey((k) => k + 1)
    window.addEventListener('waytico:trip-refresh', handler)
    return () => window.removeEventListener('waytico:trip-refresh', handler)
  }, [])

  // Photo upload / delete / hero replace + per-key uploading counter.
  // handleTripUpdated is provided by useTripData above.
  const {
    uploadingByDay,
    handleUpload,
    handleDelete,
    handleHeroUpload,
  } = usePhotoUpload({
    projectId: data?.project?.id,
    media,
    setMedia,
  })


  // ─── Visibility toggles (owner only) ──────────────────────────
  const toggleTaskVisibility = useCallback(
    async (taskId: string, nextVisible: boolean) => {
      const prev = tasks
      // Optimistic
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
      } catch (err: any) {
        setTasks(prev)
        toast.error(err?.message || 'Could not update task')
      }
    },
    [tasks, getToken],
  )

  // Inline-edit helper for tasks. Updates local tasks[] optimistically on success.
  // (moved into useTripMutations hook)

  // Inline-edit helper for a single day's scalar fields.
  // Server uses SELECT FOR UPDATE so concurrent edits are race-safe.
  // (moved into useTripMutations hook)

  // Inline-edit helper for a single segment.
  // (moved into useTripMutations hook)

  // Full-array replace helper for what_to_bring. Race-safe via SELECT FOR UPDATE on the server.
  // (moved into useTripMutations hook)

  // Delete project. Uses a simple confirm prompt for now — if user agrees,
  // calls DELETE /api/projects/:id and navigates back to dashboard.
  // (moved into useTripMutations hook — a thin wrapper above forwards title.)

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
        const res = await apiFetch(`/api/media/${mediaId}`, {
          method: 'DELETE',
          token,
        })
        if (!res.ok && res.status !== 204) {
          throw new Error(`Delete failed (${res.status})`)
        }
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

      // Refresh — auto-apply may have added segments + tasks. Refetch both public trip data and owner payload.
      try {
        const pubRes = await fetch(`${API_URL}/api/public/projects/${slug}`, { cache: 'no-store' })
        if (pubRes.ok) setData(await pubRes.json())
      } catch {
        /* ignore */
      }
      await refreshOwnerData()
    },
    [data?.project?.id, getToken, slug, refreshOwnerData],
  )
  // ──────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────

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
  const itinerary: any[] = p.itinerary || []
  const shareUrl = `${APP_URL}/t/${slug}`

  return (
    <div className="min-h-screen bg-background">
      {/* Global header only for the trip owner. Clients/guests see a clean,
          agency-proposal-style page without the Waytico SaaS chrome. */}
      {showOwnerUI && <Header />}

      {/* Owner action bar: status + state action on the left, agent tools on the right.
          Hidden in preview mode (client view) and for non-owners. */}
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

      {/* Archive-with-client-contact modal */}
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

      {/* Stripe return flow (?activated=1 / ?cancelled=1) */}
      <ActivationToast />

      {/* Preview-as-client banner — active when owner clicked "Preview as client" */}
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

      {/* Sticky save-reminder banner for anonymous owners (quoted status) */}
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

      {/* Hero */}
      {(() => {
        const heroPhoto = media.find((m) => m.placement === 'hero')
        const hasBg = !!heroPhoto
        const uploadingHero = uploadingByDay['hero'] || 0
        const showEmptyState = !hasBg && showOwnerUI
        const heroDropHandlers = showOwnerUI
          ? {
              onDragEnter: (e: React.DragEvent) => {
                e.preventDefault()
                if (e.dataTransfer?.types?.includes('Files')) setHeroDragOver(true)
              },
              onDragOver: (e: React.DragEvent) => {
                e.preventDefault()
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
              },
              onDragLeave: (e: React.DragEvent) => {
                if (e.currentTarget === e.target) setHeroDragOver(false)
              },
              onDrop: (e: React.DragEvent) => {
                e.preventDefault()
                setHeroDragOver(false)
                const files = e.dataTransfer?.files
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
              },
            }
          : {}

        const openHeroPicker = () => heroInputRef.current?.click()

        return (
          <section
            {...heroDropHandlers}
            className={`group relative overflow-hidden py-16 md:py-24 ${
              hasBg ? 'bg-foreground' : 'bg-secondary'
            } ${showEmptyState ? 'border-2 border-dashed border-border' : ''} ${
              heroDragOver ? 'ring-4 ring-accent ring-inset' : ''
            }`}
          >
            {hasBg && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroPhoto.url}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                />
                {/* Dark gradient overlay for text legibility */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/70" />
              </>
            )}

            {/* Top-right desktop: Activate + Share. On mobile these move
                under the title (see block below). Delete-hero stays here
                at all sizes — it's a small icon that doesn't crowd. */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {showOwnerUI && hasBg && heroPhoto && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(heroPhoto.id)
                  }}
                  className="rounded-full bg-black/60 p-2 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Delete hero photo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Drop indicator when dragging files */}
            {heroDragOver && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40">
                <div className="rounded-full bg-white/95 px-5 py-2 text-sm font-medium text-foreground shadow-lg">
                  Drop photo to set as hero
                </div>
              </div>
            )}

            {/* Hidden file input shared by empty-state click + drop pipeline */}
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

            <div
              className={`relative max-w-3xl mx-auto px-4 text-center space-y-6 ${hasBg ? 'text-white' : ''}`}
            >
              <div className="flex flex-wrap items-center justify-center gap-2">
                {(p.activity_type || showOwnerUI) && (
                  <span
                    className={`inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full ${
                      hasBg
                        ? 'bg-white/15 text-white backdrop-blur-sm'
                        : 'bg-accent/10 text-accent'
                    }`}
                  >
                    <EditableField
                      as="text"
                      editable={showOwnerUI}
                      value={p.activity_type}
                      placeholder="Add activity type"
                      className="uppercase tracking-wider"
                      maxLength={40}
                      onSave={(v) => saveProjectPatch({ activityType: v })}
                    />
                  </span>
                )}
                {!showOwnerUI && ['quoted', 'active', 'completed'].includes(p.status) && (() => {
                  const meta = getStatusMeta(p.status)
                  const cls = hasBg ? 'bg-white/15 text-white backdrop-blur-sm' : meta.chipClass
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full ${cls}`}
                    >
                      {meta.hasDot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                      {meta.label}
                    </span>
                  )
                })()}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-tight">
                <EditableField
                  as="text"
                  editable={showOwnerUI}
                  value={p.title}
                  required
                  className="w-full text-center"
                  onSave={(v) => saveProjectPatch({ title: v })}
                />
              </h1>
              <div
                className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm ${
                  hasBg ? 'text-white/85' : 'text-foreground/60'
                }`}
              >
                {(p.region || p.country || showOwnerUI) && (
                  <span className="inline-flex items-center gap-1">
                    <EditableField
                      as="text"
                      editable={showOwnerUI}
                      value={p.region}
                      placeholder="Region"
                      onSave={(v) => saveProjectPatch({ region: v })}
                    />
                    {(p.country || showOwnerUI) && (
                      <>
                        <span>,</span>
                        <EditableField
                          as="text"
                          editable={showOwnerUI}
                          value={p.country}
                          placeholder="Country"
                          onSave={(v) => saveProjectPatch({ country: v })}
                        />
                      </>
                    )}
                  </span>
                )}
                {(p.duration_days || showOwnerUI) && (
                  <EditableField
                    as="number"
                    editable={showOwnerUI}
                    value={p.duration_days}
                    placeholder="Days"
                    suffix="days"
                    min={1}
                    onSave={(v) => saveProjectPatch({ durationDays: v })}
                  />
                )}
                {(p.group_size || showOwnerUI) && (
                  <EditableField
                    as="number"
                    editable={showOwnerUI}
                    value={p.group_size}
                    placeholder="Group size"
                    suffix="people"
                    min={1}
                    onSave={(v) => saveProjectPatch({ groupSize: v })}
                  />
                )}
                {(p.dates_start || p.dates_end || showOwnerUI) && (
                  <span className="inline-flex items-center gap-1">
                    <EditableField
                      as="date"
                      editable={showOwnerUI}
                      value={p.dates_start}
                      placeholder="Start date"
                      onSave={(v) => saveProjectPatch({ datesStart: v })}
                    />
                    {(p.dates_end || showOwnerUI) && (
                      <>
                        <span>–</span>
                        <EditableField
                          as="date"
                          editable={showOwnerUI}
                          value={p.dates_end}
                          placeholder="End date"
                          onSave={(v) => saveProjectPatch({ datesEnd: v })}
                        />
                      </>
                    )}
                  </span>
                )}
              </div>
              {(p.price_per_person || showOwnerUI) && (
                <div className="pt-2 flex items-baseline justify-center gap-1">
                  <span
                    className={`text-3xl font-serif font-bold ${hasBg ? 'text-white' : 'text-accent'}`}
                  >
                    <EditableField
                      as="text"
                      editable={showOwnerUI}
                      value={p.currency || 'USD'}
                      maxLength={3}
                      className="uppercase"
                      onSave={(v) => saveProjectPatch({ currency: v.toUpperCase() })}
                    />
                  </span>
                  <span
                    className={`text-3xl font-serif font-bold ${hasBg ? 'text-white' : 'text-accent'}`}
                  >
                    <EditableField
                      as="number"
                      editable={showOwnerUI}
                      value={p.price_per_person}
                      placeholder="Price"
                      min={0}
                      step={1}
                      onSave={(v) => saveProjectPatch({ pricePerPerson: v })}
                    />
                  </span>
                  <span className={`ml-1 ${hasBg ? 'text-white/75' : 'text-foreground/50'}`}>
                    per person
                  </span>
                </div>
              )}

              {/* Empty-state CTA: matches PhotosBlock empty button, under the title */}
              {showEmptyState && (
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={openHeroPicker}
                    disabled={uploadingHero > 0}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-border bg-background/60 px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
                  >
                    <ImagePlus className="h-4 w-4" />
                    {uploadingHero > 0 ? 'Uploading…' : 'Add hero photo'}
                  </button>
                </div>
              )}

            </div>

            {/* Uploading indicator when replacing existing hero */}
            {showOwnerUI && hasBg && uploadingHero > 0 && (
              <div className="absolute bottom-4 left-4 z-10">
                <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                  Uploading…
                </span>
              </div>
            )}
          </section>
        )
      })()}

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-16">
        {(p.description || showOwnerUI) && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-4">Overview</h2>
            <EditableField
              as="multiline"
              editable={showOwnerUI}
              value={p.description}
              placeholder="Click to add overview"
              rows={5}
              className="text-foreground/80 leading-relaxed w-full"
              onSave={(v) => saveProjectPatch({ description: v })}
            />
          </section>
        )}

        {(() => {
          const tourMedia = media.filter((m) => !m.day_id && m.placement !== 'hero')
          const showTourPhotos = showOwnerUI || tourMedia.length > 0
          if (!showTourPhotos) return null
          return (
            <section>
              <h2 className="text-2xl font-serif font-bold mb-4">Photos</h2>
              <PhotosBlock
                dayId={null}
                media={tourMedia}
                owner={showOwnerUI}
                uploading={uploadingByDay['tour'] || 0}
                onUpload={handleUpload}
                onDelete={handleDelete}
                onOpen={setLightbox}
                emptyHint="Add photos that represent the whole trip"
              />
            </section>
          )
        })()}

        {itinerary.length > 0 && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">Day-by-Day Itinerary</h2>
            <div className="space-y-6">
              {itinerary.map((day: any, idx: number) => {
                const dayMedia = media.filter((m) => m.day_id && m.day_id === day.id)
                const dayKey = day.id || `day-${day.dayNumber || idx}`
                return (
                  <div key={dayKey} className="border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-sm">
                        {day.dayNumber}
                      </span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          <EditableField
                            as="text"
                            editable={showOwnerUI}
                            value={day.title}
                            required
                            className="w-full"
                            onSave={(v) => (day.id ? saveDayPatch(day.id, { title: v }) : Promise.resolve(false))}
                          />
                        </h3>
                        {(day.description || showOwnerUI) && (
                          <div className="text-foreground/70 text-sm mt-1 leading-relaxed">
                            <EditableField
                              as="multiline"
                              editable={showOwnerUI}
                              value={day.description}
                              placeholder="Click to add a short summary of this day"
                              rows={2}
                              className="w-full"
                              onSave={(v) => (day.id ? saveDayPatch(day.id, { description: v }) : Promise.resolve(false))}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    {day.highlights?.length > 0 && (
                      <div className="pl-[52px] flex flex-wrap gap-2">
                        {day.highlights.map((h: string, i: number) => (
                          <span key={i} className="inline-block px-3 py-1 text-xs bg-secondary rounded-full text-foreground/70">{h}</span>
                        ))}
                      </div>
                    )}
                    {day.accommodation && (
                      <p className="pl-[52px] text-xs text-muted-foreground">
                        {typeof day.accommodation === 'string' ? day.accommodation : day.accommodation.name}
                      </p>
                    )}
                    {Array.isArray(day.segments) && day.segments.length > 0 && (
                      <div className="pl-[52px] pt-2 space-y-3 border-l border-border/50 ml-[18px]">
                        {[...day.segments]
                          .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                          .map((s: any) => (
                            <div key={s.id} className="relative pl-4">
                              <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-accent" />
                              <div className="flex items-baseline gap-3">
                                {(s.startTime || showOwnerUI) && (
                                  <span className="text-xs font-mono text-muted-foreground w-12 flex-shrink-0">
                                    <EditableField
                                      as="text"
                                      editable={showOwnerUI}
                                      value={s.startTime}
                                      placeholder="HH:MM"
                                      maxLength={5}
                                      className="w-full"
                                      onSave={(v) =>
                                        day.id && s.id
                                          ? saveSegmentPatch(day.id, s.id, { startTime: v || null })
                                          : Promise.resolve(false)
                                      }
                                    />
                                  </span>
                                )}
                                <h4 className="font-medium text-sm flex-1">
                                  <EditableField
                                    as="text"
                                    editable={showOwnerUI}
                                    value={s.title}
                                    required
                                    className="w-full"
                                    onSave={(v) =>
                                      day.id && s.id ? saveSegmentPatch(day.id, s.id, { title: v }) : Promise.resolve(false)
                                    }
                                  />
                                </h4>
                              </div>
                              {(s.notes || showOwnerUI) && (
                                <div className={`text-sm text-foreground/70 mt-1 ${s.startTime ? 'ml-[60px]' : ''}`}>
                                  <EditableField
                                    as="multiline"
                                    editable={showOwnerUI}
                                    value={s.notes}
                                    placeholder="Click to add notes"
                                    rows={2}
                                    className="w-full"
                                    onSave={(v) =>
                                      day.id && s.id ? saveSegmentPatch(day.id, s.id, { notes: v || null }) : Promise.resolve(false)
                                    }
                                  />
                                </div>
                              )}
                              {s.location?.name && (
                                <div className={`text-xs text-muted-foreground mt-1 ${s.startTime ? 'ml-[60px]' : ''}`}>
                                  {s.location.name}
                                  {typeof s.location.latitude === 'number' && typeof s.location.longitude === 'number' && (
                                    <a
                                      href={`https://www.google.com/maps?q=${s.location.latitude},${s.location.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-accent hover:underline"
                                    >
                                      Map ↗
                                    </a>
                                  )}
                                </div>
                              )}
                              {s.contact?.phone && (
                                <a
                                  href={`tel:${s.contact.phone}`}
                                  className={`text-xs text-accent hover:underline mt-1 block ${s.startTime ? 'ml-[60px]' : ''}`}
                                >
                                  📞 {s.contact.phone}
                                </a>
                              )}
                              {(s.reference || showOwnerUI) && (
                                <div className={`text-xs font-mono text-muted-foreground mt-1 ${s.startTime ? 'ml-[60px]' : ''}`}>
                                  <EditableField
                                    as="text"
                                    editable={showOwnerUI}
                                    value={s.reference}
                                    placeholder="Ref / booking code"
                                    className="w-full"
                                    onSave={(v) =>
                                      day.id && s.id ? saveSegmentPatch(day.id, s.id, { reference: v || null }) : Promise.resolve(false)
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                    {day.id && (dayMedia.length > 0 || showOwnerUI) && (
                      <div className="pl-[52px] pt-2">
                        <PhotosBlock
                          dayId={day.id}
                          media={dayMedia}
                          owner={showOwnerUI}
                          uploading={uploadingByDay[day.id] || 0}
                          onUpload={handleUpload}
                          onDelete={handleDelete}
                          onOpen={setLightbox}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {(p.included || p.not_included || showOwnerUI) && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">What's Included</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-accent flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-success/15 text-success flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                  Included
                </h3>
                <EditableField
                  as="multiline"
                  editable={showOwnerUI}
                  value={p.included}
                  placeholder="Click to add — one item per line"
                  rows={5}
                  className="w-full text-sm text-foreground/70"
                  onSave={(v) => saveProjectPatch({ included: v })}
                  renderDisplay={(val) => (
                    <ul className="space-y-2">
                      {val.split('\n').filter(Boolean).map((item: string, i: number) => (
                        <li key={i} className="text-sm text-foreground/70 pl-8">{item.replace(/^[-•]\s*/, '')}</li>
                      ))}
                    </ul>
                  )}
                />
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground/70 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                  Not Included
                </h3>
                <EditableField
                  as="multiline"
                  editable={showOwnerUI}
                  value={p.not_included}
                  placeholder="Click to add — one item per line"
                  rows={5}
                  className="w-full text-sm text-foreground/50"
                  onSave={(v) => saveProjectPatch({ notIncluded: v })}
                  renderDisplay={(val) => (
                    <ul className="space-y-2">
                      {val.split('\n').filter(Boolean).map((item: string, i: number) => (
                        <li key={i} className="text-sm text-foreground/50 pl-8">{item.replace(/^[-•]\s*/, '')}</li>
                      ))}
                    </ul>
                  )}
                />
              </div>
            </div>
          </section>
        )}

        {(p.terms || showOwnerUI) && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-4">Terms</h2>
            <EditableField
              as="multiline"
              editable={showOwnerUI}
              value={p.terms}
              placeholder="Click to add terms"
              rows={4}
              className="text-sm text-foreground/60 w-full"
              onSave={(v) => saveProjectPatch({ terms: v })}
            />
          </section>
        )}

        {((p.what_to_bring?.length > 0) || showOwnerUI) && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">What to Bring</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {(p.what_to_bring || []).map((cat: any, i: number) => {
                // items can be strings or objects — normalize to strings for editing + display
                const itemStrings: string[] = (cat.items || []).map((x: any) =>
                  typeof x === 'string' ? x : (x?.name || x?.item || ''),
                ).filter(Boolean)
                const joined = itemStrings.join('\n')
                return (
                  <div key={i} className="space-y-2">
                    <h3 className="font-semibold text-sm">
                      <EditableField
                        as="text"
                        editable={showOwnerUI}
                        value={cat.category}
                        required
                        className="w-full"
                        onSave={(v) => {
                          const next = (p.what_to_bring || []).map((c: any, idx: number) =>
                            idx === i ? { category: v, items: itemStrings } : { category: c.category, items: (c.items || []).map((x: any) => typeof x === 'string' ? x : (x?.name || x?.item || '')).filter(Boolean) }
                          )
                          return saveWhatToBring(next)
                        }}
                      />
                    </h3>
                    <EditableField
                      as="multiline"
                      editable={showOwnerUI}
                      value={joined}
                      placeholder="Click to add items — one per line"
                      rows={Math.max(3, itemStrings.length)}
                      className="w-full"
                      onSave={(v) => {
                        const newItems = v.split('\n').map((s) => s.replace(/^[-•·]\s*/, '').trim()).filter(Boolean)
                        const next = (p.what_to_bring || []).map((c: any, idx: number) =>
                          idx === i ? { category: cat.category, items: newItems } : { category: c.category, items: (c.items || []).map((x: any) => typeof x === 'string' ? x : (x?.name || x?.item || '')).filter(Boolean) }
                        )
                        return saveWhatToBring(next)
                      }}
                      renderDisplay={() => (
                        <ul className="space-y-1">
                          {itemStrings.map((item, j) => (
                            <li key={j} className="text-sm text-foreground/70 flex items-start gap-2">
                              <span className="text-accent mt-0.5">·</span>
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
          </section>
        )}

        {/* Active-trip sections: preparation tasks + downloadable documents */}
        {p.status === 'active' && (() => {
          const allTasks = Array.isArray(tasks) ? tasks : []
          const visibleForClient = allTasks.filter((t: any) => t.visible_to_client !== false)
          const renderList = showOwnerUI ? allTasks : visibleForClient
          if (renderList.length === 0) return null
          return (
            <section>
              <h2 className="text-2xl font-serif font-bold mb-6">Before you go</h2>
              <div className="space-y-3">
                {[...renderList]
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
                        className={`border rounded-lg p-4 transition-opacity ${
                          hidden ? 'border-dashed border-border/60 bg-secondary/30 opacity-60' : 'border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-medium flex-1">
                            <EditableField
                              as="text"
                              editable={showOwnerUI}
                              value={t.title}
                              required
                              className="w-full"
                              onSave={(v) => saveTaskPatch(t.id, { title: v })}
                            />
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {(t.deadline || showOwnerUI) && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap inline-flex items-center gap-1">
                                <span>by</span>
                                <EditableField
                                  as="date"
                                  editable={showOwnerUI}
                                  value={t.deadline}
                                  placeholder="Set date"
                                  formatDisplay={(iso) =>
                                    new Date(iso).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  }
                                  onSave={(v) => saveTaskPatch(t.id, { deadline: v })}
                                />
                              </span>
                            )}
                            {showOwnerUI && (
                              <button
                                type="button"
                                onClick={() => toggleTaskVisibility(t.id, hidden)}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                title={hidden ? 'Show to client' : 'Hide from client'}
                                aria-label={hidden ? 'Show to client' : 'Hide from client'}
                              >
                                {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                        {(t.description || showOwnerUI) && (
                          <div className="text-sm text-foreground/70 mt-1">
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
                        {showOwnerUI && hidden && (
                          <p className="text-xs text-muted-foreground mt-2 italic">Hidden from client</p>
                        )}
                      </div>
                    )
                  })}
              </div>
            </section>
          )
        })()}

        {p.status === 'active' && (() => {
          const allDocs = (Array.isArray(media) ? media : []).filter(
            (m: any) => m.type === 'document',
          )
          const visibleDocs = allDocs.filter((m: any) => m.visible_to_client !== false)
          const renderDocs = showOwnerUI ? allDocs : visibleDocs
          // Client: hide whole section if nothing to show.
          // Owner: always show (so they can drop new docs).
          if (!showOwnerUI && renderDocs.length === 0) return null
          return (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-bold">Documents</h2>
                {showOwnerUI && (
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    disabled={uploadingDoc}
                    className="text-xs text-accent hover:underline disabled:opacity-50 flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" /> {uploadingDoc ? 'Uploading…' : 'Add document'}
                  </button>
                )}
              </div>

              {showOwnerUI && (
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,image/jpeg,image/png"
                  multiple
                  className="hidden"
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
                  className={`mb-4 border-2 border-dashed rounded-lg p-6 text-center text-sm transition-colors cursor-pointer ${
                    docDragOver
                      ? 'border-accent bg-accent/5 text-accent'
                      : 'border-border text-muted-foreground hover:border-foreground/30'
                  }`}
                  onClick={() => docInputRef.current?.click()}
                >
                  {uploadingDoc ? (
                    <span>Uploading & parsing…</span>
                  ) : (
                    <>
                      <FileText className="w-5 h-5 mx-auto mb-1 opacity-60" />
                      <div>Drop a booking, voucher or ticket here</div>
                      <div className="text-xs mt-0.5 opacity-75">
                        PDF · DOCX · XLSX · JPEG · PNG — auto-applied to itinerary
                      </div>
                    </>
                  )}
                </div>
              )}

              {renderDocs.length > 0 ? (
                <div className="grid gap-2">
                  {renderDocs.map((m: any) => {
                    const hidden = m.visible_to_client === false
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                          hidden
                            ? 'border-dashed border-border/60 bg-secondary/30 opacity-60'
                            : 'border-border hover:bg-secondary'
                        }`}
                      >
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 flex-1 min-w-0"
                        >
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate text-foreground/80">
                            {m.caption || m.file_name || 'Document'}
                          </span>
                        </a>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                          <a
                            href={m.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline px-2"
                          >
                            Download ↗
                          </a>
                          {showOwnerUI && (
                            <>
                              <button
                                type="button"
                                onClick={() => toggleMediaVisibility(m.id, hidden)}
                                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                title={hidden ? 'Show to client' : 'Hide from client'}
                                aria-label={hidden ? 'Show to client' : 'Hide from client'}
                              >
                                {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteDocument(m.id)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Delete document"
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
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No documents yet.
                  </p>
                )
              )}
            </section>
          )
        })()}

        <footer className="border-t border-border pt-8 pb-12 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <a href="/" className="text-accent hover:underline">Waytico</a>
          </p>
        </footer>
      </div>

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

      {/* ─── Owner-only editor controls ─── */}
      {showOwnerUI && (
        <>
          {/* Persistent bottom command bar for quick edits */}
          <TripCommandBar
            projectId={p.id}
            getToken={getToken}
            onTripUpdated={handleTripUpdated}
          />

          {/* Spacer so the fixed command bar doesn't cover the footer */}
          <div className="h-24 md:h-28" aria-hidden="true" />
        </>
      )}
    </div>
  )
}
