/**
 * Magazine — Overview section.
 *
 * Source: magazine-trip.jsx lines 165–188, MAGAZINE-SPEC §D.
 *
 * Mobile + desktop sizing per §R.2 lives in layout.css. Owner-mode:
 * description (the whole multi-paragraph blob) edits via a single
 * multiline EditableField. The lede-italic and paragraph splits are
 * display-time decisions, so the operator just sees / edits the raw
 * text and the renderer reapplies typography on save.
 */
import type { ThemePropsV2 } from '@/types/theme-v2'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'

function renderParagraphs(text: string) {
  const paras = text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
  const lead = paras.length > 1
  return paras.map((p, i) => (
    <p
      key={i}
      className={
        'mag-overview__paragraph' +
        (lead && i === 0 ? ' mag-overview__paragraph--lead' : '')
      }
    >
      {p}
    </p>
  ))
}

export function Overview({ data }: ThemePropsV2) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable
  const description = data.project.description?.trim() || ''

  if (!editable && !description) return null

  return (
    <section className="mag-section mag-section--py">
      <div className="mag-shell">
        {editable ? (
          <EditableField
            as="multiline"
            value={description}
            editable
            rows={8}
            placeholder="Describe the trip — three short paragraphs read best."
            onSave={(v) => ctx!.mutations.saveProjectPatch({ description: v })}
            renderDisplay={(v) => <>{renderParagraphs(v)}</>}
          />
        ) : (
          renderParagraphs(description)
        )}
      </div>
    </section>
  )
}
