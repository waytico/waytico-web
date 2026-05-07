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

type Props = {
  /** URL slug of the trip; iframe loads /t/{slug}?previewAs=client */
  slug: string
}

export function DevicePreview({ slug }: Props) {
  const [fullscreen, setFullscreen] = useState(false)
  const [corner, setCorner] = useState<Corner>('br')

  // Esc closes the fullscreen overlay (returns to thumbnail). The
  // thumbnail itself is dismissed via the "Exit preview" pill, not Esc.
  useEffect(() => {
    if (!fullscreen) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [fullscreen])

  const previewSrc = `/t/${slug}?previewAs=client`

  const cycleCorner = () => {
    setCorner((cur) => {
      const idx = CORNER_CYCLE.indexOf(cur)
      return CORNER_CYCLE[(idx + 1) % CORNER_CYCLE.length]
    })
  }

  return (
    <>
      {/* Floating thumbnail — rendered the entire time DevicePreview is
          mounted. z-40 lifts it above the Header (z-30) and the preview
          banner (z-20); fullscreen overlay (z-50) sits even higher. */}
      <div
        className={`fixed ${CORNER_CLASS[corner]} z-40 w-[220px] h-[440px] rounded-2xl bg-black border border-white/10 shadow-2xl overflow-hidden flex flex-col select-none`}
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
              onClick={() => setFullscreen(true)}
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
            scrolling/interacting happens in fullscreen mode. */}
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="flex-1 relative bg-white cursor-zoom-in"
          aria-label="Expand mobile preview"
        >
          <iframe
            src={previewSrc}
            title="Mobile preview"
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        </button>
      </div>

      {/* Fullscreen overlay — only mounted while expanded so we don't
          keep two iframes alive when the operator just wants a glance. */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={() => setFullscreen(false)}
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
              onClick={() => setFullscreen(false)}
              className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              aria-label="Close mobile preview"
            >
              <X className="w-4 h-4" />
            </button>
            <iframe
              src={previewSrc}
              title="Mobile preview (fullscreen)"
              className="flex-1 w-full bg-white"
            />
          </div>
        </div>
      )}
    </>
  )
}
