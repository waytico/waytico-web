'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

type Props = {
  tripTitle: string
  tripUrl: string
  signUpUrl: string
  scrollFraction?: number
  onShareClick: () => void
}

export default function AnonUpsellModal({
  tripTitle,
  tripUrl,
  signUpUrl,
  scrollFraction = 0.5,
  onShareClick,
}: Props) {
  const [visible, setVisible] = useState(false)
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

  const dismiss = () => setVisible(false)

  const handleShare = () => {
    setVisible(false)
    onShareClick()
  }

  if (!visible) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) dismiss()
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-background border border-border shadow-2xl p-6 pt-8">
        {/* Close */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 text-foreground/70 hover:text-foreground hover:bg-secondary rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Orange CTA block */}
        <a
          href={signUpUrl}
          className="block w-full mb-5 py-4 px-4 rounded-xl bg-accent text-accent-foreground font-semibold text-center text-lg font-serif hover:bg-accent/90 transition-colors"
        >
          Sign up free for:
        </a>

        {/* Feature list */}
        <ul className="space-y-2.5 mb-5">
          {[
            'Upload or replace photos for each day',
            'Edit on the page or with the AI assistant',
            'Add your brand — logo, tagline, terms',
            'Keep all your quotes and clients in one place',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
              <span className="mt-0.5 text-accent">•</span>
              {item}
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground text-center">
          or{' '}
          <button
            type="button"
            onClick={handleShare}
            className="underline underline-offset-2 hover:text-foreground/60 transition-colors"
          >
            send to your client as is
          </button>
        </p>
      </div>
    </div>
  )
}
