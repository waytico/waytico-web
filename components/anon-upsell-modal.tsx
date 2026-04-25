'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  tripTitle: string
  tripUrl: string
  signUpUrl: string
  /** Delay in ms before the modal appears. Default: 3000 */
  delay?: number
  onShareClick: () => void
}

/**
 * AnonUpsellModal — appears after trip generation for unauthenticated agents.
 * Shows two paths: share immediately, or register free for full features.
 * When dismissed, leaves a floating "Share as is" button in the bottom-right.
 */
export default function AnonUpsellModal({
  tripTitle,
  tripUrl,
  signUpUrl,
  delay = 8000,
  onShareClick,
}: Props) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  // Close via X → hide modal AND show floating share button
  const dismissWithFloat = () => {
    setVisible(false)
    setDismissed(true)
  }

  // Close via Share → hide modal only (no floating button; share dropdown opens instead)
  const dismissSilent = () => {
    setVisible(false)
  }

  const handleShare = () => {
    dismissSilent()
    onShareClick()
  }

  if (!visible && !dismissed) return null

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
          <div className="relative w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-6">
            {/* Close */}
            <button
              type="button"
              onClick={dismissWithFloat}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 p-1 text-foreground/40 hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
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
                'Refine it with AI — just type what to change',
                'Upload photos for each day',
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

      {/* ── Floating share button after dismiss ── */}
      {dismissed && (
        <button
          type="button"
          onClick={onShareClick}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent text-accent-foreground text-sm font-semibold shadow-lg hover:bg-accent/90 transition-colors"
        >
          Share as is →
        </button>
      )}
    </>
  )
}
