/**
 * JSX helper for rendering the footer copyright line with the brand
 * wordmark styled separately from the surrounding text.
 *
 * Lives in its own file (not in lib/footer-content.ts) because that
 * file is .ts and can't host JSX without renaming. Both Footer
 * components (components/footer.tsx and FooterMagazine inside
 * components/trip/trip-footer.tsx) use this so brand styling stays
 * consistent.
 */

import type { CSSProperties, ReactNode } from 'react'
import { FOOTER_BRAND_WORDMARK } from './footer-content'

export function renderCopyLine(
  year: number,
  brandClassName?: string,
  brandStyle?: CSSProperties,
): ReactNode {
  return (
    <>
      © {year}{' '}
      <span className={brandClassName} style={brandStyle}>
        {FOOTER_BRAND_WORDMARK}
      </span>
      . Built for small travel businesses.
    </>
  )
}
