'use client'

import { useRef } from 'react'
import { X } from 'lucide-react'

type Props = {
  show: boolean
  onClose: () => void
}

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
          Draft saved to your account. Now you can:
        </p>

        {/* Feature list */}
        <ul className="space-y-2.5">
          {[
            'Upload or replace photos for each day',
            'Edit on the page or with the AI assistant',
            'Add your brand — logo, tagline, terms',
            'Keep all your quotes and clients in one place',
            'Share the quote with your client — send them the link',
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-foreground/80"
            >
              <span className="mt-1 text-accent leading-none">•</span>
              {item}
            </li>
          ))}
        </ul>

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
