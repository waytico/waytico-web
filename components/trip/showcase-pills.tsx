'use client'

/**
 * Showcase / interactive-demo overlays.
 *
 * Two exports:
 *   - <ShowcaseBanner />: sticky top strip explaining the trip is a demo,
 *     with a Sign-up CTA. Persistent — does not auto-dismiss.
 *   - <ShowcasePills />: a small set of floating, pulsing hint pills that
 *     point at concrete features (edit any field, drag photos, switch
 *     design, change pricing). One active hint at a time; dismissable;
 *     remembered per session via sessionStorage so they don't replay on
 *     every navigation.
 *
 * Both are rendered only when the trip slug matches the seed-showcase
 * trip — see trip-page-client.tsx for the gate.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, MousePointerClick, Image as ImageIcon, Palette, MessageSquare, Sparkles } from 'lucide-react'

const SS_KEY_DISMISSED = 'waytico:showcase-pills-dismissed'

export function ShowcaseBanner() {
  return (
    <div className="sticky top-0 z-40 bg-accent text-accent-foreground">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-3" style={{ minHeight: 52 }}>
        <Sparkles className="w-4 h-4 flex-shrink-0" />
        <p className="text-sm flex-1 min-w-0 leading-snug">
          <span className="font-semibold">You&apos;re in a live demo.</span>{' '}
          <span className="hidden sm:inline">
            Click any text to edit. Drop photos onto days. Switch the design.
            Nothing saves —{' '}
          </span>
          <span className="sm:hidden">
            Click to edit, drop photos, switch designs.{' '}
          </span>
          <Link
            href="/sign-up"
            className="font-semibold underline underline-offset-2 hover:opacity-80"
          >
            sign up free
          </Link>{' '}
          to try it on your own trip.
        </p>
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
    id: 'edit-title',
    icon: <MousePointerClick className="w-4 h-4" />,
    text: 'Click any text — title, dates, prices, terms — to edit it inline.',
    top: 220,
    right: 24,
  },
  {
    id: 'photos',
    icon: <ImageIcon className="w-4 h-4" />,
    text: 'Drop photos onto the hero or any day. Try dragging an image here.',
    top: 360,
    right: 24,
  },
  {
    id: 'theme',
    icon: <Palette className="w-4 h-4" />,
    text: 'Try “Pick a design” at the top — three looks for the same trip.',
    top: 100,
    right: 24,
  },
  {
    id: 'ai',
    icon: <MessageSquare className="w-4 h-4" />,
    text: 'On the real product, an AI bar at the bottom rewrites days, prices, and terms in plain language.',
    top: 500,
    right: 24,
  },
]

export function ShowcasePills() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [visible, setVisible] = useState(false)

  // Defer mount so the user has a beat to look at the page first.
  useEffect(() => {
    let dismissed = false
    try {
      dismissed = sessionStorage.getItem(SS_KEY_DISMISSED) === '1'
    } catch {}
    if (dismissed) return
    const t = setTimeout(() => setVisible(true), 1500)
    return () => clearTimeout(t)
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
