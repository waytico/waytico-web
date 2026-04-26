import type { ReactNode } from 'react'
import type { ThemeId } from '@/lib/themes'
import { HERO_STYLE } from '@/lib/themes'

type HeroProps = {
  theme: ThemeId
  /** URL of the hero photo, or null for empty / placeholder. */
  heroPhoto: string | null
  /** Title — owner mode passes EditableField, public passes a string. */
  titleSlot: ReactNode
  /** Owner-only chrome injected over the photo (drag indicator, delete button,
   *  empty-state upload CTA). Rendered inside the photo div so it sits in the
   *  top-right of the photo across all three variants. */
  ownerOverlay?: ReactNode
}

/**
 * Hero — single component, three structural variants per TZ-6 §6.2:
 *   editorial  → split   (image right, text left)
 *   expedition → overlay (full-bleed photo, title overlaid)
 *   compact    → card    (title top, photo below)
 *
 * Only renders title + photo + ownerOverlay. All other trip metadata
 * (dates / duration / group / price / description / region / activity)
 * lives in the Overview block — single source of truth, no UI duplication.
 */
export function TripHero({ theme, heroPhoto, titleSlot, ownerOverlay }: HeroProps) {
  const heroStyle = HERO_STYLE[theme]

  if (heroStyle === 'overlay') {
    return (
      <header className="tp-hero--overlay">
        <div
          className="tp-hero-bg"
          style={heroPhoto ? { backgroundImage: `url(${heroPhoto})` } : undefined}
        />
        <div className="tp-container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="tp-hero-meta">
            <h1 className="tp-display tp-hero-title">{titleSlot}</h1>
          </div>
        </div>
        {ownerOverlay}
      </header>
    )
  }

  if (heroStyle === 'card') {
    return (
      <header>
        <div className="tp-container tp-hero--card">
          <div className="tp-hero-meta">
            <h1 className="tp-display tp-hero-title">{titleSlot}</h1>
          </div>
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
    <header>
      <div className="tp-container tp-hero--split">
        <div className="tp-hero-meta">
          <h1 className="tp-display tp-hero-title">{titleSlot}</h1>
        </div>
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
