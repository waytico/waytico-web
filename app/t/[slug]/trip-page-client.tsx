'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Trash2, Eye, EyeOff, FileText, Upload, X } from 'lucide-react'

import ActivationToast from '@/components/activation-toast'
import PhotosBlock from '@/components/photos-block'
import PhotoLightbox from '@/components/photo-lightbox'
import Header from '@/components/header'
import ShareMenu from '@/components/share-menu'
import AnonUpsellModal from '@/components/anon-upsell-modal'
import PostClaimUpsellModal from '@/components/post-claim-upsell-modal'
import { ScrollToTop } from '@/components/scroll-to-top'
import { TripCommandBar } from '@/components/trip/trip-command-bar'
import { TripActionBar } from '@/components/trip/trip-action-bar'
import { ArchiveDialog } from '@/components/trip/archive-dialog'
import { EditableField } from '@/components/editable/editable-field'

import { ThemeRoot } from '@/components/trip/theme-root'
import { TripNav } from '@/components/trip/nav'
import { TripHero } from '@/components/trip/hero'
import { ContactAgentMenu } from '@/components/trip/contact-agent-menu'
import { TripOverview } from '@/components/trip/overview'
import { TripItinerary } from '@/components/trip/itinerary'
import { TripIncluded, IncludedList } from '@/components/trip/included'
import { TripPrice } from '@/components/trip/price'
import { TripTerms } from '@/components/trip/terms'
import { TripAccommodations } from '@/components/trip/accommodations'
import { TripContacts } from '@/components/trip/contacts'
import { ClientInfo } from '@/components/trip/client-info'
import { HeroOwnerOverlay, HeroDropZone } from '@/components/trip/owner-extras'
import type { PricingMode } from '@/components/trip/trip-types'
import { TripFooter } from '@/components/trip/trip-footer'

import { apiFetch } from '@/lib/api'
import { resolveTheme } from '@/lib/themes'
import { UI } from '@/lib/ui-strings'
import {
  fmtDateRange,
  fmtPrice,
  coercePrice,
  addDaysISO,
} from '@/lib/trip-format'
import { useTripMutations } from '@/hooks/use-trip-mutations'
import { usePhotoUpload, type MediaRecord } from '@/hooks/use-photo-upload'
import { useTripData } from '@/hooks/use-trip-data'

type Props = {
  slug: string
  initialData: { project: Record<string, any>; tasks: any[]; media: any[] } | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://waytico-backend.onrender.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://waytico-web.onrender.com'

export default function TripPageClient({ slug, initialData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, getToken, isLoaded } = useAuth()

  const [data, setData] = useState(initialData)
  const [isAnonCreator, setIsAnonCreator] = useState(false)
  const [projectIdForClaim, setProjectIdForClaim] = useState<string | null>(null)
  const [anonShareOpen, setAnonShareOpen] = useState(false)
  const [sharedOnce, setSharedOnce] = useState(false)
  const [ownerRefreshKey, setOwnerRefreshKey] = useState(0)
  /** In-memory only: fires once after a successful anon→register→claim
   *  handshake, never again on this mount. F5 won't replay it. */
  const [showPostClaimUpsell, setShowPostClaimUpsell] = useState(false)

  // Mark anon-creator for non-dismissible banner + 8s upsell modal.
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
          } catch {}
          setIsAnonCreator(false)
          setSharedOnce(false)
          setOwnerRefreshKey((k) => k + 1)
          setShowPostClaimUpsell(true)
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
    saveWhatToBring,
    saveAccommodationCreate,
    saveAccommodationPatch,
    saveAccommodationDelete,
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
  const accommodations: any[] = Array.isArray((data as any).accommodations) ? (data as any).accommodations : []
  const owner = ((data as any).owner || null) as any
  const shareUrl = `${APP_URL}/t/${slug}`
  const ed = showOwnerUI

  // TZ-6 §3: NUMERIC arrives from PostgreSQL as string ("3450.00") — coerce
  // exactly once at the top of trip-page-client before forwarding to children.
  const pricePerPersonNum = coercePrice(p.price_per_person)
  const priceTotalNum = coercePrice(p.price_total)
  const priceFormatted = fmtPrice(pricePerPersonNum, p.currency)
  const totalFormatted = fmtPrice(priceTotalNum, p.currency)

  // Hero stat tile + Price block share a "headline price" — the side
  // (per-person vs total) selected by pricing_mode. Backend keeps both
  // sides in sync so we just pick which to render here.
  const pricingMode = (p.pricing_mode || 'per_group') as PricingMode
  const heroHeadlineNum =
    pricingMode === 'per_traveler' ? pricePerPersonNum : priceTotalNum
  const heroHeadlineFormatted = fmtPrice(heroHeadlineNum, p.currency)
  const heroPriceLabel =
    pricingMode === 'per_traveler'
      ? UI.perTraveler
      : pricingMode === 'other'
        ? p.pricing_label || UI.forTheGroup
        : UI.forTheGroup
  const dateRange = fmtDateRange(p.dates_start, p.dates_end)

  const resolvedTheme = resolveTheme(p.design_theme)
  const heroPhoto = media.find((m) => m.placement === 'hero') || null
  const hasHeroBg = !!heroPhoto

  // Proposal lifecycle dates — read from DB (auto-filled at create: today + 14d).
  // DB returns ISO timestamps like "2026-04-27T00:00:00.000Z"; fmtDate only
  // accepts strict "YYYY-MM-DD", so slice. Falls back to created_at-based
  // defaults if missing for legacy projects.
  const proposalDateISO: string | null =
    (p.proposal_date ? String(p.proposal_date).slice(0, 10) : null) ||
    (p.created_at ? String(p.created_at).slice(0, 10) : null)
  const validUntilISO: string | null =
    (p.valid_until ? String(p.valid_until).slice(0, 10) : null) ||
    (p.created_at ? addDaysISO(String(p.created_at).slice(0, 10), 14) : null)
  const operatorContact = (p.operator_contact || null) as
    | { name?: string | null; email?: string | null; phone?: string | null; whatsapp?: string | null; telegram?: string | null; website?: string | null }
    | null

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

  const heroTaglineSlot: ReactNode = ed ? (
    <EditableField
      as="text"
      editable
      value={p.tagline}
      placeholder="Add a one-line subtitle"
      maxLength={300}
      onSave={(v) => saveProjectPatch({ tagline: v })}
    />
  ) : (
    p.tagline ? <span>{p.tagline}</span> : null
  )

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

  // Region was removed from the hero eyebrow — operators kept leaving it empty
  // or duplicating the country, and the noise outweighed the clarity. The
  // column stays in the DB so historical data isn't lost; it just doesn't
  // render here anymore. Eyebrow now shows only the country.
  const regionEyebrowSlot: ReactNode | null =
    p.country || ed ? (
      <span className="tp-eyebrow">
        {ed ? (
          <EditableField
            as="text"
            editable
            value={p.country}
            placeholder="Country"
            onSave={(v) => saveProjectPatch({ country: v })}
          />
        ) : (
          (p.country || '').toUpperCase()
        )}
      </span>
    ) : null

  // ── Hero stat tiles — owner mode wraps each scalar with EditableField. ──
  // Hero.tsx accepts these as ReactNode slots (dateStatSlot / durationStatSlot /
  // groupStatSlot / priceStatSlot). When undefined, Hero falls back to the
  // pre-formatted scalar values it also receives. Public mode passes
  // undefined so the formatted strings render as before.

  const dateStatSlot: ReactNode | undefined = ed ? (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <EditableField
        as="date"
        editable
        value={p.dates_start}
        placeholder="Start"
        onSave={(v) => saveProjectPatch({ datesStart: v })}
      />
      <span style={{ color: 'var(--ink-mute)' }}>–</span>
      <EditableField
        as="date"
        editable
        value={p.dates_end}
        placeholder="End"
        onSave={(v) => saveProjectPatch({ datesEnd: v })}
      />
    </span>
  ) : undefined

  // Hero duration tile is read-only even in owner mode. The tile is a
  // computed reflection of the itinerary's length; editing it inline gave
  // a false affordance — the operator could overwrite the number with
  // anything and the days below didn't reshape to match (in fact the only
  // robust way to change duration is to add/remove a day in the itinerary
  // itself, which then propagates dates through reconcileDates on the
  // backend). Click scrolls down to the Itinerary so the operator manages
  // duration where it actually lives.
  const durationStatSlot: ReactNode | undefined = ed
    ? (
        <a
          href="#itinerary"
          title="Add or remove days in the itinerary below"
          style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
          onClick={(e) => {
            e.preventDefault()
            document
              .getElementById('itinerary')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          {p.duration_days != null
            ? `${p.duration_days} ${UI.days}`
            : <span style={{ color: 'var(--ink-mute)' }}>—</span>}
        </a>
      )
    : undefined

  const groupStatSlot: ReactNode | undefined = ed ? (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'baseline' }}>
      <EditableField
        as="number"
        editable
        value={p.group_size}
        placeholder="0"
        onSave={(v) => saveProjectPatch({ groupSize: v })}
      />
      <span style={{ color: 'var(--ink-mute)' }}>{UI.travelers}</span>
    </span>
  ) : undefined

  // Hero price tile is read-only even in owner mode: actual editing happens
  // in the Price block below, where the mode dropdown lives. A bare inline
  // editor here would let the operator change the number without showing
  // them that there's a "for the group / per traveler / other" choice
  // attached to it — and one inline number can't represent the whole trio.
  // Click scrolls down to the Price section instead.
  const priceStatSlot: ReactNode | undefined = ed
    ? (
        <a
          href="#price"
          title="Edit in the Price section below"
          style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
          onClick={(e) => {
            e.preventDefault()
            document.getElementById('price')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          {heroHeadlineFormatted ?? <span style={{ color: 'var(--ink-mute)' }}>Add price</span>}
        </a>
      )
    : undefined

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

  // Price section now renders both modes, dropdown, and headline editor
  // internally — see components/trip/price.tsx. trip-page-client only
  // forwards raw price fields + a single visibility flag.
  const priceVisible = ed || pricePerPersonNum != null || priceTotalNum != null

  // Effective terms: per-trip override wins, otherwise inherit from the
  // brand-level Default Terms set on the owner profile. This makes
  // edits to brand_terms reflect on the trip page in real time without
  // having to copy text into every trip — and per-trip terms still take
  // precedence whenever they exist (operator override).
  const tripTermsTrimmed = (p.terms || '').trim()
  const brandTermsTrimmed = (owner?.brand_terms || '').trim()
  const effectiveTerms = tripTermsTrimmed || brandTermsTrimmed || null
  const termsAreInherited = !tripTermsTrimmed && !!brandTermsTrimmed

  const termsBodySlot: ReactNode = ed ? (
    tripTermsTrimmed ? (
      // Operator has set a per-trip override — let them edit it directly.
      <EditableField
        as="multiline"
        editable
        value={p.terms}
        placeholder="Click to add terms"
        rows={6}
        className="w-full"
        onSave={(v) => saveProjectPatch({ terms: v })}
      />
    ) : termsAreInherited ? (
      // Inherited from brand_terms. Render the resolved text for clarity,
      // plus an explicit "Override for this trip" button that, when
      // clicked, seeds the override field with the current brand text so
      // the operator can tweak it instead of starting from a blank slate.
      <>
        <DescriptionParagraphs text={effectiveTerms} />
        <p
          style={{
            fontSize: 12,
            color: 'var(--ink-mute)',
            marginTop: 12,
            fontStyle: 'italic',
          }}
        >
          Showing your brand default terms.{' '}
          <button
            type="button"
            onClick={() => saveProjectPatch({ terms: brandTermsTrimmed })}
            style={{
              color: 'var(--accent)',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              font: 'inherit',
              fontStyle: 'italic',
            }}
          >
            Override for this trip
          </button>
        </p>
      </>
    ) : (
      // No trip override and no brand default — placeholder editor.
      <EditableField
        as="multiline"
        editable
        value={p.terms}
        placeholder="Click to add terms"
        rows={4}
        className="w-full"
        onSave={(v) => saveProjectPatch({ terms: v })}
      />
    )
  ) : (
    <DescriptionParagraphs text={effectiveTerms} />
  )

  const termsVisible = ed || !!effectiveTerms

  const overviewVisible = ed || !!(p.description && p.description.trim())

  // Visibility flags for sections that don't already export one — used by
  // both the section's own conditional render and by the TripNav so the
  // anchor menu doesn't link to phantom sections.
  const itineraryVisible = ed || itinerary.length > 0
  const accommodationsVisible = ed || accommodations.length > 0
  const contactsVisible =
    ed ||
    !!(owner && (
      owner.brand_name || owner.brand_email || owner.brand_phone ||
      owner.brand_whatsapp || owner.brand_telegram || owner.brand_website
    )) ||
    !!(operatorContact && (
      operatorContact.name || operatorContact.email || operatorContact.phone ||
      operatorContact.whatsapp || operatorContact.telegram || operatorContact.website
    ))

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
    <div
      className="min-h-screen bg-background"
      data-owner-view={showOwnerUI ? 'true' : 'false'}
    >
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
          designTheme={p.design_theme}
          onPreviewAsClient={() => setPreviewAsClient(true)}
          onStatusChanged={() => setOwnerRefreshKey((k) => k + 1)}
          onRequestArchive={() => setArchiveOpen(true)}
          onRequestDelete={handleDeleteProject}
        />
      )}

      {/* Operator service block — top placement under the action bar.
          Persists identity through the per-agent clients table; trip-
          only fields (booking ref, notes, special requests) go through
          saveProjectPatch directly. */}
      {showOwnerUI && p.id && (
        <ClientInfo
          projectId={p.id}
          client={(data as any).client ?? null}
          bookingRef={p.booking_ref ?? null}
          internalNotes={p.internal_notes ?? null}
          specialRequests={p.special_requests ?? null}
          saveProjectPatch={saveProjectPatch}
          onClientChanged={() => setOwnerRefreshKey((k) => k + 1)}
        />
      )}

      {showOwnerUI && p.id && (
        <ArchiveDialog
          open={archiveOpen}
          projectId={p.id}
          projectTitle={p.title}
          currentContact={{
            name: ((data as any).client?.name as string | null) ?? null,
            email: ((data as any).client?.email as string | null) ?? null,
            phone: ((data as any).client?.phone as string | null) ?? null,
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

      {isAnonCreator && data?.project?.status === 'quoted' && projectIdForClaim && (
        <>
          {/* Non-dismissible sticky banner — fixed-height row, leading-none + flex items-center
              guarantees vertical centering of both text and pill button. */}
          <div className="sticky top-0 z-40 bg-highlight border-b border-border">
            <div
              className="max-w-7xl mx-auto px-4 flex items-center gap-3"
              style={{ height: 52 }}
            >
              <div className="text-sm text-foreground/80 flex-1 min-w-0 leading-none">
                <button
                  onClick={() => {
                    const redirectUrl = `/t/${slug}?claim=${projectIdForClaim}`
                    router.push(`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`)
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
                  title={data.project.title || 'Your trip'}
                  url={shareUrl}
                  publicStatus={data.project.status}
                  forceOpen={anonShareOpen}
                  onOpenChange={setAnonShareOpen}
                  hideTrigger
                  onShareAction={() => setSharedOnce(true)}
                />
              </div>
            </div>
          </div>

          {/* Persistent post-share toast — top-center, never auto-dismisses. */}
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
                    const redirectUrl = `/t/${slug}?claim=${projectIdForClaim}`
                    router.push(`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`)
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

      {/* Anon upsell modal — appears 8s after page load for unauthenticated agents.
          Two paths: share immediately (opens banner ShareMenu), or sign up free. */}
      {isAnonCreator && data?.project?.status === 'quoted' && projectIdForClaim && (
        <AnonUpsellModal
          tripTitle={data.project.title || 'Your trip'}
          tripUrl={shareUrl}
          signUpUrl={`/sign-up?redirect_url=${encodeURIComponent(`/t/${slug}?claim=${projectIdForClaim}`)}`}
          onShareClick={() => setAnonShareOpen(true)}
        />
      )}

      {/* Post-claim upsell — fires once, in-memory, the moment the
          anon→register→claim handshake succeeds. Walks through five
          non-obvious things the operator can do with this just-saved
          quote. F5 won't bring it back. */}
      <PostClaimUpsellModal
        show={showPostClaimUpsell}
        onClose={() => setShowPostClaimUpsell(false)}
      />

      {/* Themed surface — switching data-theme reflows tokens in styles/themes.css.
          Owner edit UX rides through via slot props; structural variants
          (split/overlay/card hero, timeline/photo-cards/grid itinerary) live
          inside Hero.tsx / Itinerary.tsx as `if (heroStyle === ...)` branches. */}
      <ThemeRoot theme={p.design_theme}>
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
            pricePerPersonFormatted={heroHeadlineFormatted}
            priceLabel={heroPriceLabel}
            activityChipSlot={activityChipSlot}
            regionEyebrowSlot={regionEyebrowSlot}
            titleSlot={titleSlot}
            taglineSlot={heroTaglineSlot}
            dateStatSlot={dateStatSlot}
            durationStatSlot={durationStatSlot}
            groupStatSlot={groupStatSlot}
            priceStatSlot={priceStatSlot}
            proposalDate={proposalDateISO}
            validUntil={validUntilISO}
            proposalSlot={
              ed ? (
                <EditableField
                  as="date"
                  editable
                  value={proposalDateISO}
                  onSave={(v) => saveProjectPatch({ proposalDate: v || null })}
                />
              ) : undefined
            }
            validUntilSlot={
              ed ? (
                <EditableField
                  as="date"
                  editable
                  value={validUntilISO}
                  onSave={(v) => saveProjectPatch({ validUntil: v || null })}
                />
              ) : undefined
            }
            operatorContact={operatorContact}
            contactAgentSlot={
              !showOwnerUI
                ? ({ onPhoto }) => (
                    <ContactAgentMenu
                      owner={owner}
                      operatorContact={operatorContact}
                      onPhoto={onPhoto}
                    />
                  )
                : undefined
            }
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

        <TripNav
          visibility={{
            overview: overviewVisible,
            itinerary: itineraryVisible,
            accommodations: accommodationsVisible,
            price: priceVisible,
            included: includedVisible,
            terms: termsVisible,
            contacts: contactsVisible,
          }}
        />

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

        <TripOverview bodySlot={overviewBodySlot} visible={overviewVisible} />

        <TripItinerary
          theme={resolvedTheme}
          itinerary={itinerary as any}
          media={media as any}
          datesStart={p.dates_start}
          language={p.language ?? 'en'}
          renderDayTitle={renderDayTitle}
          renderDayDescription={renderDayDescription}
          renderDayExtras={renderDayExtras}
        />

        <TripAccommodations
          accommodations={accommodations as any}
          editable={ed}
          onCreate={ed ? saveAccommodationCreate : undefined}
          onUpdate={ed ? saveAccommodationPatch : undefined}
          onDelete={ed ? saveAccommodationDelete : undefined}
        />

        <TripPrice
          pricingMode={pricingMode}
          pricingLabel={p.pricing_label ?? null}
          pricePerPerson={pricePerPersonNum}
          priceTotal={priceTotalNum}
          currency={p.currency}
          groupSize={p.group_size}
          editable={ed}
          saveProjectPatch={ed ? saveProjectPatch : undefined}
          visible={priceVisible}
        />

        <TripIncluded
          includedBodySlot={includedBodySlot}
          notIncludedBodySlot={notIncludedBodySlot}
          visible={includedVisible}
        />

        <TripTerms
          bodySlot={termsBodySlot}
          visible={termsVisible}
          ownerHint={
            ed
              ? 'Edits here apply to this trip only. Update your profile terms to change them across this and future trips.'
              : undefined
          }
        />

        <TripContacts
          owner={owner}
          operatorContact={operatorContact}
          editable={ed}
          saveProjectPatch={ed ? saveProjectPatch : undefined}
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

        {/* What-to-bring — active phase only. On the quote (status='quoted')
            the section is hidden so the page stays focused on the proposal
            decision; it appears once the trip flips to active. */}
        {p.status === 'active' && ((p.what_to_bring?.length > 0) || showOwnerUI) && (
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
          <TripCommandBar projectId={p.id} getToken={getToken} onTripUpdated={handleTripUpdated} status={p.status} theme={resolvedTheme} />
          {/* Owner-only breathing room between the last section and the
              footer. The command bar floats over the page; this spacer
              gives the operator empty space where the bar can rest
              without overlapping content, and lets them scroll just past
              the last section to read the bottom edge of any block.
              ~160-176px — tall enough that the floating pill (≈64px high
              including padding) sits with margin above and below. */}
          <div className="h-40 md:h-44" aria-hidden="true" />
        </>
      )}

      <TripFooter editable={ed} />

      <ScrollToTop bottomOffset={showOwnerUI ? 88 : 24} />
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


