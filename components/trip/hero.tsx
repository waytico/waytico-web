import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import type { ThemeId } from '@/lib/themes'
import { HERO_STYLE } from '@/lib/themes'
import { fmtDate, numberToWords } from '@/lib/trip-format'
import { PublicStatusPill } from './public-status-pill'

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
  /** Label below the price stat tile. Defaults to "per traveler" when
   *  omitted (legacy behaviour). Pricing-mode-aware callers pass the
   *  resolved label here ("for the group", custom label, etc). */
  priceLabel?: string
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
  /** Country name used by the Magazine variant for the bottom eyebrow
   *  ('PORTUGAL — 7 DAYS'). Plain string — non-Magazine variants ignore
   *  it and continue to read country via `regionEyebrowSlot`. */
  country?: string | null
  /** Whether overlay theme is in light/dark mode — affects validity badge color */
  isDarkBg?: boolean
  /** Top-strip slot — rendered on the right side of the hero top bar
   *  next to the validity dates. Public-side trip-page-client passes a
   *  ContactAgentMenu factory here; owner side leaves it undefined.
   *  Receives `onPhoto` so the slot can adjust contrast over the
   *  Expedition theme's full-bleed photo background. */
  contactAgentSlot?: (ctx: { onPhoto: boolean }) => ReactNode
  /** 6-char quote code (uppercase). Surfaces in the hero top strip in two
   *  ways depending on the viewer:
   *   - Public (status pill present): appended after the status label →
   *     "QUOTED · A3K9P2".
   *   - Owner (status null, dates row visible): rendered as the first
   *     pair in the dates row → "QUOTE A3K9P2 — ISSUED … — VALID UNTIL …".
   *  Hidden when null. */
  code?: string | null
  /** Top-3 trip highlights (cities / regions / landmarks). Each entry is
   *  a slot so owner mode can wrap it with EditableField; public mode
   *  passes plain text or null. Nulls are filtered out before render.
   *  Currently only the Magazine theme renders these — other themes
   *  ignore the prop. */
  highlightsSlots?: ReactNode[]
}

/**
 * Hero top strip — full-width horizontal bar layered above the hero,
 * common to all three theme variants. Shows the trip's public status
 * pill on the left, contact-agent dropdown + Issued / Valid-until dates
 * on the right.
 *
 * Replaces the previous absolute-positioned ValidityBadge: the dates
 * are still in the top-right slot (in a single row now, separated by
 * "·"), but they share the strip with the new status pill and contact
 * dropdown so the page has one consistent header line instead of
 * floating elements.
 *
 * Renders nothing when no piece of content is present (no status, no
 * dates, no contact agent slot) — preserves the empty-hero behaviour.
 */
function HeroTopStrip({
  status,
  proposalDate,
  validUntil,
  proposalSlot,
  validUntilSlot,
  contactAgentSlot,
  code,
  onPhoto = false,
}: {
  status?: string | null
  proposalDate?: string | null
  validUntil?: string | null
  proposalSlot?: ReactNode
  validUntilSlot?: ReactNode
  contactAgentSlot?: (ctx: { onPhoto: boolean }) => ReactNode
  code?: string | null
  onPhoto?: boolean
}) {
  const hasStatus = !!status && ['quoted', 'active', 'completed'].includes(status)
  const hasProposal = !!(proposalDate || proposalSlot)
  const hasValidUntil = !!(validUntil || validUntilSlot)
  // Owner-side QUOTE pair surfaces only when the public status pill isn't
  // already carrying the code (avoids double-display for the same datum).
  const hasOwnerCode = !!code && !hasStatus
  const hasDates = hasOwnerCode || hasProposal || hasValidUntil
  const renderedContactAgent = contactAgentSlot ? contactAgentSlot({ onPhoto }) : null
  const hasContactAgent = !!renderedContactAgent

  if (!hasStatus && !hasDates && !hasContactAgent) return null

  const datesStyle: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: '0.12em',
    fontFamily: 'var(--font-mono)',
    color: onPhoto ? 'rgba(255,255,255,0.92)' : 'var(--ink-mute)',
    textShadow: onPhoto ? '0 1px 4px rgba(0,0,0,0.4)' : undefined,
  }

  // Layout — three slots (status / contact agent / dates) laid out as a
  // 3-column grid on desktop and stacked on mobile. col-start makes each
  // slot land in its own column regardless of which siblings are missing,
  // so an owner-view trip with no status pill keeps dates flush right and
  // a quote with no contact channel still keeps status flush left.
  //
  //  desktop (≥640px):
  //    flex-row, status + dates flush left, contact pushed to the right
  //    via mr-auto on the dates wrapper. The whole strip closes with a
  //    1px hairline along the bottom edge.
  //
  //  mobile (<640px):
  //    flex-col, top-to-bottom: status → dates → contact.
  //    The status pill and dates are separated by a hairline rule
  //    (border-top on dates when both are present) — same line that
  //    runs along the bottom of the strip on desktop, just relocated.
  const ruleColor = onPhoto ? 'rgba(255,255,255,0.2)' : 'var(--rule)'
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 3,
        pointerEvents: 'none',
      }}
    >
      <div
        className="max-w-7xl mx-auto px-4 py-5 flex flex-col gap-3 items-start sm:flex-row sm:items-center sm:gap-4 sm:border-b"
        style={{ borderBottomColor: ruleColor }}
      >
        {hasStatus && (
          <div
            className="order-1 sm:order-none"
            style={{ pointerEvents: 'auto' }}
          >
            <PublicStatusPill status={status} onPhoto={onPhoto} code={code} />
          </div>
        )}

        {hasDates && (
          <div
            className={`order-2 sm:order-none uppercase grid grid-cols-[auto_auto] gap-x-3 gap-y-1 justify-start sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:gap-y-0 sm:mr-auto ${
              hasStatus ? 'w-full pt-3 border-t sm:w-auto sm:pt-0 sm:border-t-0' : ''
            }`}
            style={{
              ...datesStyle,
              pointerEvents: 'auto',
              ...(hasStatus ? { borderTopColor: ruleColor } : {}),
            }}
          >
            {hasOwnerCode && (
              <>
                <span>Quote</span>
                <span>{code}</span>
              </>
            )}
            {hasOwnerCode && (hasProposal || hasValidUntil) && (
              <span className="hidden sm:inline opacity-50">—</span>
            )}
            {hasProposal && (
              <>
                <span>{UI.proposal}</span>
                <span>{proposalSlot ?? (proposalDate ? fmtDate(proposalDate) : null)}</span>
              </>
            )}
            {hasProposal && hasValidUntil && (
              <span className="hidden sm:inline opacity-50">—</span>
            )}
            {hasValidUntil && (
              <>
                <span>{UI.validUntil}</span>
                <span>{validUntilSlot ?? (validUntil ? fmtDate(validUntil) : null)}</span>
              </>
            )}
          </div>
        )}

        {hasContactAgent && (
          <div
            className="order-3 sm:order-none"
            style={{ pointerEvents: 'auto' }}
          >
            {renderedContactAgent}
          </div>
        )}
      </div>
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
  // Status pill moved to HeroTopStrip — no longer rendered alongside chips.
  const meta = (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {props.activityChipSlot}
        {props.regionEyebrowSlot}
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
        <HeroTopStrip
          status={status}
          proposalDate={proposalDate}
          validUntil={validUntil}
          proposalSlot={props.proposalSlot}
          validUntilSlot={props.validUntilSlot}
          contactAgentSlot={props.contactAgentSlot}
          code={props.code}
          onPhoto={!!heroPhoto}
        />
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
        <HeroTopStrip
          status={status}
          proposalDate={proposalDate}
          validUntil={validUntil}
          proposalSlot={props.proposalSlot}
          validUntilSlot={props.validUntilSlot}
          contactAgentSlot={props.contactAgentSlot}
          code={props.code}
        />
        <div className="tp-container tp-hero--card">
          <div className="tp-hero-meta" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {props.activityChipSlot}
              {props.regionEyebrowSlot}
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
              label={props.priceLabel ?? UI.perTraveler}
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

  if (heroStyle === 'magazine') {
    return <HeroMagazine {...props} />
  }

  // split — editorial (default)
  return (
    <header style={{ position: 'relative' }}>
      <HeroTopStrip
        status={status}
        proposalDate={proposalDate}
        validUntil={validUntil}
        proposalSlot={props.proposalSlot}
        validUntilSlot={props.validUntilSlot}
        contactAgentSlot={props.contactAgentSlot}
        code={props.code}
      />
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
        <span className="l">{props.priceLabel ?? UI.perTraveler}</span>
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


/**
 * Magazine variant — full-bleed adaptive hero with a top metadata strip
 * (Issued / Valid until — Country) and a bottom display group
 * (Country — Days eyebrow, large display title, italic tagline).
 *
 * Adaptive contract:
 *   desktop ≥1024px — height = calc(100dvh - 86px) (top-nav is fixed
 *                     above), title clamp(48-112px), top strip 86px from
 *                     viewport top, bottom group 64px from viewport bottom
 *   mobile <1024px  — height = 100dvh, title scales down via clamp lower
 *                     bound, top strip 60px from top (notch-safe), bottom
 *                     group 56px from bottom
 *
 * Magazine intentionally omits the editorial-style stat tiles, the
 * OperatorStrip, the public status pill, and the in-hero ContactAgentMenu
 * — those move to (a) Overview stat tiles row, (b) TopNav INQUIRE pill.
 *
 * The HeroDropZone wrapper and the HeroOwnerOverlay live one level up in
 * trip-page-client, so anon-creator interceptDrop, owner replace/delete
 * affordances, and the hidden file input keep working without any extra
 * wiring here. ownerOverlay is rendered as a child so its absolute-
 * positioned controls layer over the hero photo.
 */
function HeroMagazine(props: HeroProps) {
  const {
    heroPhoto,
    titleSlot,
    taglineSlot,
    status,
    proposalDate,
    validUntil,
    proposalSlot,
    validUntilSlot,
    contactAgentSlot,
    durationDays,
    country,
    ownerOverlay,
    code,
    highlightsSlots,
  } = props

  // Bottom eyebrow: "{COUNTRY} — {N} DAYS". Each part hides individually
  // when missing; if neither is present the line is omitted. The country
  // already lives here, so the top strip never renders a second copy.
  // Magazine spells the day count out — "SEVEN DAYS" reads more editorial
  // than "7 DAYS"; numerals stay everywhere else (stat tiles, day badges)
  // where compactness matters more than register.
  const bottomCountry = country ? country.toUpperCase() : null
  const durationWord =
    durationDays != null ? numberToWords(durationDays) : null
  const durationDisplay =
    durationDays != null
      ? durationWord ?? String(durationDays)
      : null
  const bottomDuration =
    durationDisplay != null ? `${durationDisplay} ${UI.days.toUpperCase()}` : null
  const bottomEyebrowParts = [bottomCountry, bottomDuration].filter(
    (p): p is string => !!p,
  )

  return (
    <header className="tp-mag-hero" style={{ position: 'relative' }}>
      {heroPhoto && (
        <img
          src={heroPhoto}
          alt=""
          className="tp-mag-hero__photo"
          aria-hidden="true"
        />
      )}
      <div className="tp-mag-hero__veil" aria-hidden="true" />

      {/* Top strip — same one Classic / Cinematic use. Status pill on the
          left in client view, contact-agent + Issued/Valid dates on the
          right, dates stay editable in owner mode through the slots.
          onPhoto=true switches the strip to white text + photo shadow,
          which is exactly what Magazine's full-bleed hero needs. */}
      <HeroTopStrip
        status={status}
        proposalDate={proposalDate}
        validUntil={validUntil}
        proposalSlot={proposalSlot}
        validUntilSlot={validUntilSlot}
        contactAgentSlot={contactAgentSlot}
        code={code}
        onPhoto={true}
      />

      <div className="tp-mag-hero__bottom">
        <div className="tp-mag-hero__bottom-grid">
          <div className="tp-mag-hero__bottom-text">
            {bottomEyebrowParts.length > 0 && (
              <p className="tp-mag-hero__bottom-eyebrow">
                {bottomEyebrowParts.join(' — ')}
              </p>
            )}
            <h1 className="tp-mag-hero__title">{titleSlot}</h1>
            {taglineSlot && <p className="tp-mag-hero__tagline">{taglineSlot}</p>}
          </div>
          {highlightsSlots && highlightsSlots.some(Boolean) && (
            <ul className="tp-mag-hero__highlights" aria-label="Trip highlights">
              {highlightsSlots.map((slot, i) =>
                slot ? (
                  <li key={i} className="tp-mag-hero__highlights-item">
                    {i > 0 && (
                      <span className="tp-mag-hero__highlights-sep" aria-hidden="true">·</span>
                    )}
                    <span className="tp-mag-hero__highlights-value">{slot}</span>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </div>
      </div>

      {ownerOverlay}
    </header>
  )
}
