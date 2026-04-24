'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Trash2 } from 'lucide-react'
import { EditableField } from '@/components/editable/editable-field'
import ActivateButton from '@/components/activate-button'
import { formatDateRange, formatPriceShort, currencySymbol } from '@/lib/trip-format'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
}

type Owner = {
  business_name?: string | null
  name?: string | null
  brand_logo_url?: string | null
  brand_tagline?: string | null
} | null | undefined

type JournalHeroProps = {
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
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(d)
}

function brandLeft(ownerProfile: Owner): string {
  const name = ownerProfile?.business_name || ownerProfile?.name
  return name ? `Waytico · ${name}` : 'Waytico'
}

/**
 * Journal — hero.
 *
 * Portrait-style editorial hero: full-bleed photo, brand strip top, title
 * block bottom-left, 5-stat rule at the bottom. Mobile keeps the same
 * structure but stacks stats 2×2.
 *
 * Title is edited as a single plain string (no split across `in` / `<em>` —
 * see TZ-5 note (b)). Activate button lives here as the primary CTA.
 */
export function JournalHero({
  project: p,
  owner,
  heroPhoto,
  uploadingHero,
  ownerProfile,
  onHeroUpload,
  onHeroDelete,
  onSaveProject,
}: JournalHeroProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const hasBg = !!heroPhoto
  const showEmptyState = !hasBg && owner

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

  const datesText =
    formatDateRange(p.dates_start, p.dates_end) ||
    (owner ? 'Set dates' : '')
  const regionText = [p.region, p.country].filter(Boolean).join(', ')
  const priceText = formatPriceShort(p.price_per_person, p.currency)

  return (
    <section
      {...dropHandlers}
      className={`j-section group relative overflow-hidden ${
        dragOver ? 'ring-4 ring-[color:var(--j-terra)] ring-inset' : ''
      }`}
      style={{
        minHeight: 720,
        background: hasBg ? 'var(--j-ink)' : 'var(--j-cream-deep)',
      }}
    >
      {/* Background photo + gradient */}
      {hasBg && heroPhoto && (
        <div
          className="j-hero-img absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(28,24,19,0.25) 0%, rgba(28,24,19,0.1) 35%, rgba(28,24,19,0.65) 100%), url(${heroPhoto.url})`,
          }}
        />
      )}

      {/* Hidden file input + hero delete (owner only) */}
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
      {owner && hasBg && heroPhoto && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onHeroDelete(heroPhoto.id)
          }}
          className="absolute top-4 right-4 z-20 rounded-full p-2 bg-chrome-bg text-chrome-fg-soft border border-chrome-border opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:text-chrome-fg"
          aria-label="Delete hero photo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Drop overlay */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40">
          <div className="rounded-full bg-[color:var(--j-cream)] px-5 py-2 text-sm font-medium text-[color:var(--j-ink)] shadow-lg">
            Drop photo to set as hero
          </div>
        </div>
      )}

      {/* Brand strip */}
      <div
        className="relative flex flex-wrap gap-3 items-center justify-between px-6 md:px-[72px] py-5 md:py-8"
        style={{ color: hasBg ? 'var(--j-paper)' : 'var(--j-ink-soft)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {ownerProfile?.brand_logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ownerProfile.brand_logo_url}
              alt=""
              className="h-6 w-auto object-contain"
              style={{ filter: hasBg ? 'brightness(1.6)' : undefined }}
            />
          ) : null}
          <div
            className="j-mono truncate"
            style={{ color: hasBg ? 'rgba(250,246,236,0.85)' : 'var(--j-ink-soft)' }}
          >
            {brandLeft(ownerProfile)}
          </div>
        </div>
        <div className="flex gap-6 flex-wrap">
          {p.proposal_date && (
            <span
              className="j-mono"
              style={{ color: hasBg ? 'rgba(250,246,236,0.7)' : 'var(--j-ink-mute)' }}
            >
              Proposal · {formatBrandDate(p.proposal_date)}
            </span>
          )}
          {p.valid_until && (
            <span
              className="j-mono"
              style={{ color: hasBg ? 'rgba(250,246,236,0.7)' : 'var(--j-ink-mute)' }}
            >
              Valid through {formatBrandDate(p.valid_until)}
            </span>
          )}
        </div>
      </div>

      {/* Title block */}
      <div
        className="relative px-6 md:px-[72px] pb-10 md:pb-20 pt-6 md:pt-24"
        style={{ color: hasBg ? 'var(--j-paper)' : 'var(--j-ink)' }}
      >
        <div
          className="j-mono mb-5 md:mb-6"
          style={{ color: hasBg ? 'rgba(250,246,236,0.85)' : 'var(--j-terra)' }}
        >
          <span style={{ color: 'var(--j-terra)' }}>◆</span>
          &nbsp;&nbsp;A private circuit{p.activity_type ? ` · ${p.activity_type}` : ''}
        </div>
        <h1
          className="j-serif"
          style={{
            fontSize: 'clamp(3.4rem, 8vw, 8rem)',
            lineHeight: 0.95,
            margin: 0,
            letterSpacing: '-0.02em',
            maxWidth: 1100,
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

        {/* Stat rule */}
        <div
          className="mt-10 md:mt-16 pt-6 md:pt-8 border-t grid grid-cols-2 md:flex md:flex-wrap gap-6 md:gap-12"
          style={{
            borderColor: hasBg ? 'rgba(250,246,236,0.3)' : 'var(--j-rule)',
          }}
        >
          <HeroStat
            label="Dates"
            onBg={hasBg}
            value={
              <EditableField
                as="date"
                editable={owner}
                value={p.dates_start}
                placeholder="Start"
                onSave={(v) => onSaveProject({ datesStart: v })}
              />
            }
            value2={
              p.dates_end || owner ? (
                <EditableField
                  as="date"
                  editable={owner}
                  value={p.dates_end}
                  placeholder="End"
                  onSave={(v) => onSaveProject({ datesEnd: v })}
                />
              ) : undefined
            }
            display={datesText}
            preferDisplay={!owner}
          />
          <HeroStat
            label="Duration"
            onBg={hasBg}
            value={
              <EditableField
                as="number"
                editable={owner}
                value={p.duration_days}
                placeholder="—"
                suffix="days"
                min={1}
                onSave={(v) => onSaveProject({ durationDays: v })}
              />
            }
          />
          <HeroStat
            label="Region"
            onBg={hasBg}
            value={
              <EditableField
                as="text"
                editable={owner}
                value={regionText || null}
                placeholder="Region"
                onSave={(v) => onSaveProject({ region: v })}
              />
            }
          />
          <HeroStat
            label="Group"
            onBg={hasBg}
            value={
              <EditableField
                as="number"
                editable={owner}
                value={p.group_size}
                placeholder="—"
                suffix="people"
                min={1}
                onSave={(v) => onSaveProject({ groupSize: v })}
              />
            }
          />
          <HeroStat
            label="From"
            onBg={hasBg}
            accent
            value={
              <span>
                <EditableField
                  as="text"
                  editable={owner}
                  value={p.currency || 'USD'}
                  maxLength={3}
                  className="uppercase"
                  onSave={(v) => onSaveProject({ currency: v.toUpperCase() })}
                />
                <EditableField
                  as="number"
                  editable={owner}
                  value={p.price_per_person}
                  placeholder="Price"
                  min={0}
                  onSave={(v) => onSaveProject({ pricePerPerson: v })}
                />
              </span>
            }
            display={priceText || (p.currency ? currencySymbol(p.currency) : '')}
            preferDisplay={!owner && !!priceText}
          />
        </div>

        {/* Empty-state hero photo CTA */}
        {showEmptyState && (
          <div className="mt-10">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploadingHero > 0}
              className="inline-flex items-center gap-2 rounded-full border-2 border-dashed px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
              style={{
                borderColor: 'var(--j-rule)',
                color: 'var(--j-ink-mute)',
              }}
            >
              <ImagePlus className="h-4 w-4" />
              {uploadingHero > 0 ? 'Uploading…' : 'Add hero photo'}
            </button>
          </div>
        )}

        {/* Primary CTA: Activate (only when quoted) */}
        {p.status === 'quoted' && p.id && (
          <div className="mt-10 md:mt-14">
            <ActivateButton projectId={p.id} publicStatus={p.status} />
          </div>
        )}
      </div>

      {/* Uploading indicator when replacing existing hero */}
      {owner && hasBg && uploadingHero > 0 && (
        <div className="absolute bottom-4 left-4 z-10">
          <span className="rounded-full bg-chrome-bg text-chrome-fg border border-chrome-border px-3 py-1 text-xs">
            Uploading…
          </span>
        </div>
      )}
    </section>
  )
}

type HeroStatProps = {
  label: string
  value: React.ReactNode
  value2?: React.ReactNode
  display?: string
  preferDisplay?: boolean
  onBg: boolean
  accent?: boolean
}

function HeroStat({ label, value, value2, display, preferDisplay, onBg, accent }: HeroStatProps) {
  const labelColor = onBg ? 'rgba(250,246,236,0.65)' : 'var(--j-ink-mute)'
  const valueColor = accent
    ? onBg
      ? '#E8B893'
      : 'var(--j-terra)'
    : onBg
      ? 'var(--j-paper)'
      : 'var(--j-ink)'

  return (
    <div className="flex-shrink-0">
      <div className="j-mono mb-2" style={{ color: labelColor }}>
        {label}
      </div>
      <div
        className="j-serif"
        style={{ fontSize: 22, fontWeight: 400, color: valueColor }}
      >
        {preferDisplay && display ? (
          display
        ) : (
          <>
            {value}
            {value2 && (
              <>
                <span className="mx-1.5 opacity-60">–</span>
                {value2}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
