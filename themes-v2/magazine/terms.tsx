/**
 * Magazine — Terms section.
 *
 * Mobile + desktop sizing per §R.2 lives in layout.css.
 *
 * Owner-mode: terms text edits as a single multiline blob, collapse-
 * with-fade preview is preserved on the public render.
 */
'use client'

import { useState } from 'react'
import type { ThemePropsV2 } from '@/types/theme-v2'
import { UI } from '@/lib/ui-strings'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { Hairline } from './styles'

export function Terms({ data }: ThemePropsV2) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable
  const [expanded, setExpanded] = useState(false)
  const text = data.project.terms?.trim() || ''

  if (!editable && !text) return null

  const renderParagraphs = (raw: string) => {
    const paras = raw.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
    return paras.map((p, i) => (
      <p key={i} className="mag-terms__paragraph">{p}</p>
    ))
  }

  return (
    <section className="mag-section mag-section--py">
      <div className="mag-shell">
        <Hairline className="mag-terms__hairline" />
        <div className="mag-eyebrow mag-terms__heading">
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
              className={
                'mag-terms__body ' +
                (expanded ? 'mag-terms__body--expanded' : 'mag-terms__body--collapsed')
              }
            >
              {renderParagraphs(text)}
              {!expanded && <div aria-hidden className="mag-terms__fade" />}
            </div>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mag-terms__toggle"
            >
              {expanded ? 'SHOW LESS ▴' : 'READ FULL TERMS ▾'}
            </button>
          </>
        )}
      </div>
    </section>
  )
}
