/**
 * Magazine — Terms section.
 *
 * Source: no equivalent in magazine-trip.jsx — that demo ends with
 * the Price block. We reuse the editorial collapse pattern (preview
 * fade + "Read full terms" toggle) but reskinned for the cream surface
 * and Cormorant body of Magazine.
 *
 * Empty state: if terms is null/blank → section hidden.
 */
'use client'

import { useState } from 'react'
import type { ThemePropsV2 } from '@/types/theme-v2'
import { UI } from '@/lib/ui-strings'
import { ACCENT, body, BLACK, CREAM, eyebrow, Hairline } from './styles'

export function Terms({ data }: ThemePropsV2) {
  const [expanded, setExpanded] = useState(false)
  const text = data.project.terms?.trim()
  if (!text) return null

  const paragraphs = text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
  const previewLineHeight = 1.62
  const previewMaxLines = 4
  const collapsedHeight = `calc(${previewLineHeight}em * ${previewMaxLines})`

  return (
    <section style={{ background: CREAM, padding: '0 24px 56px' }}>
      <Hairline style={{ marginBottom: 40 }} />
      <div style={{ ...eyebrow, marginBottom: 18 }}>
        {UI.sectionLabels.terms.toUpperCase()}
      </div>

      <div
        style={{
          position: 'relative',
          maxHeight: expanded ? 'none' : collapsedHeight,
          overflow: 'hidden',
          transition: 'max-height 0.25s ease',
        }}
      >
        {paragraphs.map((p, i) => (
          <p
            key={i}
            style={{
              ...body,
              lineHeight: previewLineHeight,
              color: BLACK,
              margin: 0,
              marginBottom: i === paragraphs.length - 1 ? 0 : 14,
              whiteSpace: 'pre-wrap',
            }}
          >
            {p}
          </p>
        ))}

        {!expanded && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              height: 56,
              pointerEvents: 'none',
              background: `linear-gradient(180deg, rgba(245,240,230,0) 0%, ${CREAM} 100%)`,
            }}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          marginTop: 14,
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          ...eyebrow,
          fontSize: 10,
          color: ACCENT,
          letterSpacing: '0.16em',
        }}
      >
        {expanded ? 'SHOW LESS ▴' : 'READ FULL TERMS ▾'}
      </button>
    </section>
  )
}
