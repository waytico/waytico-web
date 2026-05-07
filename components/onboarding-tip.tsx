import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

/**
 * Small accent-tinted explainer strip prepended to surfaces an operator
 * may not immediately understand (Client info block, Design picker, Send
 * menu, Contact-agent popover). Mirrors the visual register of the
 * preview-as-client banner — same accent palette, same compact type — so
 * "explainer above your work" reads as a consistent affordance across
 * the trip page.
 *
 * Width: stretches to fill its container, so callers control sizing by
 * mounting this inside the popover / block whose contents it explains.
 */
export function OnboardingTip({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 bg-accent text-accent-foreground text-xs leading-snug ${className}`}
    >
      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
