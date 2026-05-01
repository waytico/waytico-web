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

  // brand_terms inheritance — per-trip override wins over brand-level
  // default. Edits to brand_terms in the operator profile reflect on
  // every trip in real time without copy/paste, while per-trip terms
  // still take precedence whenever they exist (legacy 763-771).
  const tripTerms = (data.project.terms || '').trim()
  const brandTerms = (data.owner?.brand_terms || '').trim()
  const effective = tripTerms || brandTerms || ''
  const inherited = !tripTerms && !!brandTerms

  if (!editable && !effective) return null

  const renderParagraphs = (raw: string) => {
    const paras = raw.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
    return paras.map((p, i) => (
      <p key={i} className="mag-terms__paragraph">{p}</p>
    ))
  }

  return (
    <section id="terms" className="mag-section mag-section--py">
      <div className="mag-shell">
        <Hairline className="mag-terms__hairline" />
        <div className="mag-eyebrow mag-terms__heading">
          {UI.sectionLabels.terms.toUpperCase()}
        </div>

        {editable ? (
          <OwnerTermsEditor
            tripTerms={tripTerms}
            brandTerms={brandTerms}
            inherited={inherited}
            renderParagraphs={renderParagraphs}
            onSaveTerms={(v) => ctx!.mutations.saveProjectPatch({ terms: v })}
          />
        ) : (
          <>
            <div
              className={
                'mag-terms__body ' +
                (expanded
                  ? 'mag-terms__body--expanded'
                  : 'mag-terms__body--collapsed')
              }
            >
              {renderParagraphs(effective)}
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

/**
 * Owner-mode renderer with three branches (legacy 774-834):
 *   A. tripTerms is set      → multiline EditableField, edits land on terms.
 *   B. inherited from brand  → render brand text read-only + 'Override for
 *                              this trip' button that seeds the editor with
 *                              the brand text.
 *   C. neither is set        → placeholder editor on terms.
 *
 * Always shows the ownerHint line so the operator knows edits scope to
 * this trip only.
 */
function OwnerTermsEditor({
  tripTerms,
  brandTerms,
  inherited,
  renderParagraphs,
  onSaveTerms,
}: {
  tripTerms: string
  brandTerms: string
  inherited: boolean
  renderParagraphs: (raw: string) => React.ReactNode
  onSaveTerms: (v: string) => Promise<boolean>
}) {
  return (
    <>
      {tripTerms ? (
        <EditableField
          as="multiline"
          value={tripTerms}
          editable
          rows={10}
          placeholder="Terms — paragraph breaks render as separate paragraphs."
          onSave={onSaveTerms}
          renderDisplay={(v) => <>{renderParagraphs(v)}</>}
        />
      ) : inherited ? (
        <>
          <div className="mag-terms__body">{renderParagraphs(brandTerms)}</div>
          <p className="mag-terms__inherited-hint">
            Showing your brand default terms.{' '}
            <button
              type="button"
              onClick={() => void onSaveTerms(brandTerms)}
              className="mag-terms__override-btn"
            >
              Override for this trip
            </button>
          </p>
        </>
      ) : (
        <EditableField
          as="multiline"
          value=""
          editable
          rows={6}
          placeholder="Click to add terms"
          onSave={onSaveTerms}
          renderDisplay={(v) => <>{renderParagraphs(v)}</>}
        />
      )}

      <p className="mag-terms__owner-hint">
        Edits here apply to this trip only. Update your profile terms to
        change them across this and future trips.
      </p>
    </>
  )
}
