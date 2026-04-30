'use client'

import { useRef } from 'react'
import { X } from 'lucide-react'

type Props = {
  /** When true, the modal is rendered. Parent owns the visibility flag
   *  so that re-mounting doesn't replay the modal on F5 — it should
   *  fire exactly once, immediately after a successful claim. */
  show: boolean
  onClose: () => void
}

/**
 * PostClaimUpsellModal — fires once, in-memory, right after the
 * anon → register → claim handshake succeeds. Sits on top of the
 * just-created trip page (parent renders it after the claim
 * useEffect flips its flag) and walks the operator through five
 * non-obvious actions they can take on this quote.
 *
 * Closes via the × button, a click outside the card, or the
 * Let's go CTA in the footer. Visually matches AnonUpsellModal
 * (same surface, same border, same accent bullets) so the post-
 * claim path feels like a continuation of the pre-register flow.
 */
export default function PostClaimUpsellModal({ show, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  if (!show) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-6 pt-10">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 text-foreground/70 hover:text-foreground hover:bg-secondary rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <h2 className="font-serif text-2xl text-foreground leading-tight mb-1">
          You&apos;re all set
        </h2>
        <p className="text-sm text-foreground/70 mb-5">
          It&apos;s saved to your account. Now you can:
        </p>

        {/* Feature list */}
        <ul className="space-y-2.5">
          {[
            {
              t: 'Edit it with AI',
              d: 'type into the bar at the bottom — “add a rest day”, “polish day 3”…',
            },
            {
              t: 'Click anything to refine',
              d: 'text, dates, prices, the day-by-day plan',
            },
            {
              t: 'Drop in your own photos',
              d: 'for the hero and each day',
            },
            {
              t: 'Pick a visual style',
              d: 'Classic, Cinematic, or Clean',
            },
            {
              t: 'Make it yours',
              d: 'add your logo, business name, and contacts on the dashboard',
            },
          ].map((item) => (
            <li
              key={item.t}
              className="flex items-start gap-2 text-sm text-foreground/80"
            >
              <span className="mt-1 text-accent leading-none">•</span>
              <span>
                <strong className="font-semibold text-foreground">
                  {item.t}
                </strong>{' '}
                — <span className="text-foreground/70">{item.d}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Closing CTA. The list above can read as homework — without a
            footer button, the only way out is the × in the corner, which
            doesn't suggest "you're done, go play". The Let's go pill
            mirrors the orange Create-quote / See-the-page CTAs the
            operator has already clicked twice on the way here, keeping
            the visual through-line. */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full px-6 py-2 font-semibold text-sm inline-flex items-center gap-1 transition-colors"
          >
            Let&apos;s go →
          </button>
        </div>
      </div>
    </div>
  )
}
