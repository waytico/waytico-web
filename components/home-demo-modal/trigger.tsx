'use client'

import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DemoModalTriggerProps {
  onClick: () => void
  className?: string
}

/**
 * Pill button that opens the home demo modal.
 *
 * Hidden on mobile (`<768px`) — modal is desktop-only for now.
 * Subtle styling: not the primary CTA, sits between H1 and the chat textarea.
 */
export default function DemoModalTrigger({ onClick, className }: DemoModalTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'hidden md:inline-flex items-center gap-2',
        'mx-auto mt-6 mb-8',
        'px-4 py-2 rounded-full',
        'bg-secondary/40 hover:bg-secondary/60',
        'border border-foreground/10 hover:border-foreground/20',
        'text-foreground/70 hover:text-foreground',
        'font-sans text-[13px] font-medium',
        'transition-colors',
        className,
      )}
    >
      <Play className="w-3.5 h-3.5 fill-current" strokeWidth={0} />
      <span>Watch how it works — 22 sec</span>
    </button>
  )
}
