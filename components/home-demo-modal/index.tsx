'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import DemoModalTrigger from './trigger'

/**
 * Modal is lazy-loaded so its CSS module + image assets are not in the main
 * page bundle and don't affect LCP. Visitor pays the ~1MB only on click.
 */
const DemoModal = dynamic(() => import('./modal'), {
  ssr: false,
  loading: () => null,
})

interface HomeDemoModalProps {
  /** Add custom className to the trigger pill. */
  className?: string
}

/**
 * Self-contained home demo widget — trigger button + modal.
 *
 * Use as a single drop-in next to the home H1.
 *
 * On "Make my own quote" click, finds the first textarea inside <main>
 * and focuses it — visitor lands ready to type.
 */
export default function HomeDemoModal({ className }: HomeDemoModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  function focusChatTextarea() {
    // Defer past the modal close animation (~200ms) so focus lands on a
    // fully visible page, not while the modal is still fading out.
    setTimeout(() => {
      if (typeof document === 'undefined') return
      const ta = document.querySelector<HTMLTextAreaElement>('main textarea')
      if (!ta) return
      ta.focus()
      ta.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 240)
  }

  return (
    <>
      <DemoModalTrigger onClick={() => setIsOpen(true)} className={className} />
      <DemoModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onMakeMyOwn={focusChatTextarea}
      />
    </>
  )
}
