/**
 * Magazine — Terms section.
 *
 * Owner-mode (stage 3): terms text edits as a single multiline blob,
 * collapse-with-fade preview is preserved on the public render.
 */
'use client'

import { useState } from 'react'
import type { ThemePropsV2 } from '@/types/theme-v2'
import { UI } from '@/lib/ui-strings'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { ACCENT, body, BLACK, CREAM, eyebrow, Hairline } from './styles'

export function Terms({ data }: ThemePropsV2) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable
  const [expanded, setExpanded] = useState(false)
  const text = data.project.terms?.trim() || ''

  if (!editable && !text) return null

  const previewLineHeight = 1.62
  const previewMaxLines = 4
  const collapsedHeight = `calc(${previewLineHeight}em * ${previewMaxLines})`

  const renderParagraphs = (raw: string) => {
    const paras = raw.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
    return paras.map((p, i) => (
      <p
        key={i}
        style={{
          ...body,
          lineHeight: previewLineHeight,
          color: BLACK,
          margin: 0,
          marginBottom: i === paras.length - 1 ? 0 : 14,
          whiteSpace: 'pre-wrap',
        }}
      >
        {p}
      </p>
    ))
  }

  return (
    <section style={{ background: CREAM, padding: '0 24px 56px' }}>
      <Hairline style={{ marginBottom: 40 }} />
      <div style={{ ...eyebrow, marginBottom: 18 }}>
        {UI.sectionLabels.terms.toUpperCase()}
      </div>

      {editable ? (
        // Owner: full edit, no collapse — keeping the legal text fully
        // visible while the operator is working with it.
        <EditableField
          as="multiline"
          value={text}
          editable
          rows={10}
          placeholder="Terms — paragraph breaks render as separate paragraphs."
          onSave={(v) => ctx!.mutations.saveProjectPatch({ terms: v })}
          renderDisplay={(v) => <>{renderParagraphs(v)}</>}
        />
      ) : (
        <>
          <div
            style={{
              position: 'relative',
              maxHeight: expanded ? 'none' : collapsedHeight,
              overflow: 'hidden',
              transition: 'max-height 0.25s ease',
            }}
          >
            {renderParagraphs(text)}

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
        </>
      )}
    </section>
  )
}
