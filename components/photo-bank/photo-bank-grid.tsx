'use client'

/**
 * Photo Bank — generic grid layout for both free preview и paid full UI.
 *
 * Renders children in a 2/3/4-col responsive grid; caller decides which
 * card variant to instantiate per photo (`<GlobalPhotoCard>` for free
 * preview, `<PhotoCard>` for paid).
 */

import type { ReactNode } from 'react'

export function PhotoBankGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {children}
    </div>
  )
}
