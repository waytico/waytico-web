import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import type { ThemeId } from '@/lib/themes'
import { HERO_STYLE } from '@/lib/themes'
import { fmtDate } from '@/lib/trip-format'

export type HeroOperatorContact = {
  name?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  telegram?: string | null
  website?: string | null
} | null | undefined

type HeroProps = {
  theme: ThemeId
  /** URL of the hero photo, or null for empty / placeholder. */
  heroPhoto: string | null
  /** Status pill — only renders for quoted / active / completed (per TZ-6 §6.2). */
  status: string | null | undefined
  /** Pre-formatted "Jun 18–21, 2026" (or null). */
  dateRange: string | null
  /** Pre-formatted price including currency glyph (or null). */
  pricePerPersonFormatted: string | null
  /** Plain numbers for non-editable cases. */
  durationDays: number | null
  groupSize: number | null
  /** Slots — owner mode fills with EditableField nodes; public mode with strings. */
  activityChipSlot?: ReactNode
  regionEyebrowSlot?: ReactNode
  titleSlot: ReactNode
  /** First paragraph of the description. */
  taglineSlot?: ReactNode
  /** Individual stat overrides. If a slot is undefined, the formatted scalar
   *  above is used. If null, the stat hides (public mode w/ no data).
   *  Owner mode passes EditableField wrappers as slots.
   */
  dateStatSlot?: ReactNode
  durationStatSlot?: ReactNode
  groupStatSlot?: ReactNode
  priceStatSlot?: ReactNode
  /** Owner-only chrome injected into the hero (file inputs, drag indicators,
   *  delete-hero button, "Add hero photo" empty state). When present, the
   *  themed component still renders — we just paint the chrome on top. */
  ownerOverlay?: ReactNode
  /** Proposal lifecycle dates (ISO YYYY-MM-DD). Render as a small top-right
   *  validity badge across all theme variants. Hidden if both null. */
  proposalDate?: string | null
  validUntil?: string | null
  /** Owner-mode slots that wrap the dates with EditableField. When passed,
   *  override the formatted scalar inside the badge. */
  proposalSlot?: ReactNode
  validUntilSlot?: ReactNode
  /** Operator contact strip rendered at the bottom of the meta block.
   *  Hidden if every channel is empty. Theme-tokenised, no chrome styling. */
  operatorContact?: HeroOperatorContact
  /** Whether overlay theme is in light/dark mode — affects validity badge color */
  isDarkBg?: boolean
}

function StatusPill({ status }: { status: string | null | undefined }) {
  if (!status) return null
  if (!['quoted', 'active', 'completed'].includes(status)) return null
  return <span className="tp-status">{UI.status[status] || status}</span>
}

/** Top-right badge: Proposal · {date} / Valid until {date}.
 *  Positioned absolutely — relies on the parent header carrying position:relative. */
function ValidityBadge({
  proposalDate,
  validUntil,
  onPhoto = false,
  proposalSlot,
  validUntilSlot,
}: {
  proposalDate?: string | null
  validUntil?: string | null
  onPhoto?: boolean
  /** When provided, replaces the proposal-line text. Used by the owner page
   *  to wrap the date in an EditableField. */
  proposalSlot?: ReactNode
  validUntilSlot?: ReactNode
}) {
  if (!proposalDate && !validUntil && !proposalSlot && !validUntilSlot) return null
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 3,
        textAlign: 'right',
        fontSize: 11,
        lineHeight: 1.5,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-mono)',
        color: onPhoto ? 'rgba(255,255,255,0.85)' : 'var(--ink-mute)',
        textShadow: onPhoto ? '0 1px 4px rgba(0,0,0,0.4)' : undefined,
      }}
    >
      {(proposalSlot || proposalDate) && (
        <div>
          {UI.proposal} · {proposalSlot ?? (proposalDate ? fmtDate(proposalDate) : null)}
        </div>
      )}
      {(validUntilSlot || validUntil) && (
        <div>
          {UI.validUntil} {validUntilSlot ?? (validUntil ? fmtDate(validUntil) : null)}
        </div>
      )}
    </div>
  )
}

/** Bottom-of-meta operator contact strip: "From {name} · {email} · {phone}". */
function OperatorStrip({ contact }: { contact: HeroOperatorContact }) {
  if (!contact) return null
  const parts: string[] = []
  if (contact.name) parts.push(contact.name as string)
  if (contact.email) parts.push(contact.email as string)
  if (contact.phone) parts.push(contact.phone as string)
  if (parts.length === 0) return null
  return (
    <div
      style={{
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid var(--rule)',
        fontSize: 13,
        color: 'var(--ink-soft)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        alignItems: 'baseline',
      }}
    >
      <span style={{ opacity: 0.7 }}>From</span>
      {parts.map((p, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
          {i > 0 && <span style={{ opacity: 0.4 }}>·</span>}
          <span>{p}</span>
        </span>
      ))}
    </div>
  )
}

/**
 * Hero — single component, three structural variants per TZ-6 §6.2:
 *   editorial  → split   (image right, text left)
 *   expedition → overlay (full-bleed photo, text overlaid)
 *   compact    → card    (text + structured info card on the right, photo below)
 *
 * Variants live as `if (heroStyle === '...')` branches inside this file —
 * NOT separate files in `themes/<theme>/hero.tsx` (TZ-6 §2.1).
 *
 * The component does not know about auth or mutations. Owner-mode
 * editable surfaces and chrome (delete-hero button, empty-state upload
 * CTA, drag indicator) are passed in via slot props.
 */
export function TripHero(props: HeroProps) {
  const { theme, heroPhoto, status, ownerOverlay, proposalDate, validUntil, operatorContact } = props
  const heroStyle = HERO_STYLE[theme]

  // Shared meta block — same data, same labels, restyled per theme via tokens.
  const meta = (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {props.activityChipSlot}
        {props.regionEyebrowSlot}
        <StatusPill status={status} />
      </div>
      <h1 className="tp-display tp-hero-title">{props.titleSlot}</h1>
      {props.taglineSlot && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 18, lineHeight: 1.6, maxWidth: '56ch' }}>
          {props.taglineSlot}
        </p>
      )}
      <HeroStats {...props} />
      <OperatorStrip contact={operatorContact} />
    </>
  )

  if (heroStyle === 'overlay') {
    return (
      <header className="tp-hero--overlay" style={{ position: 'relative' }}>
        <div
          className="tp-hero-bg"
          style={heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined}
        />
        <ValidityBadge proposalDate={proposalDate} validUntil={validUntil} proposalSlot={props.proposalSlot} validUntilSlot={props.validUntilSlot} onPhoto={!!heroPhoto} />
        <div className="tp-container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="tp-hero-meta">{meta}</div>
        </div>
        {ownerOverlay}
      </header>
    )
  }

  if (heroStyle === 'card') {
    return (
      <header style={{ position: 'relative' }}>
        <ValidityBadge proposalDate={proposalDate} validUntil={validUntil} proposalSlot={props.proposalSlot} validUntilSlot={props.validUntilSlot} />
        <div className="tp-container tp-hero--card">
          <div className="tp-hero-meta" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {props.activityChipSlot}
              {props.regionEyebrowSlot}
              <StatusPill status={status} />
            </div>
            <h1 className="tp-display tp-hero-title">{props.titleSlot}</h1>
            {props.taglineSlot && (
              <p style={{ color: 'var(--ink-soft)', fontSize: 17, lineHeight: 1.6, maxWidth: '56ch' }}>
                {props.taglineSlot}
              </p>
            )}
            <OperatorStrip contact={operatorContact} />
          </div>
          <aside className="tp-hero-card-side">
            <CardSideStat label="Dates" valueSlot={props.dateStatSlot} fallback={props.dateRange} />
            <CardSideStat
              label="Duration"
              valueSlot={props.durationStatSlot}
              fallback={props.durationDays != null ? `${props.durationDays} ${UI.days}` : null}
            />
            <CardSideStat
              label="Group size"
              valueSlot={props.groupStatSlot}
              fallback={props.groupSize != null ? `${props.groupSize} ${UI.travelers}` : null}
            />
            <CardSideStat
              label={UI.perTraveler}
              valueSlot={props.priceStatSlot}
              fallback={props.pricePerPersonFormatted}
            />
          </aside>
          <div
            className="tp-hero-photo"
            style={heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined}
          >
            {ownerOverlay}
          </div>
        </div>
      </header>
    )
  }

  // split — editorial (default)
  return (
    <header style={{ position: 'relative' }}>
      <ValidityBadge proposalDate={proposalDate} validUntil={validUntil} proposalSlot={props.proposalSlot} validUntilSlot={props.validUntilSlot} />
      <div className="tp-container tp-hero--split">
        <div className="tp-hero-meta">{meta}</div>
        <div
          className="tp-hero-image"
          style={heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined}
        >
          {ownerOverlay}
        </div>
      </div>
    </header>
  )
}

function HeroStats(props: HeroProps) {
  // Hide the whole row if absolutely nothing is visible (public mode w/ no data).
  const stats: ReactNode[] = []
  const dateValue = props.dateStatSlot ?? props.dateRange
  if (dateValue) {
    stats.push(
      <div className="tp-hero-stat" key="date">
        <span className="v">{dateValue}</span>
        <span className="l">Dates</span>
      </div>,
    )
  }
  const durationValue =
    props.durationStatSlot ?? (props.durationDays != null ? props.durationDays : null)
  if (durationValue !== null && durationValue !== undefined) {
    stats.push(
      <div className="tp-hero-stat" key="duration">
        <span className="v">{durationValue}</span>
        <span className="l">{UI.days}</span>
      </div>,
    )
  }
  const groupValue = props.groupStatSlot ?? (props.groupSize != null ? props.groupSize : null)
  if (groupValue !== null && groupValue !== undefined) {
    stats.push(
      <div className="tp-hero-stat" key="group">
        <span className="v">{groupValue}</span>
        <span className="l">{UI.travelers}</span>
      </div>,
    )
  }
  const priceValue = props.priceStatSlot ?? props.pricePerPersonFormatted
  if (priceValue) {
    stats.push(
      <div className="tp-hero-stat" key="price">
        <span className="v">{priceValue}</span>
        <span className="l">{UI.perTraveler}</span>
      </div>,
    )
  }
  if (stats.length === 0) return null
  return <div className="tp-hero-stats">{stats}</div>
}

function CardSideStat({
  label,
  valueSlot,
  fallback,
}: {
  label: string
  valueSlot?: ReactNode
  fallback: string | number | null
}) {
  const value = valueSlot ?? fallback
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="tp-hero-stat">
      <span className="l">{label}</span>
      <span className="v">{value}</span>
    </div>
  )
}
