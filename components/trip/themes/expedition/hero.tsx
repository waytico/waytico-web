'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Trash2 } from 'lucide-react'
import { EditableField } from '@/components/editable/editable-field'
import ActivateButton from '@/components/activate-button'
import { formatDateRangeShort, formatPriceShort } from '@/lib/trip-format'
import type { MediaRecord } from '@/lib/upload-photo'

type Project = {
  id: string
  title: string
  status: string
  activity_type?: string | null
  region?: string | null
  country?: string | null
  duration_days?: number | null
  group_size?: number | null
  dates_start?: string | null
  dates_end?: string | null
  price_per_person?: number | null
  currency?: string | null
  proposal_date?: string | null
  valid_until?: string | null
  description?: string | null
  latitude?: string | number | null
  longitude?: string | number | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
}

type Owner = {
  business_name?: string | null
  name?: string | null
  brand_logo_url?: string | null
} | null | undefined

type ExpeditionHeroProps = {
  project: Project
  owner: boolean
  heroPhoto: MediaRecord | undefined
  uploadingHero: number
  ownerProfile: Owner
  onHeroUpload: (files: File[]) => void
  onHeroDelete: (mediaId: string) => void
  onSaveProject: (patch: Record<string, unknown>) => Promise<boolean>
}

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024

function formatBrandDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(d)
    .toUpperCase()
}

/**
 * Format lat/lng like "48°51′N · 02°20′E" for the eyebrow line.
 * Returns empty string when both are missing or zero (placeholder DB values).
 */
function formatCoords(
  lat: string | number | null | undefined,
  lng: string | number | null | undefined,
): string {
  const la = lat === null || lat === undefined ? null : Number(lat)
  const ln = lng === null || lng === undefined ? null : Number(lng)
  if (la === null || ln === null) return ''
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return ''
  if (Math.abs(la) < 0.01 && Math.abs(ln) < 0.01) return ''
  const fmt = (n: number, pos: string, neg: string) => {
    const sign = n >= 0 ? pos : neg
    const abs = Math.abs(n)
    const deg = Math.floor(abs)
    const min = Math.floor((abs - deg) * 60)
    return `${String(deg).padStart(2, '0')}°${String(min).padStart(2, '0')}′${sign}`
  }
  return `${fmt(la, 'N', 'S')} · ${fmt(ln, 'E', 'W')}`
}

/**
 * Expedition — hero.
 *
 * Full-bleed dark photo with bottom-up gradient. Top brand strip with
 * "WAYTICO/EXPEDITIONS" + proposal/valid dates. Ochre ticker line at the
 * top spans the width with chapter eyebrow. Title block at the bottom:
 * coords, large display title, lede, and a stats row using EDStat-style
 * thin-rule cards.
 *
 * Title is one editable string; uppercase comes from CSS (.e-display
 * inherits Archivo bold + uppercase).
 */
export function ExpeditionHero({
  project: p,
  owner,
  heroPhoto,
  uploadingHero,
  ownerProfile,
  onHeroUpload,
  onHeroDelete,
  onSaveProject,
}: ExpeditionHeroProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const filterFiles = (list: File[]): File[] => {
    const valid = list.filter((f) => ACCEPT.includes(f.type) && f.size <= MAX_SIZE)
    if (valid.length !== list.length) {
      toast.error('Some files skipped — use JPEG/PNG/WebP, max 15MB')
    }
    return valid
  }

  const dropHandlers = owner
    ? {
        onDragEnter: (e: React.DragEvent) => {
          e.preventDefault()
          if (e.dataTransfer?.types?.includes('Files')) setDragOver(true)
        },
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault()
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
        },
        onDragLeave: (e: React.DragEvent) => {
          if (e.currentTarget === e.target) setDragOver(false)
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault()
          setDragOver(false)
          const files = filterFiles(Array.from(e.dataTransfer?.files || []))
          if (files.length) onHeroUpload(files)
        },
      }
    : {}

  const datesShort = formatDateRangeShort(p.dates_start, p.dates_end)
  const priceText = formatPriceShort(p.price_per_person, p.currency)
  const coords = formatCoords(p.latitude, p.longitude)
  const region = [p.region, p.country].filter(Boolean).join(' · ').toUpperCase()
  const headerLabel = ownerProfile?.business_name
    ? `WAYTICO/${ownerProfile.business_name.toUpperCase()}`
    : 'WAYTICO/EXPEDITIONS'

  return (
    <section
      {...dropHandlers}
      className={`relative group ${
        dragOver ? 'ring-4 ring-[color:var(--e-ochre)] ring-inset' : ''
      }`}
      style={{ minHeight: 'clamp(640px, 85vh, 920px)' }}
    >
      {heroPhoto ? (
        <div
          className="e-hero-photo absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(10,8,6,0.5) 0%, rgba(10,8,6,0.2) 40%, rgba(10,8,6,0.9) 100%), url(${heroPhoto.url})`,
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'var(--e-bg-deep)' }}
        />
      )}

      {owner && (
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT.join(',')}
          multiple
          className="hidden"
          onChange={(e) => {
            const files = filterFiles(Array.from(e.target.files || []))
            e.target.value = ''
            if (files.length) onHeroUpload(files)
          }}
        />
      )}

      {owner && heroPhoto && (
        <button
          type="button"
          onClick={() => onHeroDelete(heroPhoto.id)}
          className="absolute top-4 right-4 z-20 rounded-full p-2 bg-chrome-bg text-chrome-fg-soft border border-chrome-border opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:text-chrome-fg"
          aria-label="Delete hero photo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <div
            className="rounded-full bg-[color:var(--e-cream)] px-5 py-2 text-sm font-medium"
            style={{ color: 'var(--e-bg)' }}
          >
            Drop photo to set as hero
          </div>
        </div>
      )}

      {/* Top brand strip */}
      <div
        className="relative flex flex-wrap justify-between items-center gap-3 px-4 md:px-14 py-5 md:py-8"
        style={{ color: 'var(--e-cream)' }}
      >
        <div className="e-display flex items-center gap-2" style={{ fontSize: 18, letterSpacing: '0.02em' }}>
          {ownerProfile?.brand_logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ownerProfile.brand_logo_url}
              alt=""
              className="h-6 w-auto object-contain"
              style={{ filter: 'brightness(1.6)' }}
            />
          )}
          <span>{headerLabel.split('/')[0]}<span style={{ color: 'var(--e-ochre)' }}>/</span>{headerLabel.split('/').slice(1).join('/')}</span>
        </div>
        <div className="flex flex-wrap gap-6 md:gap-10 items-center">
          {p.proposal_date && (
            <div className="e-mono" style={{ color: 'var(--e-cream-mute)' }}>
              PROPOSAL № {p.id ? p.id.slice(0, 8).toUpperCase() : ''}
            </div>
          )}
          {p.valid_until && (
            <div className="e-mono" style={{ color: 'var(--e-cream-mute)' }}>
              VALID → {formatBrandDate(p.valid_until)}
            </div>
          )}
        </div>
      </div>

      {/* Ticker */}
      <div
        className="absolute top-24 md:top-28 left-4 right-4 md:left-14 md:right-14 flex items-center gap-3 md:gap-5"
        aria-hidden="true"
      >
        <div className="flex-1 h-px" style={{ background: 'var(--e-rule-2)' }} />
        <div className="e-mono" style={{ color: 'var(--e-ochre)' }}>
          ◆ EXPEDITION{p.activity_type ? ` · ${p.activity_type.toUpperCase()}` : ''} ◆
        </div>
        <div className="flex-1 h-px" style={{ background: 'var(--e-rule-2)' }} />
      </div>

      {/* Title + stats */}
      <div
        className="absolute left-4 right-4 md:left-14 md:right-14"
        style={{
          bottom: 'clamp(40px, 14vw, 120px)',
          color: 'var(--e-cream)',
        }}
      >
        {(coords || region) && (
          <div
            className="e-mono mb-7 md:mb-9"
            style={{ color: 'var(--e-ochre)' }}
          >
            {coords && <span>{coords}</span>}
            {coords && region && <span>&nbsp;·&nbsp;</span>}
            {region && <span>{region}</span>}
          </div>
        )}
        <h1
          className="e-display"
          style={{
            fontSize: 'clamp(3.5rem, 12vw, 11.5rem)',
            lineHeight: 0.82,
            margin: 0,
            letterSpacing: '-0.03em',
          }}
        >
          <EditableField
            as="text"
            editable={owner}
            value={p.title}
            required
            className="w-full"
            onSave={(v) => onSaveProject({ title: v })}
          />
        </h1>
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-8 mt-10 md:mt-16">
          {p.description && (
            <p
              className="e-body"
              style={{
                fontSize: 'clamp(1rem, 1.3vw, 1.1875rem)',
                color: 'var(--e-cream-mute)',
                maxWidth: 520,
                lineHeight: 1.5,
              }}
            >
              {p.description.split(/\n\n+/)[0]}
            </p>
          )}
          <div className="flex flex-wrap gap-6 md:gap-14">
            <ExpeditionHeroStat
              label="DEPARTURE"
              value={datesShort.split('—')[0]?.trim().toUpperCase() || '—'}
              sub={datesShort.includes('—') ? datesShort.split('—')[1]?.trim().toUpperCase() : ''}
            />
            <ExpeditionHeroStat
              label="DURATION"
              value={p.duration_days ? String(p.duration_days).padStart(2, '0') : '—'}
              sub={p.duration_days ? 'DAYS' : ''}
            />
            <ExpeditionHeroStat
              label="GROUP"
              value={p.group_size ? String(p.group_size).padStart(2, '0') : '—'}
              sub={p.group_size ? 'TRAVELERS' : ''}
            />
            <ExpeditionHeroStat
              label="FROM"
              value={priceText || '—'}
              sub={priceText ? 'PER TRAVELER' : ''}
              accent
            />
          </div>
        </div>

        {/* Activate (quoted only) */}
        {p.status === 'quoted' && p.id && (
          <div className="mt-8 md:mt-12">
            <ActivateButton projectId={p.id} publicStatus={p.status} />
          </div>
        )}

        {/* Empty state for owners without a hero photo */}
        {!heroPhoto && owner && (
          <div className="mt-8 md:mt-10">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploadingHero > 0}
              className="e-btn-ghost inline-flex items-center gap-2 disabled:opacity-60"
            >
              <ImagePlus className="w-4 h-4" />
              {uploadingHero > 0 ? 'UPLOADING…' : 'ADD HERO PHOTO'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function ExpeditionHeroStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      className="pt-3.5 min-w-[120px]"
      style={{ borderTop: '1px solid rgba(232,223,207,0.35)' }}
    >
      <div
        className="e-mono mb-2.5"
        style={{ color: 'var(--e-cream-mute)' }}
      >
        {label}
      </div>
      <div
        className="e-display"
        style={{
          fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
          color: accent ? 'var(--e-ochre)' : 'var(--e-cream)',
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          className="e-mono mt-1.5"
          style={{ color: 'var(--e-ink-dim)', fontSize: 9 }}
        >
          {sub}
        </div>
      )}
    </div>
  )
}
