'use client'

/**
 * Showcase / interactive-demo overlays.
 *
 * Two exports:
 *   - <ShowcaseBanner />: sticky top strip explaining the trip is a demo.
 *     Two CTAs: "Start your own quote" (anonymous, no signup) + "Sign up"
 *     for the full feature set.
 *   - <ShowcasePills />: a small set of floating, pulsing hint pills that
 *     point at concrete features (edit, switch design, AI bar, share).
 *     One active hint at a time; dismissable; remembered per session via
 *     sessionStorage so they don't replay on every navigation.
 *
 * Both are rendered only when the trip slug matches the seed-showcase
 * trip — see trip-page-client.tsx for the gate.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  X,
  MousePointerClick,
  Palette,
  MessageSquare,
  Share2,
  Sparkles,
} from 'lucide-react'

// Bumped to v3 every time we ship a new round of pills so existing
// dismissed-flag values from a previous tour don't suppress the new tour.
const SS_KEY_DISMISSED = 'waytico:showcase-pills-dismissed:v3'

/** Banner height in px — used by trip-page-client to position the
 *  sticky action bar directly underneath the banner. Keep in sync with
 *  the `minHeight` style below. */
export const SHOWCASE_BANNER_HEIGHT = 52

export function ShowcaseBanner() {
  const restartTour = () => {
    try {
      sessionStorage.removeItem(SS_KEY_DISMISSED)
    } catch {}
    // Force the URL param so ShowcasePills re-mounts and resets state.
    window.location.hash = 'tour-' + Date.now()
  }
  return (
    <div className="sticky top-0 z-40 bg-accent text-accent-foreground">
      <div
        className="max-w-7xl mx-auto px-4 flex items-center gap-4 flex-wrap sm:flex-nowrap"
        style={{ minHeight: SHOWCASE_BANNER_HEIGHT }}
      >
        <Sparkles className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm flex-1 min-w-0 leading-snug font-semibold">
          You&apos;re in a live demo.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={restartTour}
            className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-accent-foreground/10 hover:bg-accent-foreground/20 transition-colors whitespace-nowrap"
          >
            Show me around
          </button>
          <Link
            href="/"
            className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-accent-foreground/10 hover:bg-accent-foreground/20 transition-colors whitespace-nowrap"
          >
            Start your own quote
          </Link>
          <Link
            href="/sign-up"
            className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-accent-foreground text-accent font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Sign up free
          </Link>
        </div>
      </div>
    </div>
  )
}

type Hint = {
  id: string
  icon: React.ReactNode
  text: string
  /** Top-of-viewport position (px). Adjust per hint to land near its target. */
  top: number
  /** Side anchor in px from the right edge — keeps hints off the action bar. */
  right: number
}

const HINTS: Hint[] = [
  {
    id: 'edit-anywhere',
    icon: <MousePointerClick className="w-4 h-4" />,
    text: 'Click any text — title, dates, prices, terms — to edit it inline.',
    top: 220,
    right: 24,
  },
  {
    id: 'theme',
    icon: <Palette className="w-4 h-4" />,
    text: 'Try “Pick a design” at the top — three looks for the same trip.',
    top: 130,
    right: 24,
  },
  {
    id: 'ai',
    icon: <MessageSquare className="w-4 h-4" />,
    text: 'Use the bar at the bottom to ask the AI to add days, swap hotels, change prices, rewrite terms — all in plain language.',
    top: 480,
    right: 24,
  },
  {
    id: 'share',
    icon: <Share2 className="w-4 h-4" />,
    text: 'Send the page to a client straight from “Share” — Email, WhatsApp, Telegram, or just copy the link.',
    top: 130,
    right: 24,
  },
]

export function ShowcasePills() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [restartKey, setRestartKey] = useState(0)

  // Defer mount so the user has a beat to look at the page first.
  useEffect(() => {
    let dismissed = false
    try {
      dismissed = sessionStorage.getItem(SS_KEY_DISMISSED) === '1'
    } catch {}
    if (dismissed) return
    const t = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(t)
  }, [restartKey])

  // Banner's "Show me around" button updates the URL hash to force a
  // re-run of the tour. We listen for that and reset.
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash.startsWith('#tour-')) {
        setActiveIndex(0)
        setVisible(false)
        setRestartKey((k) => k + 1)
      }
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (!visible) return null
  if (activeIndex >= HINTS.length) return null

  const hint = HINTS[activeIndex]
  const isLast = activeIndex === HINTS.length - 1

  const dismissAll = () => {
    try {
      sessionStorage.setItem(SS_KEY_DISMISSED, '1')
    } catch {}
    setVisible(false)
  }

  const next = () => {
    if (isLast) dismissAll()
    else setActiveIndex((i) => i + 1)
  }

  return (
    <div
      className="fixed z-40 pointer-events-auto"
      style={{
        top: hint.top,
        right: hint.right,
        maxWidth: 320,
        animation: 'showcase-pill-in 320ms ease-out',
      }}
    >
      <div className="bg-foreground text-background rounded-xl shadow-2xl p-4 pr-9 text-sm relative">
        <button
          type="button"
          onClick={dismissAll}
          aria-label="Dismiss demo hints"
          className="absolute top-2 right-2 p-1 opacity-60 hover:opacity-100 hover:bg-background/10 rounded-full transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5 text-accent">{hint.icon}</span>
          <p className="leading-snug">{hint.text}</p>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <span className="opacity-50">
            Hint {activeIndex + 1} of {HINTS.length}
          </span>
          <button
            type="button"
            onClick={next}
            className="px-3 py-1 rounded-full bg-accent text-accent-foreground font-semibold hover:opacity-90 transition"
          >
            {isLast ? 'Got it' : 'Next →'}
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes showcase-pill-in {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
