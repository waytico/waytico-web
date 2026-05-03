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

  /** Magazine-only narrative subtitle rendered under the eyebrow. Public
   *  mode passes plain text or null; owner mode passes EditableField.
   *  Replaces the static "Overview" heading on Magazine — eyebrow plus
   *  subtitle carry the section identity, no need for a second label. */
  subtitleSlot?: ReactNode
}

/**
 * Overview — single-column prose. Meta-rail (Duration / Group / Type / Region /
 * Country) was removed during the quote simplification — those facts live
 * in the Hero stat tiles for the editorial / expedition / compact themes,
 * and in the Hero bottom eyebrow + Price block for Magazine.
 *
 * Magazine variant (theme === 'magazine') turns this into an asymmetric
 * two-column block: eyebrow + subtitle stack on the left, prose on the
 * right. The earlier four-tile stat row at the bottom (DATES / DURATION /
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
            <p className="tp-mag-eyebrow tp-mag-overview__eyebrow">
              {UI.sectionLabels.overview.toUpperCase()}
            </p>
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
