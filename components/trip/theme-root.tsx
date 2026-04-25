import { cn } from '@/lib/utils'
import { resolveTheme, type ThemeId } from '@/lib/themes'

type ThemeRootProps = {
  theme: ThemeId | string | null | undefined
  children: React.ReactNode
  className?: string
}

/**
 * Wraps trip-page content in a themed scope.
 *
 * - Sets `data-theme` on the container; all theme CSS (tokens, typography,
 *   background) is scoped to `.theme-root[data-theme="..."]`.
 * - Falls back to the default theme if the incoming value is unknown.
 * - Server component — no state. The theme switcher (client) updates the
 *   project via API and the page re-renders with the new `theme` prop.
 */
export function ThemeRoot({ theme, children, className }: ThemeRootProps) {
  const resolved = resolveTheme(theme)
  return (
    <div
      data-theme={resolved}
      className={cn('theme-root mx-auto', className)}
      style={{ maxWidth: 1440 }}
    >
      {children}
    </div>
  )
}

export type { ThemeId }
