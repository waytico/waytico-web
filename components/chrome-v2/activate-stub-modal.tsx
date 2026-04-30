'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

const FEATURES = [
  'Pre-departure task list with deadlines',
  'Auto email reminders 7 / 3 / 1 days before each deadline',
  'What-to-bring checklist for travelers',
  'Document storage for tickets, vouchers, and confirmations',
  'Live status updates shared between you and the client',
]

/**
 * Temporary placeholder for the Activate flow. Shown when the operator
 * picks "Activate" from the trip-action-bar status menu while paid
 * activation (Stripe checkout) is intentionally disabled.
 *
 * Replace this with the real ActivateButton + Stripe checkout once
 * activation is ready to ship.
 */
export function ActivateStubModal({ open, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl p-6 pt-12">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 text-foreground/70 hover:text-foreground hover:bg-secondary rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-serif font-semibold mb-2">Activate this trip</h2>
        <p className="text-sm text-foreground/70 mb-4 leading-relaxed">
          Activation moves the trip from quote into operational mode, opening up the prep
          features for you and the client:
        </p>

        <ul className="space-y-2 mb-5">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
              <span className="mt-0.5 text-accent">•</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="rounded-lg bg-secondary/60 border border-border px-3 py-2 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-1">
            Coming soon
          </p>
          <p className="text-sm text-foreground/75 leading-snug">
            The full activation flow is in beta. We&apos;ll let you know the moment it&apos;s
            ready to use on real client trips.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

