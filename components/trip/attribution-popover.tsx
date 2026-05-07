'use client'

/**
 * Attribution popover — clickable "i" icon on global-bank photos.
 *
 * Renders only when `attribution_html` is non-null (which our backend
 * fills only for media rows whose `source_global_bank_id` resolves to
 * a `global_photo_bank` entry). The HTML body is server-pre-escaped
 * (see waytico-backend `services/global-bank/attribution.ts`), so
 * `dangerouslySetInnerHTML` is the right call here — author / source /
 * license URLs all pass through `escapeHtml` upstream and the only
 * tags we emit are anchor tags built from those escaped pieces.
 *
 * Toggles on click (and closes on outside click). No hover state — a
 * popover that opens on hover is awkward for keyboard users and
 * touch screens both.
 */

import { useEffect, useRef, useState } from 'react'

export function AttributionPopover({ html }: { html: string | null }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  if (!html) return null
  return (
    <span ref={ref} className="tp-attr">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="tp-attr__btn"
        aria-label="Photo attribution"
        aria-expanded={open}
      >
        <span aria-hidden="true">i</span>
      </button>
      {open && (
        <span
          role="tooltip"
          className="tp-attr__pop"
          // Server pre-escapes author / license / source via escapeHtml
          // before assembling the anchor tags — see Stage 7's
          // services/global-bank/attribution.ts:renderAttributionHtml.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </span>
  )
}
