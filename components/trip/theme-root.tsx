import type { ReactNode } from 'react'
import { resolveTheme, type ThemeId } from '@/lib/themes'

type Props = {
  /**
   * Raw value as it arrives from the server (`project.design_theme`).
   * Anything not in THEMES coerces to 'editorial' — see lib/themes.ts.
   */
  theme: string | null | undefined
  /** When true, renders mobile-tuned variant of CSS rules. */
  mobile?: boolean
  className?: string
  children: ReactNode
}

/**
 * ThemeRoot — sets `data-theme` on a `<div>` so the CSS variable cascade in
 * `styles/themes.css` activates for everything inside. Server component:
 * no client state, no hydration cost. The themed surface lives only inside
 * this wrapper; outside it (header / action bar / command bar / eye-toggles)
 * keeps shadcn semantic tokens.
 *
 * Pre-resolves the ThemeId on the server so the first paint already reflects
 * the persisted choice — preventing the flash-of-default-theme that would
 * happen if the data attribute were applied client-side only.
 *
 * See TZ-6 §5.4 ("themed surface lives only inside <ThemeRoot>") and §11
 * (hydration mismatch mitigation: theme always derived from server source).
 */
export function ThemeRoot({ theme, mobile, className, children }: Props) {
  const resolved: ThemeId = resolveTheme(theme)
  return (
    <div
      data-theme={resolved}
      data-mobile={mobile ? 'true' : undefined}
      className={className ? `trip-page ${className}` : 'trip-page'}
    >
      {children}
    </div>
  )
}
