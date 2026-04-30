/**
 * Magazine — Overview section.
 *
 * Source: magazine-trip.jsx lines 165–188. Three Cormorant 18px paragraphs
 * on cream with italic-first-paragraph treatment when there are >1.
 *
 * Owner-mode: description (the whole multi-paragraph blob) edits via a
 * single multiline EditableField. The lede-italic and paragraph splits
 * are display-time decisions, so the owner just sees / edits the raw
 * text and the renderer reapplies typography on save.
 */
import type { ThemePropsV2 } from '@/types/theme-v2'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { CREAM, display } from './styles'

export function Overview({ data }: ThemePropsV2) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable
  const description = data.project.description?.trim() || ''

  // In owner mode we always render the section so the operator has a
  // place to type. In public mode we hide entirely on empty.
  if (!editable && !description) return null

  const paragraphs = description.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
  const useItalicLead = paragraphs.length > 1

  return (
    <section style={{ padding: '64px 24px 56px', background: CREAM }}>
      {editable ? (
        <EditableField
          as="multiline"
          value={description}
          editable
          rows={8}
          placeholder="Describe the trip — three short paragraphs read best."
          onSave={(v) => ctx!.mutations.saveProjectPatch({ description: v })}
          renderDisplay={(v) => {
            const paras = v.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)
            const lead = paras.length > 1
            return (
              <>
                {paras.map((p, i) => (
                  <p
                    key={i}
                    style={{
                      ...display,
                      fontSize: 18,
                      lineHeight: 1.5,
                      margin: 0,
                      marginBottom: i === paras.length - 1 ? 0 : 18,
                      ...(lead && i === 0 ? { fontStyle: 'italic' } : null),
                    }}
                  >
                    {p}
                  </p>
                ))}
              </>
            )
          }}
        />
      ) : (
        paragraphs.map((p, i) => (
          <p
            key={i}
            style={{
              ...display,
              fontSize: 18,
              lineHeight: 1.5,
              margin: 0,
              marginBottom: i === paragraphs.length - 1 ? 0 : 18,
              ...(useItalicLead && i === 0 ? { fontStyle: 'italic' } : null),
            }}
          >
            {p}
          </p>
        ))
      )}
    </section>
  )
}
