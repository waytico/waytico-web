'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Trash2 } from 'lucide-react'
import { EditableField } from '@/components/editable/editable-field'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
}

type Owner = {
  business_name?: string | null
  name?: string | null
  brand_logo_url?: string | null
  brand_tagline?: string | null
} | null | undefined

type Host = {
  name?: string | null
  title?: string | null
  avatarUrl?: string | null
} | null | undefined

type AtelierHeroProps = {
  project: Project
  owner: boolean
  heroPhoto: MediaRecord | undefined
  uploadingHero: number
  ownerProfile: Owner
  host: Host
  onHeroUpload: (files: File[]) => void
  onHeroDelete: (mediaId: string) => void
  onSaveProject: (patch: Record<string, unknown>) => Promise<boolean>
}

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024

function formatBrandDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)
}

/**
 * Atelier — hero.
 *
 * Two-column layout: left rail with eyebrow / large display title (with two
 * coloured accent lines) / overview lede / pill stats + price + Activate.
 * Right rail: rounded image with floating "slow luxury" sticker and a host
 * card overlay (avatar + name on teal background) when host data is present.
 *
 * Title is a single editable string (TZ-5 note (b)) — canvas's three-line
 * "A cultural / rendez-vous / in Île-de-France" decomposition is hard-coded
 * decoration; we render the full title across all three colour lines via
 * CSS without splitting the text.
 */
export function AtelierHero({
  project: p,
  owner,
  heroPhoto,
  uploadingHero,
  ownerProfile,
  host,
  onHeroUpload,
  onHeroDelete,
  onSaveProject,
}: AtelierHeroProps) {
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

  return (
    <section className="relative max-w-5xl mx-auto px-4 pt-7 pb-12 md:pb-18">
      {/* Proposal validity strip — auto-filled at trip creation, editable
          by owner. Hidden for clients when both fields are empty. */}
      {(owner || p.proposal_date || p.valid_until) && (
        <div className="flex flex-wrap justify-end items-center gap-3 mb-9">
          {(owner || p.proposal_date) && (
            <span className="a-mono flex items-center gap-2" style={{ color: 'var(--a-mute)' }}>
              <span style={{ opacity: 0.7 }}>Proposal ·</span>
              <EditableField
                as="date"
                editable={owner}
                value={p.proposal_date}
                placeholder="Set date"
                formatDisplay={formatBrandDate}
                onSave={(v) => onSaveProject({ proposalDate: v })}
              />
            </span>
          )}
          {(owner || p.valid_until) && (
            <span className="a-badge a-badge-sage">
              <span style={{ opacity: 0.7, marginRight: 4 }}>Valid through</span>
              <EditableField
                as="date"
                editable={owner}
                value={p.valid_until}
                placeholder="Set date"
                formatDisplay={formatBrandDate}
                onSave={(v) => onSaveProject({ validUntil: v })}
              />
            </span>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
        {/* LEFT: copy column */}
        <div className="md:pt-5">
          {p.activity_type && (
            <div className="a-eyebrow mb-7">{p.activity_type}</div>
          )}
          <h1
            className="a-display"
            style={{
              fontSize: 'clamp(3rem, 9vw, 8rem)',
              lineHeight: 0.95,
              margin: 0,
              letterSpacing: '-0.035em',
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

          {p.description && (
            <p
              className="a-sans mt-7"
              style={{
                fontSize: 'clamp(1rem, 1.4vw, 1.25rem)',
                color: 'var(--a-ink-2)',
                maxWidth: 520,
                lineHeight: 1.55,
              }}
            >
              {p.description.split(/\n\n+/)[0]}
            </p>
          )}

          {/* Stat pills */}
          <div className="flex gap-2.5 mt-8 md:mt-10 flex-wrap">
            {(p.region || p.country) && (
              <span className="a-badge">
                📍 {(() => { const r = (p.region || '').trim(); const co = (p.country || '').trim(); if (!r) return co; if (!co) return r; return r.toLowerCase().includes(co.toLowerCase()) ? r : `${r}, ${co}`; })()}
              </span>
            )}
            {datesShort && <span className="a-badge a-badge-coral">✦ {datesShort}</span>}
            {p.duration_days ? (
              <span className="a-badge a-badge-sage">{p.duration_days} days</span>
            ) : null}
            {p.group_size ? <span className="a-badge">{p.group_size} travelers</span> : null}
          </div>

          {/* Price + Activate row */}
          <div className="mt-10 md:mt-12 flex flex-wrap items-end gap-7">
            {(priceText || owner) && (
              <div>
                {owner && (
                  <div className="a-mono mb-1.5" style={{ color: 'var(--a-mute)' }}>
                    From
                  </div>
                )}
                <div
                  className="a-display"
                  style={{
                    fontSize: 'clamp(2.75rem, 6vw, 4.5rem)',
                    lineHeight: 0.9,
                    color: 'var(--a-teal)',
                  }}
                >
                  {priceText || (
                    <EditableField
                      as="number"
                      editable={owner}
                      value={p.price_per_person}
                      placeholder="—"
                      min={0}
                      onSave={(v) => onSaveProject({ pricePerPerson: v })}
                    />
                  )}
                </div>
                {owner && (
                  <div className="a-mono mt-1.5" style={{ color: 'var(--a-mute)' }}>
                    per traveler
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: image column with overlays */}
        <div
          {...dropHandlers}
          className={`relative pt-5 group ${
            dragOver ? 'ring-4 ring-[color:var(--a-coral)] ring-inset rounded-xl' : ''
          }`}
        >
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

          <div
            className="relative w-full overflow-hidden rounded-xl"
            style={{ height: 'clamp(320px, 50vw, 680px)' }}
          >
            {heroPhoto ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroPhoto.url}
                  alt=""
                  className="w-full h-full object-cover block"
                />
                {owner && (
                  <button
                    type="button"
                    onClick={() => onHeroDelete(heroPhoto.id)}
                    className="absolute top-3 right-3 z-10 rounded-full p-2 bg-chrome-bg text-chrome-fg-soft border border-chrome-border opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:text-chrome-fg"
                    aria-label="Delete hero photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </>
            ) : owner ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploadingHero > 0}
                className="w-full h-full flex flex-col items-center justify-center gap-3 transition-colors disabled:opacity-60"
                style={{
                  background: 'var(--a-paper-2)',
                  color: 'var(--a-mute)',
                  border: '2px dashed var(--a-rule)',
                }}
              >
                <ImagePlus className="w-7 h-7" />
                <span className="a-mono">
                  {uploadingHero > 0 ? 'Uploading…' : 'Add hero photo'}
                </span>
              </button>
            ) : (
              <div
                className="w-full h-full"
                style={{ background: 'var(--a-paper-2)' }}
              />
            )}
          </div>

          {/* Sticker (decorative) */}
          {heroPhoto && (
            <div
              className="a-sticker"
              style={{ right: -12, top: 40 }}
              aria-hidden="true"
            >
              {p.activity_type
                ? `${p.activity_type}\n${new Date().getFullYear()}`
                : 'Curated\nby hand'}
            </div>
          )}

          {/* Host overlay card (matches canvas left/bottom corner) */}
          {host?.name && (
            <div
              className="absolute -left-3 md:-left-8 -bottom-6 md:-bottom-8 flex items-center gap-3 rounded-xl px-4 py-3 md:px-6 md:py-4"
              style={{ background: 'var(--a-teal)' }}
            >
              {host.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={host.avatarUrl}
                  alt=""
                  className="rounded-full object-cover"
                  style={{ width: 48, height: 48 }}
                />
              ) : (
                <div
                  className="rounded-full"
                  style={{
                    width: 48,
                    height: 48,
                    background: 'var(--a-sage)',
                  }}
                />
              )}
              <div>
                <div className="a-mono" style={{ color: 'var(--a-sage)' }}>
                  HOSTED BY
                </div>
                <div
                  className="a-display"
                  style={{ fontSize: 18, color: 'white', lineHeight: 1 }}
                >
                  {host.name}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

