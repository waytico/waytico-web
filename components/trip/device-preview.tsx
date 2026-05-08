'use client'

import { useEffect, useState } from 'react'
import { Maximize2, Move, X } from 'lucide-react'

/**
 * DevicePreview — floating mobile companion to "Preview as client".
 *
 * Why this exists. The desktop client preview is the existing in-place
 * role swap (Header keeps rendering with an "Exit preview" pulse pill,
 * page renders without any owner chrome). 95% of trip-page traffic
 * happens on phones, though, and the operator needs a quick way to see
 * the page the way their actual client will see it without hopping to
 * a phone or fiddling with devtools.
 *
 * What it does. Mounts a small (220×440) floating thumbnail in a
 * chosen viewport corner the moment the operator enters preview mode.
 * Click it (or the maximize button) to expand into a phone-shaped
 * fullscreen frame (~390×800) over a dimmed backdrop. Esc / click
 * outside / × button closes the overlay back to the thumbnail. The
 * thumbnail stays put until the operator presses the "Exit preview"
 * pill in the header — at which point trip-page-client unmounts
 * DevicePreview entirely.
 *
 * How the iframe stays "client view". The src is
 * /t/[slug]?previewAs=client. The trip-page-client reads that query
 * param and short-circuits all owner UI: skips the /full owner-fetch
 * (so isOwner stays false), forces isOwner & isAnonCreator to derive
 * to false in render, and never mounts Header / TripActionBar /
 * banners / chat widget / ScrollToTop. Media queries fire against the
 * iframe's actual narrow viewport, so Magazine MagazineTopNav (≥1024)
 * falls away and MagazineStickyBar (mobile-only) kicks in just like
 * on a real phone.
 *
 * What we deliberately don't do. No drag (corner-cycle button instead —
 * deterministic, no edge cases around drag-vs-click, no coordinate
 * persistence). No iframe sandbox — same-origin so Clerk session +
 * Next.js cookies work normally; sandbox would break SSR auth state.
 * No close button on the thumbnail — closing happens through the
 * canonical "Exit preview" affordance that already exists, so there's
 * one way to leave preview mode, not two.
 */

type Corner = 'tl' | 'tr' | 'bl' | 'br'

const CORNER_CLASS: Record<Corner, string> = {
  tl: 'top-4 left-4',
  tr: 'top-4 right-4',
  bl: 'bottom-4 left-4',
  br: 'bottom-4 right-4',
}

// Cycle order — start at bottom-right (least likely to clash with the
// sticky Header / preview-banner up top), then walk counter-clockwise.
const CORNER_CYCLE: Corner[] = ['br', 'bl', 'tl', 'tr']

/**
 * Section IDs the trip page renders, in document order. Used to mirror
 * the operator's desktop scroll position into the iframe via URL hash:
 * if they hit "Preview" while looking at the price block, the mobile
 * preview opens at the price block too instead of resetting to the top.
 *
 * Same IDs across themes (Magazine + Classic + Cinematic + Clean) —
 * verified in components/trip/{overview,itinerary,accommodations,
 * included,price,terms,contacts}.tsx.
 */
const SECTION_IDS = [
  'overview',
  'itinerary',
  'accommodations',
  'included',
  'price',
  'terms',
  'contacts',
] as const

/**
 * Read the parent document and return the URL hash (`#itinerary`,
 * `#price`, …) for whichever section the operator is currently
 * looking at on the desktop trip page. Picks the *last* section
 * whose top has scrolled past ~30% of the viewport — that maps to
 * "the section currently dominating the screen".
 *
 * When the dominating section is the itinerary, drills further: looks
 * for `day-1`, `day-2`, … anchors (added on every itinerary DayCard
 * variant) and returns the hash of the topmost-visible day. Without
 * this drill-down, opening Preview while reading Day 5 would still
 * dump the iframe at Day 1.
 *
 * Returns '' when the operator is still above the first section
 * (hero / nav area) or when no section IDs are mounted yet, which
 * makes the iframe load at the top — the same behavior we had
 * before this feature, so it's a safe fallback.
 */
function getCurrentSectionHash(): string {
  if (typeof window === 'undefined') return ''
  let current: string | null = null
  const cutoff = window.innerHeight * 0.3
  for (const id of SECTION_IDS) {
    const el = document.getElementById(id)
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (rect.top < cutoff) {
      current = id
    } else {
      // Sections are in document order — once we hit one that hasn't
      // scrolled into the cutoff yet, no later one has either.
      break
    }
  }

  // Drill into per-day anchors when the operator is reading the
  // itinerary. Days are numbered 1..N consecutively (server reconciles
  // dayNumber on every reorder/delete), so we can scan `day-1`,
  // `day-2`, … until we hit one that doesn't exist yet — that's the
  // end of the list. Same cutoff rule: last day whose top has
  // scrolled past 30% of viewport wins.
  if (current === 'itinerary') {
    let dayHash: string | null = null
    for (let n = 1; n <= 60; n++) {
      const dayEl = document.getElementById(`day-${n}`)
      if (!dayEl) break
      if (dayEl.getBoundingClientRect().top < cutoff) {
        dayHash = `day-${n}`
      } else {
        break
      }
    }
    if (dayHash) return `#${dayHash}`
  }

  return current ? `#${current}` : ''
}

const buildSrc = (slug: string) =>
  `/t/${slug}?previewAs=client${getCurrentSectionHash()}`

type Props = {
  /** URL slug of the trip; iframe loads /t/{slug}?previewAs=client */
  slug: string
}

export function DevicePreview({ slug }: Props) {
  const [corner, setCorner] = useState<Corner>('br')

  // Thumbnail src is captured once on mount — fixed at whatever
  // section the operator was looking at the moment they hit
  // "Preview". Doesn't follow subsequent parent scroll (would
  // require postMessage round-trips both ways; out of scope).
  const [thumbnailSrc] = useState(() => buildSrc(slug))

  // Fullscreen src is recomputed each time the operator expands —
  // if they scrolled the desktop view after opening preview, the
  // fullscreen overlay reflects their *current* position, not the
  // stale one from when the thumbnail mounted. Presence of a value
  // also doubles as the "is fullscreen open" flag — a single source
  // of truth, so we never end up with the overlay rendering with a
  // stale src.
  const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null)
  const fullscreen = fullscreenSrc !== null

  const openFullscreen = () => setFullscreenSrc(buildSrc(slug))
  const closeFullscreen = () => setFullscreenSrc(null)

  // Esc closes the fullscreen overlay (returns to thumbnail). The
  // thumbnail itself is dismissed via the "Exit preview" pill, not Esc.
  useEffect(() => {
    if (!fullscreen) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreen()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [fullscreen])

  const cycleCorner = () => {
    setCorner((cur) => {
      const idx = CORNER_CYCLE.indexOf(cur)
      return CORNER_CYCLE[(idx + 1) % CORNER_CYCLE.length]
    })
  }

  return (
    <>
      {/* Floating thumbnail — rendered the entire time DevicePreview is
          mounted. Hidden on mobile viewports (< md) because the operator
          is already on a phone and a phone-in-phone is redundant — they
          see the mobile version directly through the desktop client-view
          swap on the parent page.
          z-40 lifts it above the Header (z-30) and the preview banner
          (z-20); fullscreen overlay (z-50) sits even higher. */}
      <div
        className={`hidden md:flex fixed ${CORNER_CLASS[corner]} z-40 w-[220px] h-[440px] rounded-2xl bg-black border border-white/10 shadow-2xl overflow-hidden flex-col select-none`}
        aria-label="Mobile preview"
      >
        {/* Header strip with the two controls. Compact on purpose so
            the iframe gets as much of the 440px tall thumbnail as
            possible. */}
        <div className="flex items-center justify-between px-2 h-7 bg-black/95 text-white/70 text-[10px] font-mono uppercase tracking-wider flex-shrink-0">
          <span>Mobile</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={cycleCorner}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              aria-label="Move to next corner"
              title="Move to next corner"
            >
              <Move className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={openFullscreen}
              className="p-1 hover:bg-white/10 rounded transition-colors"
              aria-label="Expand mobile preview"
              title="Expand mobile preview"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Iframe is wrapped in a button so a click anywhere on the
            visible page area expands. pointer-events: none on the
            iframe itself prevents it from intercepting the click;
            scrolling/interacting happens in fullscreen mode.

            The iframe renders at a real mobile width (390px wide ×
            ~720px tall — same shape as a typical phone viewport) and
            is then scaled down to fit the 220×~413 visible area.
            Without this scaling the iframe would render the page in a
            220px-wide viewport — narrower than every Tailwind
            breakpoint (sm starts at 640px, mobile-first base layouts
            assume ≥320px) — and the Magazine top strip would shred:
            QUOTE code, dates, and Contact Agent pile on top of each
            other. Rendering at 390px and visually scaling preserves
            the actual mobile layout. transform-origin: top left so
            the scaled corner aligns with the iframe wrapper's
            top-left, not its center.

            Scale factor: thumbnail content area ≈ 220 wide × 413 tall
            (440 minus the 27px header strip). 220/390 ≈ 0.564 → render
            iframe 390×732, scale to 220×413. */}
        <button
          type="button"
          onClick={openFullscreen}
          className="flex-1 relative bg-white cursor-zoom-in overflow-hidden"
          aria-label="Expand mobile preview"
        >
          <iframe
            src={thumbnailSrc}
            title="Mobile preview"
            className="absolute top-0 left-0 pointer-events-none border-0"
            style={{
              width: '390px',
              height: '732px',
              transform: 'scale(0.564)',
              transformOrigin: 'top left',
            }}
          />
        </button>
      </div>

      {/* Fullscreen overlay — only mounted while expanded so we don't
          keep two iframes alive when the operator just wants a glance.
          Hidden on mobile (md:flex) because the only path to open it is
          via the thumbnail above, which itself is hidden on mobile. */}
      {fullscreen && (
        <div
          className="hidden md:flex fixed inset-0 z-50 bg-black/70 backdrop-blur-sm items-center justify-center p-4 sm:p-8"
          onClick={closeFullscreen}
          aria-modal="true"
          role="dialog"
        >
          {/* stopPropagation so clicks inside the device frame don't
              bubble up and close the overlay. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[390px] h-full max-h-[820px] rounded-[36px] overflow-hidden bg-black border border-white/15 shadow-2xl flex flex-col"
          >
            <button
              type="button"
              onClick={closeFullscreen}
              className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              aria-label="Close mobile preview"
            >
              <X className="w-4 h-4" />
            </button>
            <iframe
              src={fullscreenSrc!}
              title="Mobile preview (fullscreen)"
              className="flex-1 w-full bg-white"
            />
          </div>
        </div>
      )}
    </>
  )
}
