import type { ReactNode } from 'react'
import { UI } from '@/lib/ui-strings'
import type { ThemeId } from '@/lib/themes'

type OverviewProps = {
  /** Description body — owner mode passes EditableField, public passes paragraphs. */
  bodySlot: ReactNode
  /** True when bodySlot has content (or owner mode wants the placeholder). */
  visible: boolean

  /** Active theme. When 'magazine' the component switches to the
   *  asymmetric two-column layout (eyebrow + subtitle on the left,
   *  prose on the right). Other values render the legacy single-column
   *  editorial layout. */
  theme?: ThemeId

  /** True when the viewer is the owner (drives placeholders + edit chrome). */
  showOwnerUI?: boolean

  /** Magazine-only narrative subtitle rendered as the section heading. Public
   *  mode passes plain text or null; owner mode passes EditableField.
   *  On Magazine the eyebrow was removed — the subtitle is the only label,
   *  carrying the section identity on its own. */
  subtitleSlot?: ReactNode
}

/**
 * Overview — single-column prose. Meta-rail (Duration / Group / Type / Region /
 * Country) was removed during the quote simplification — those facts live
 * in the Hero stat tiles for the editorial / expedition / compact themes,
 * and in the Hero bottom eyebrow + Price block for Magazine.
 *
 * Magazine variant (theme === 'magazine') turns this into an asymmetric
 * two-column block: the section subtitle stands alone on the left, prose on
 * the right. The earlier four-tile stat row at the bottom (DATES / DURATION /
 * GROUP / FROM) was removed in favour of distributing those facts to
 * their semantic homes — DATES + DURATION + COUNTRY into the hero bottom
 * eyebrow, GROUP + FROM-price into the Price block — matching the
 * Magazine v2 design canon, which has no key-facts band.
 */
export function TripOverview(props: OverviewProps) {
  const { theme, visible, bodySlot } = props

  if (theme === 'magazine') {
    return <OverviewMagazine {...props} />
  }

  if (!visible) return null
  return (
    <section className="tp-section" id="overview">
      <div className="tp-container">
        <header className="tp-section-head">
          <h2 className="tp-display tp-section-title">{UI.sectionLabels.overview}</h2>
        </header>
        <div className="tp-overview-body">{bodySlot}</div>
      </div>
    </section>
  )
}

/* ── Magazine variant ─────────────────────────────────────────────── */

function OverviewMagazine(props: OverviewProps) {
  const { bodySlot, visible, showOwnerUI, subtitleSlot } = props

  // Magazine overview shows whenever there's prose to display, whenever
  // owner mode wants the placeholder, or whenever the subtitle slot has
  // content. With stat-tiles removed, those are the only render gates.
  const shouldRender = !!(showOwnerUI || visible || subtitleSlot)
  if (!shouldRender) return null

  return (
    <section className="tp-mag-section tp-mag-overview" id="overview">
      <div className="tp-mag-container">
        <div className="tp-mag-overview__grid">
          <div className="tp-mag-overview__left">
            {subtitleSlot && (
              <h2 className="tp-mag-display tp-mag-section-subtitle">
                {subtitleSlot}
              </h2>
            )}
          </div>
          <div className="tp-mag-overview__right">
            <div className="tp-mag-overview__prose">{bodySlot}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── Section-subtitle split renderer ──────────────────────────────────
 *
 * Magazine section subtitles can be authored as 1, 2, or 3 lines
 * separated by literal "\n" characters. The middle line is rendered
 * italic — that's the typographic anchor of the magazine voice
 * ("A slow / passage / south & north."). One- and two-line cases
 * degrade gracefully so legacy single-phrase subtitles (and any
 * other section's existing subtitle) keep working unchanged.
 *
 * Used by trip-page-client both directly (public viewer) and as the
 * `renderDisplay` callback of the EditableField used for the
 * subtitle in owner mode — so the operator sees the formatted
 * three-line layout when not actively editing.
 *
 * The split happens here, not at save-time: persisted value is the
 * raw "Head\nMiddle\nTail" string the operator typed (or the
 * pipeline produced). Empty lines are dropped so a stray double-\n
 * doesn't create a phantom span.
 */
export function MagazineSectionSubtitleLines({ text }: { text: string }) {
  const lines = text
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  if (lines.length === 0) return null

  if (lines.length === 1) {
    // Legacy single-phrase — render plain. No italic, no spans.
    return <span>{lines[0]}</span>
  }

  if (lines.length === 2) {
    // Hero-style head + italic tail.
    return (
      <>
        <span className="tp-mag-section-subtitle__head">{lines[0]}</span>
        <em className="tp-mag-section-subtitle__mid">{lines[1]}</em>
      </>
    )
  }

  // 3+ lines — head regular, middle italic, remainder concatenated as tail.
  // The pipeline contract caps at 3 lines; >3 is an operator typing accident
  // that we collapse rather than drop, so no input is ever silently lost.
  const [head, mid, ...rest] = lines
  const tail = rest.join(' ')
  return (
    <>
      <span className="tp-mag-section-subtitle__head">{head}</span>
      <em className="tp-mag-section-subtitle__mid">{mid}</em>
      <span className="tp-mag-section-subtitle__tail">{tail}</span>
    </>
  )
}
