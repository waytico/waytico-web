'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { ImagePlus, Trash2, Check, X } from 'lucide-react'
import ActivateButton from '@/components/activate-button'
import ActivationToast from '@/components/activation-toast'
import ShareMenu from '@/components/share-menu'
import PhotosBlock from '@/components/photos-block'
import PhotoLightbox from '@/components/photo-lightbox'
import Header from '@/components/header'
import { TripCommandBar } from '@/components/trip/trip-command-bar'
import { apiFetch } from '@/lib/api'
import {
  uploadPhoto,
  deletePhoto,
  type MediaRecord,
} from '@/lib/upload-photo'

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
  const [showModal, setShowModal] = useState(false)
  const [projectIdForClaim, setProjectIdForClaim] = useState<string | null>(null)

  const needsPolling = !initialData || initialData.project?.status === 'generating'
  const [polling, setPolling] = useState(needsPolling)

  // Polling for generation
  useEffect(() => {
    if (!polling) return
    let active = true
    const poll = async () => {
      while (active) {
        try {
          const res = await fetch(`${API_URL}/api/public/projects/${slug}`)
          if (res.ok) {
            const d = await res.json()
            if (d.project?.status !== 'generating') {
              setData(d)
              setPolling(false)
              return
            }
          }
        } catch {}
        await new Promise(r => setTimeout(r, 3000))
      }
    }
    poll()
    const timeout = setTimeout(() => { active = false; setPolling(false) }, 120_000)
    return () => { active = false; clearTimeout(timeout) }
  }, [polling, slug])

  // Show modal if just created (sessionStorage flag)
  useEffect(() => {
    try {
      const justCreated = sessionStorage.getItem('waytico:just-created')
      if (justCreated && data?.project) {
        setProjectIdForClaim(justCreated)
        setShowModal(true)
        sessionStorage.removeItem('waytico:just-created')
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
        }
      } catch {}
      // Remove ?claim from URL
      router.replace(`/t/${slug}`)
    })()
  }, [searchParams, isSignedIn, isLoaded, getToken, slug, router])

  // ─── Photos / owner state ──────────────────────────────────
  const [isOwner, setIsOwner] = useState(false)
  const [media, setMedia] = useState<MediaRecord[]>(
    (initialData?.media as MediaRecord[]) || [],
  )
  const [uploadingByDay, setUploadingByDay] = useState<Record<string, number>>({})
  const [lightbox, setLightbox] = useState<MediaRecord | null>(null)
  const [heroDragOver, setHeroDragOver] = useState(false)
  const heroInputRef = useRef<HTMLInputElement | null>(null)

  // Owner-detect (показываем кнопки upload/delete только владельцу)
  useEffect(() => {
    const projectId = data?.project?.id
    if (!isLoaded || !isSignedIn || !projectId) return
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const ownRes = await apiFetch(`/api/projects/by-id/${projectId}`, { token })
        if (!ownRes.ok || cancelled) return
        setIsOwner(true)
      } catch {
        /* not owner */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, getToken, data?.project?.id])

  // Sync media when initialData changes (e.g., after polling completes)
  useEffect(() => {
    if (initialData?.media) setMedia(initialData.media as MediaRecord[])
  }, [initialData])

  const bumpUploading = (key: string, delta: number) =>
    setUploadingByDay((prev) => {
      const next = { ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }
      if (next[key] === 0) delete next[key]
      return next
    })

  const handleUpload = useCallback(
    async (files: File[], dayId: string | null) => {
      const projectId = data?.project?.id
      if (!projectId) return
      const key = dayId || 'tour'
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again')
        return
      }
      bumpUploading(key, files.length)
      await Promise.all(
        files.map(async (file) => {
          try {
            const rec = await uploadPhoto(projectId, file, dayId, token)
            setMedia((prev) => [...prev, rec])
          } catch (e: any) {
            toast.error(e?.message || 'Upload failed')
          } finally {
            bumpUploading(key, -1)
          }
        }),
      )
    },
    [data?.project?.id, getToken],
  )

  const handleDelete = useCallback(
    async (mediaId: string) => {
      const snapshot = media
      setMedia((cur) => cur.filter((m) => m.id !== mediaId))
      try {
        const token = await getToken()
        if (!token) throw new Error('No token')
        await deletePhoto(mediaId, token)
      } catch (e: any) {
        setMedia(snapshot)
        toast.error(e?.message || 'Could not delete photo')
      }
    },
    [media, getToken],
  )

  // Hero upload: always placement='hero', single photo. If a hero already exists,
  // it's replaced — old record deleted after the new one lands.
  const handleHeroUpload = useCallback(
    async (files: File[]) => {
      const projectId = data?.project?.id
      if (!projectId || files.length === 0) return
      const file = files[0]
      if (files.length > 1) {
        toast.message('Hero uses the first photo — drop more in the gallery below')
      }
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again')
        return
      }
      // Capture previous hero before upload so we can clean it up after success.
      const prevHero = media.find((m) => m.placement === 'hero')
      bumpUploading('hero', 1)
      try {
        const rec = await uploadPhoto(projectId, file, null, token, 'hero')
        // Prepend so .find() picks the new hero even if the old one sticks around on failure.
        setMedia((prev) => [rec, ...prev])
        if (prevHero) {
          // Best-effort: remove the old hero record + S3 object.
          setMedia((prev) => prev.filter((m) => m.id !== prevHero.id))
          try {
            await deletePhoto(prevHero.id, token)
          } catch {
            // If delete failed, put it back so the user can retry.
            setMedia((prev) => (prev.some((m) => m.id === prevHero.id) ? prev : [...prev, prevHero]))
          }
        }
      } catch (e: any) {
        toast.error(e?.message || 'Upload failed')
      } finally {
        bumpUploading('hero', -1)
      }
    },
    [data?.project?.id, getToken, media],
  )
  // ──────────────────────────────────────────────────────────

  // ─── Editor ────────────────────────────────────────────────
  const handleTripUpdated = useCallback(async () => {
    // Re-fetch public data to reflect agent's tool-call changes.
    // Public endpoint returns all media (tour-level + per-day), so it's enough.
    try {
      const res = await fetch(`${API_URL}/api/public/projects/${slug}`, { cache: 'no-store' })
      if (res.ok) {
        const d = await res.json()
        setData(d)
        if (Array.isArray(d.media)) setMedia(d.media as MediaRecord[])
      }
    } catch {
      /* ignore */
    }
  }, [slug])
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
      {isOwner && <Header />}

      {/* Stripe return flow (?activated=1 / ?cancelled=1) */}
      <ActivationToast />

      {/* Post-creation modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl">
            <h2 className="text-2xl font-serif font-bold">Your quote is ready</h2>

            {/* Share link */}
            <div className="space-y-2">
              <p className="text-sm text-foreground/60">Share this link with your client:</p>
              <div className="flex items-center gap-2 bg-secondary rounded-lg p-3">
                <span className="text-sm truncate flex-1 text-foreground/80">{shareUrl}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl)
                    toast.success('Link copied!')
                  }}
                  className="text-xs font-medium text-accent hover:text-accent/80 flex-shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>

            <p className="text-sm text-foreground/60">
              This quote is available for 3 days. Sign up to edit, add photos, and save to your account.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const redirectUrl = `/t/${slug}?claim=${projectIdForClaim}`
                  router.push(`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`)
                }}
                className="flex-1 bg-accent text-accent-foreground font-semibold py-2.5 px-4 rounded-full hover:bg-accent/90 transition-colors"
              >
                Sign up
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-secondary text-secondary-foreground font-medium py-2.5 px-4 rounded-full hover:bg-secondary/80 transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      {(() => {
        const heroPhoto = media.find((m) => m.placement === 'hero')
        const hasBg = !!heroPhoto
        const uploadingHero = uploadingByDay['hero'] || 0
        const showEmptyState = !hasBg && isOwner
        const heroDropHandlers = isOwner
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
              {isOwner && hasBg && heroPhoto && (
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
              <div className="hidden md:flex items-center gap-2">
                {p.id && <ActivateButton projectId={p.id} publicStatus={p.status} />}
                {p.id && <ShareMenu title={p.title} url={shareUrl} publicStatus={p.status} />}
              </div>
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
            {isOwner && (
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
              {p.activity_type && (
                <span
                  className={`inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full ${
                    hasBg
                      ? 'bg-white/15 text-white backdrop-blur-sm'
                      : 'bg-accent/10 text-accent'
                  }`}
                >
                  {p.activity_type}
                </span>
              )}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-tight">
                {p.title}
              </h1>
              <div
                className={`flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm ${
                  hasBg ? 'text-white/85' : 'text-foreground/60'
                }`}
              >
                {p.region && (
                  <span>
                    {p.region}
                    {p.country ? `, ${p.country}` : ''}
                  </span>
                )}
                {p.duration_days && <span>{p.duration_days} days</span>}
                {p.group_size && <span>{p.group_size} people</span>}
                {p.dates_start && (
                  <span>
                    {new Date(p.dates_start).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {p.dates_end &&
                      ` – ${new Date(p.dates_end).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}`}
                  </span>
                )}
              </div>
              {p.price_per_person && (
                <div className="pt-2">
                  <span
                    className={`text-3xl font-serif font-bold ${hasBg ? 'text-white' : 'text-accent'}`}
                  >
                    {p.currency === 'USD' ? '$' : p.currency === 'EUR' ? '€' : ''}
                    {Number(p.price_per_person).toLocaleString()}
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

              {/* Mobile-only: Activate + Share (moved here from top-right so
                  they don't overlap the title on narrow viewports). */}
              {p.id && (
                <div className="md:hidden pt-4 flex flex-wrap items-center justify-center gap-3">
                  <ActivateButton projectId={p.id} publicStatus={p.status} />
                  <ShareMenu title={p.title} url={shareUrl} publicStatus={p.status} />
                </div>
              )}
            </div>

            {/* Uploading indicator when replacing existing hero */}
            {isOwner && hasBg && uploadingHero > 0 && (
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
        {p.description && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-4">Overview</h2>
            <div className="text-foreground/80 leading-relaxed whitespace-pre-line">{p.description}</div>
          </section>
        )}

        {(() => {
          const tourMedia = media.filter((m) => !m.day_id && m.placement !== 'hero')
          const showTourPhotos = isOwner || tourMedia.length > 0
          if (!showTourPhotos) return null
          return (
            <section>
              <h2 className="text-2xl font-serif font-bold mb-4">Photos</h2>
              <PhotosBlock
                dayId={null}
                media={tourMedia}
                owner={isOwner}
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
                        <h3 className="font-semibold text-lg">{day.title}</h3>
                        {day.description && (
                          <p className="text-foreground/70 text-sm mt-1 leading-relaxed">{day.description}</p>
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
                                {s.startTime && (
                                  <span className="text-xs font-mono text-muted-foreground w-12 flex-shrink-0">
                                    {s.startTime}
                                  </span>
                                )}
                                <h4 className="font-medium text-sm">{s.title}</h4>
                              </div>
                              {s.notes && (
                                <p className={`text-sm text-foreground/70 mt-1 ${s.startTime ? 'ml-[60px]' : ''}`}>
                                  {s.notes}
                                </p>
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
                              {s.reference && (
                                <div className={`text-xs font-mono text-muted-foreground mt-1 ${s.startTime ? 'ml-[60px]' : ''}`}>
                                  {s.reference}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                    {day.id && (dayMedia.length > 0 || isOwner) && (
                      <div className="pl-[52px] pt-2">
                        <PhotosBlock
                          dayId={day.id}
                          media={dayMedia}
                          owner={isOwner}
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

        {(p.included || p.not_included) && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">What's Included</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {p.included && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-accent flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-success/15 text-success flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </span>
                    Included
                  </h3>
                  <ul className="space-y-2">
                    {p.included.split('\n').filter(Boolean).map((item: string, i: number) => (
                      <li key={i} className="text-sm text-foreground/70 pl-8">{item.replace(/^[-•]\s*/, '')}</li>
                    ))}
                  </ul>
                </div>
              )}
              {p.not_included && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground/70 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </span>
                    Not Included
                  </h3>
                  <ul className="space-y-2">
                    {p.not_included.split('\n').filter(Boolean).map((item: string, i: number) => (
                      <li key={i} className="text-sm text-foreground/50 pl-8">{item.replace(/^[-•]\s*/, '')}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {p.terms && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-4">Terms</h2>
            <p className="text-sm text-foreground/60 whitespace-pre-line">{p.terms}</p>
          </section>
        )}

        {p.what_to_bring?.length > 0 && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">What to Bring</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {p.what_to_bring.map((cat: any, i: number) => (
                <div key={i} className="space-y-2">
                  <h3 className="font-semibold text-sm">{cat.category}</h3>
                  <ul className="space-y-1">
                    {cat.items?.map((item: any, j: number) => (
                      <li key={j} className="text-sm text-foreground/70 flex items-start gap-2">
                        <span className="text-accent mt-0.5">·</span>
                        <span>{typeof item === 'string' ? item : item.name || item.item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Active-trip sections: preparation tasks + downloadable documents */}
        {p.status === 'active' && Array.isArray(data.tasks) && data.tasks.length > 0 && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">Before you go</h2>
            <div className="space-y-3">
              {[...data.tasks]
                .sort((a: any, b: any) => {
                  const ad = a.deadline || '9999-12-31'
                  const bd = b.deadline || '9999-12-31'
                  if (ad !== bd) return ad.localeCompare(bd)
                  return (a.sort_order ?? 0) - (b.sort_order ?? 0)
                })
                .map((t: any) => (
                  <div key={t.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-medium">{t.title}</h3>
                      {t.deadline && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          by {new Date(t.deadline).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-sm text-foreground/70 mt-1">{t.description}</p>
                    )}
                  </div>
                ))}
            </div>
          </section>
        )}

        {p.status === 'active' &&
          Array.isArray(data.media) &&
          data.media.filter((m: any) => m.type === 'document').length > 0 && (
            <section>
              <h2 className="text-2xl font-serif font-bold mb-6">Documents</h2>
              <div className="grid gap-2">
                {data.media
                  .filter((m: any) => m.type === 'document')
                  .map((m: any) => (
                    <a
                      key={m.id}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary transition-colors"
                    >
                      <span className="text-sm truncate text-foreground/80">
                        {m.caption || 'Document'}
                      </span>
                      <span className="text-xs text-accent flex-shrink-0 ml-3">Download ↗</span>
                    </a>
                  ))}
              </div>
            </section>
          )}

        <footer className="border-t border-border pt-8 pb-12 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <a href="/" className="text-accent hover:underline">Waytico</a>
          </p>
        </footer>
      </div>

      <PhotoLightbox
        media={lightbox}
        owner={isOwner}
        projectId={data.project?.id || null}
        onClose={() => setLightbox(null)}
        onReplaced={(updated) => {
          setMedia((cur) => cur.map((m) => (m.id === updated.id ? updated : m)))
          setLightbox(updated)
        }}
      />

      {/* ─── Owner-only editor controls ─── */}
      {isOwner && (
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
