'use client'

import { useEffect, useState } from 'react'
import { ChevronUp } from 'lucide-react'

type Props = {
  /** Extra bottom offset in px — use when a fixed bottom bar (e.g. command bar) is present. */
  bottomOffset?: number
}

/**
 * Scroll-to-top button. Appears after scrolling 300px, fixed bottom-right.
 * Offset prop lets callers push it above a fixed bottom bar.
 */
export function ScrollToTop({ bottomOffset = 24 }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed right-4 z-40 flex items-center justify-center w-9 h-9 rounded-full bg-background/90 border border-border shadow-md hover:bg-secondary transition-colors backdrop-blur-sm"
      style={{ bottom: bottomOffset }}
    >
      <ChevronUp className="w-4 h-4 text-foreground/70" />
    </button>
  )
}
