'use client'

import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ThemePropsV2 } from '@/types/theme-v2'
import { fmtDate } from '@/lib/trip-format'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { PublicStatusPill } from '@/components/shared-v2/public-status-pill'
import { ContactAgentMenu } from '@/components/shared-v2/contact-agent-menu'
import { UI } from '@/lib/ui-strings'

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 15 * 1024 * 1024

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Hero({ data }: ThemePropsV2) {
  const p = data.project
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable

  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const brandName = data.owner?.brand_name?.trim() || ''
  const tripRef = `№ ${p.id.replace(/-/g, '').slice(0, 4).toUpperCase()}`

  // Issued / Valid-until dates — falls back on created_at via the
  // pre-computed bundle (2.6); legacy proposal_date / valid_until on
  // the project still wins when set.
  const proposalDateISO = ctx?.precomputed.proposalDateISO ?? null
  const validUntilISO = ctx?.precomputed.validUntilISO ?? null
  const issuedDate = fmtDate(proposalDateISO)
  const validDate = fmtDate(validUntilISO)

  const country = p.country?.trim() || null
  const durationLabel = p.duration_days ? `${p.duration_days} DAYS` : null
  const eyebrowTop = [country?.toUpperCase(), durationLabel].filter(Boolean).join(' — ') || null

  const region = p.region?.trim() || null

  const heroMedia = data.media.find((m) => m.placement === 'hero')

  // ── HeroStats data (Option A from 2.1.2 spec) ─────────────────────────
  const dateRange = ctx?.precomputed.dateRange ?? null
  const heroHeadlineFormatted = ctx?.precomputed.heroHeadlineFormatted ?? null

  const validateFiles = (files: FileList | File[]): File[] => {
    const list = Array.from(files)
    const valid = list.filter(
      (f) => ALLOWED_MIMES.includes(f.type) && f.size <= MAX_SIZE,
    )
    if (valid.length !== list.length) {
      toast.error(
        `${list.length - valid.length} file(s) skipped — use JPEG/PNG/WebP, max 15MB`,
      )
    }
    return valid
  }

  const onPickClick = () => {
    if (ctx?.interceptPhotoAction) {
      ctx.interceptPhotoAction()
      return
    }
    fileInputRef.current?.click()
  }

  return (
    <section
      className="mag-hero"
      onDragOver={(e) => {
        if (!editable) return
        e.preventDefault()
        if (ctx?.interceptPhotoAction) return
        if (e.dataTransfer?.types?.includes('Files')) setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!editable) return
        if (e.currentTarget === e.target) setDragOver(false)
      }}
      onDrop={(e) => {
        if (!editable) return
        e.preventDefault()
        setDragOver(false)
        if (ctx?.interceptPhotoAction) {
          ctx.interceptPhotoAction()
          return
        }
        const list = validateFiles(e.dataTransfer?.files ?? [])
        if (list.length) void ctx!.photo.handleHeroUpload(list)
      }}
    >
      {p.cover_image_url ? (
        <img className="mag-hero__photo" src={p.cover_image_url} alt={p.title ?? ''} />
      ) : null}

      <div className="mag-hero__veil" />
      <div className="mag-hero__scrim" />

      {dragOver && (
        <div className="mag-hero__drop-overlay">
          <div className="mag-hero__drop-pill">DROP TO REPLACE HERO</div>
        </div>
      )}

      {/* Top brand strip — brand left, trip ref right (existing). */}
      <div className="mag-hero__strip">
        <div className="mag-hero__strip-cell">
          {brandName ? brandName.toUpperCase() : ' '}
        </div>
        <div className="mag-hero__strip-cell">{tripRef}</div>
      </div>

      {/* HeroTopStrip — status pill + dates + contact-agent menu.
          Public/anon/showcase modes show the pill + menu; owner mode
          replaces the dates with EditableField widgets and drops the
          menu (operator has the contacts section + chrome share menu). */}
      <div className="mag-hero__topstrip">
        <div className="mag-hero__topstrip-cell mag-hero__topstrip-cell--left">
          {!editable && p.status && (
            <PublicStatusPill status={p.status} onPhoto />
          )}
        </div>

        {(editable || issuedDate || validDate) && (
          <div className="mag-hero__topstrip-cell mag-hero__topstrip-cell--center">
            {editable ? (
              <span className="mag-hero__topstrip-dates">
                {UI.proposal}{' '}
                <EditableField
                  as="date"
                  value={proposalDateISO}
                  editable
                  onSave={(v) =>
                    ctx!.mutations.saveProjectPatch({ proposalDate: v || null })
                  }
                />
                <span className="mag-hero__topstrip-dates-dash">—</span>
                {UI.validUntil}{' '}
                <EditableField
                  as="date"
                  value={validUntilISO}
                  editable
                  onSave={(v) =>
                    ctx!.mutations.saveProjectPatch({ validUntil: v || null })
                  }
                />
              </span>
            ) : (
              <span className="mag-hero__topstrip-dates">
                {issuedDate && (
                  <>
                    {UI.proposal} {issuedDate.toUpperCase()}
                  </>
                )}
                {issuedDate && validDate && (
                  <span className="mag-hero__topstrip-dates-dash">—</span>
                )}
                {validDate && (
                  <>
                    {UI.validUntil} {validDate.toUpperCase()}
                  </>
                )}
              </span>
            )}
          </div>
        )}

        <div className="mag-hero__topstrip-cell mag-hero__topstrip-cell--right">
          {!editable && (
            <ContactAgentMenu
              owner={data.owner}
              operatorContact={p.operator_contact ?? null}
              onPhoto
            />
          )}
        </div>
      </div>

      {/* Owner photo controls — top-right corner */}
      {editable && (
        <div className="mag-hero__owner-controls">
          <button
            type="button"
            onClick={onPickClick}
            aria-label="Replace hero photo"
            className="mag-btn-overlay"
          >
            <ImagePlus size={14} />
            REPLACE
          </button>
          {heroMedia && (
            <button
              type="button"
              onClick={() => {
                if (ctx?.interceptPhotoAction) {
                  ctx.interceptPhotoAction()
                  return
                }
                void ctx!.photo.handleDelete(heroMedia.id)
              }}
              aria-label="Remove hero photo"
              className="mag-btn-overlay-icon"
            >
              <Trash2 size={14} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIMES.join(',')}
            hidden
            onChange={(e) => {
              const list = validateFiles(e.target.files ?? [])
              if (list.length) void ctx!.photo.handleHeroUpload(list)
              if (e.target) e.target.value = ''
            }}
          />
        </div>
      )}

      {/* Headline group */}
      <div className="mag-hero__content">
        {eyebrowTop && (
          <div className="mag-hero__eyebrow-top">{eyebrowTop}</div>
        )}

        <div className="mag-hero__headline">
          {editable ? (
            <EditableField
              as="text"
              value={p.title}
              editable
              placeholder="Trip title"
              onSave={(v) => ctx!.mutations.saveProjectPatch({ title: v })}
              renderDisplay={(v) => <span>{v}</span>}
            />
          ) : (
            <h1 className="mag-hero__headline">
              {p.title || ' '}
            </h1>
          )}

          {(p.tagline || editable) && (
            <em className="mag-hero__tagline">
              {editable ? (
                <EditableField
                  as="text"
                  value={p.tagline}
                  editable
                  placeholder="Add a tagline"
                  onSave={(v) => ctx!.mutations.saveProjectPatch({ tagline: v })}
                  renderDisplay={(v) => <span>{v}</span>}
                />
              ) : (
                p.tagline
              )}
            </em>
          )}
        </div>

        {region && (
          <div className="mag-hero__region">
            <div className="mag-hero__region-text">{region.toUpperCase()}</div>
          </div>
        )}

        <HeroStats
          editable={editable}
          dateRange={dateRange}
          datesStart={p.dates_start ?? null}
          datesEnd={p.dates_end ?? null}
          durationDays={p.duration_days ?? null}
          groupSize={p.group_size ?? null}
          headline={heroHeadlineFormatted}
          onSaveProject={(patch) => ctx!.mutations.saveProjectPatch(patch)}
        />
      </div>
    </section>
  )
}

/**
 * Hero stat tiles — Dates / Duration / Group / Price.
 *
 * Owner mode:
 *   - Dates + Group are EditableField (inline edit).
 *   - Duration is a read-only click-scroll to #itinerary (the actual
 *     editing happens by add/remove of days down there; an inline number
 *     editor would let the operator overwrite a value the itinerary
 *     wouldn't reshape to match — see legacy hero.tsx comment).
 *   - Price is a read-only click-scroll to #price (the headline edit
 *     lives there together with the pricing-mode dropdown; an inline
 *     editor here can't represent the per-traveler / for-the-group /
 *     custom-label trio).
 *
 * Hidden when all four tiles are empty in public mode.
 */
function HeroStats({
  editable,
  dateRange,
  datesStart,
  datesEnd,
  durationDays,
  groupSize,
  headline,
  onSaveProject,
}: {
  editable: boolean
  dateRange: string | null
  datesStart: string | null
  datesEnd: string | null
  durationDays: number | null
  groupSize: number | null
  headline: string | null
  onSaveProject: (patch: Record<string, unknown>) => Promise<boolean>
}) {
  const anyValue = !!(dateRange || durationDays != null || groupSize != null || headline)
  if (!editable && !anyValue) return null

  return (
    <div className="mag-hero__stats">
      <div className="mag-hero__stat-tile">
        <div className="mag-hero__stat-eyebrow">DATES</div>
        <div className="mag-hero__stat-value">
          {editable ? (
            <span className="mag-hero__stat-date-row">
              <EditableField
                as="date"
                value={datesStart}
                editable
                placeholder="Start"
                onSave={(v) => onSaveProject({ datesStart: v })}
              />
              <span className="mag-hero__stat-dash">–</span>
              <EditableField
                as="date"
                value={datesEnd}
                editable
                placeholder="End"
                onSave={(v) => onSaveProject({ datesEnd: v })}
              />
            </span>
          ) : (
            dateRange || <span className="mag-hero__stat-empty">—</span>
          )}
        </div>
      </div>

      <div className="mag-hero__stat-tile">
        <div className="mag-hero__stat-eyebrow">DURATION</div>
        <div className="mag-hero__stat-value">
          {editable ? (
            <a
              href="#itinerary"
              onClick={scrollTo('itinerary')}
              className="mag-hero__stat-link"
              title="Add or remove days in the itinerary below"
            >
              {durationDays != null ? (
                `${durationDays} ${UI.days}`
              ) : (
                <span className="mag-hero__stat-empty">—</span>
              )}
            </a>
          ) : durationDays != null ? (
            `${durationDays} ${UI.days}`
          ) : (
            <span className="mag-hero__stat-empty">—</span>
          )}
        </div>
      </div>

      <div className="mag-hero__stat-tile">
        <div className="mag-hero__stat-eyebrow">GROUP</div>
        <div className="mag-hero__stat-value">
          {editable ? (
            <span className="mag-hero__stat-group-row">
              <EditableField
                as="number"
                value={groupSize}
                editable
                placeholder="0"
                onSave={(v) => onSaveProject({ groupSize: v })}
              />
              <span className="mag-hero__stat-suffix">{UI.travelers}</span>
            </span>
          ) : groupSize ? (
            `${groupSize} ${UI.travelers}`
          ) : (
            <span className="mag-hero__stat-empty">—</span>
          )}
        </div>
      </div>

      <div className="mag-hero__stat-tile">
        <div className="mag-hero__stat-eyebrow">PRICE</div>
        <div className="mag-hero__stat-value">
          {editable ? (
            <a
              href="#price"
              onClick={scrollTo('price')}
              className="mag-hero__stat-link"
              title="Edit in the Price section below"
            >
              {headline ?? (
                <span className="mag-hero__stat-empty">Add price</span>
              )}
            </a>
          ) : (
            headline ?? <span className="mag-hero__stat-empty">—</span>
          )}
        </div>
      </div>
    </div>
  )
}
