'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  tripTitle: string
  tripUrl: string
  signUpUrl: string
  /**
   * Fraction of the page (0..1) the visitor must scroll past before
   * the modal triggers. Default: 0.5 — once they've seen half the page
   * we know they're engaged enough that a soft pitch lands instead of
   * interrupts. The older time-based trigger felt arbitrary; scroll-
   * based maps to actual reading.
   */
  scrollFraction?: number
  onShareClick: () => void
}

/**
 * AnonUpsellModal — appears after trip generation for unauthenticated
 * agents, the first time they scroll past `scrollFraction` of the page.
 * Once shown (or once the user dismisses it), it does not show again
 * for the rest of this page session — even on F5 they get a fresh shot
 * (we intentionally don't persist).
 *
 * Two paths inside: share immediately, or register free for full features.
 */
export default function AnonUpsellModal({
  tripTitle,
  tripUrl,
  signUpUrl,
  scrollFraction = 0.5,
  onShareClick,
}: Props) {
  const [visible, setVisible] = useState(false)
  // Latch — once we've shown the modal once we never show it again in
  // this page lifetime, regardless of whether the user dismissed it,
  // shared, or scrolled back up and down.
  const shownRef = useRef(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      if (shownRef.current) return
      const doc = document.documentElement
      const max = (doc.scrollHeight - doc.clientHeight) || 1
      const pct = window.scrollY / max
      if (pct >= scrollFraction) {
        shownRef.current = true
        setVisible(true)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    // Pages where content fits in one viewport (max <= 0) won't fire
    // scroll — fall back to a long timer so the modal is still
    // discoverable. 30s is intentionally past the 8s of the prior
    // build: short pages aren't the common path.
    const fallback = setTimeout(() => {
      if (!shownRef.current) {
        shownRef.current = true
        setVisible(true)
      }
    }, 30000)
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(fallback)
    }
  }, [scrollFraction])

  const dismissWithFloat = () => setVisible(false)

  const handleShare = () => {
    setVisible(false)
    onShareClick()
  }

  if (!visible) return null

  return (
    <>
      {/* ── Modal ── */}
      {visible && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onMouseDown={(e) => {
            if (e.target === overlayRef.current) dismissWithFloat()
          }}
        >
          <div className="relative w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-6 pt-12">
            {/* Close */}
            <button
              type="button"
              onClick={dismissWithFloat}
              aria-label="Close"
              className="absolute top-3 right-3 p-1.5 text-foreground/70 hover:text-foreground hover:bg-secondary rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Primary action */}
            <button
              type="button"
              onClick={handleShare}
              className="w-full mb-4 py-3 px-4 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-colors"
            >
              Share with your client as is →
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Register CTA */}
            <a
              href={signUpUrl}
              className="block text-center font-semibold text-accent hover:text-accent/80 underline underline-offset-2 text-sm mb-4"
            >
              Sign up free for:
            </a>

            {/* Feature list */}
            <ul className="space-y-2 mb-5">
              {[
                'Upload photos for each day',
                'Edit on the page or with the AI assistant',
                'Pick a visual theme that fits the vibe',
                'Keep all your quotes in one place',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                  <span className="mt-0.5 text-accent">•</span>
                  {item}
                </li>
              ))}
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-0.5">•</span>
                Full tour management
                <span className="ml-1 text-xs font-medium bg-secondary px-1.5 py-0.5 rounded-full">
                  Coming soon
                </span>
              </li>
            </ul>

            <p className="text-xs text-muted-foreground text-center">
              No credit card. Free forever for quote creation.
            </p>
          </div>
        </div>
      )}

    </>
  )
}
