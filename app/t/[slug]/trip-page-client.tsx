'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import ActivateButton from '@/components/activate-button'
import ActivationToast from '@/components/activation-toast'
import PhotosBlock from '@/components/photos-block'
import PhotoLightbox from '@/components/photo-lightbox'
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
  const locations = data.locations || []
  const itinerary: any[] = p.itinerary || []
  const shareUrl = `${APP_URL}/t/${slug}`

  return (
    <div className="min-h-screen bg-background">
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
      <section className="relative bg-secondary py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
          {p.activity_type && (
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-accent/10 text-accent rounded-full">
              {p.activity_type}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-tight">
            {p.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-foreground/60 text-sm">
            {p.region && <span>{p.region}{p.country ? `, ${p.country}` : ''}</span>}
            {p.duration_days && <span>{p.duration_days} days</span>}
            {p.group_size && <span>{p.group_size} people</span>}
            {p.dates_start && (
              <span>{new Date(p.dates_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {p.dates_end && ` – ${new Date(p.dates_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
              </span>
            )}
          </div>
          {p.price_per_person && (
            <div className="pt-2">
              <span className="text-3xl font-serif font-bold text-accent">
                {p.currency === 'USD' ? '$' : p.currency === 'EUR' ? '€' : ''}{Number(p.price_per_person).toLocaleString()}
              </span>
              <span className="text-foreground/50 ml-1">per person</span>
            </div>
          )}
          {p.id && (
            <div className="pt-4 flex justify-center">
              <ActivateButton projectId={p.id} publicStatus={p.status} />
            </div>
          )}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-16">
        {p.description && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-4">Overview</h2>
            <div className="text-foreground/80 leading-relaxed whitespace-pre-line">{p.description}</div>
          </section>
        )}

        {(() => {
          const tourMedia = media.filter((m) => !m.day_id)
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
                    <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">✓</span>
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
                    <span className="w-6 h-6 rounded-full bg-red-50 text-red-400 flex items-center justify-center text-xs">✕</span>
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

        {locations.length > 0 && (
          <section>
            <h2 className="text-2xl font-serif font-bold mb-6">Locations</h2>
            <div className="grid gap-3">
              {locations.map((loc) => (
                <div key={loc.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                  <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold">
                    {loc.day_number || '·'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">{loc.type}{loc.notes ? ` · ${loc.notes}` : ''}</p>
                  </div>
                  <a href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline flex-shrink-0">
                    Map ↗
                  </a>
                </div>
              ))}
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
