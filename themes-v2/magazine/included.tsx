/**
 * Magazine — Included / Not Included section.
 *
 * Source: MAGAZINE-SPEC §G. Mobile + desktop layout per §R.2 lives in
 * layout.css — mobile = stacked, desktop = 2-column side-by-side.
 *
 * Owner-mode: each column edits as a single multiline blob (one item
 * per line), saved via saveProjectPatch. The renderer splits lines on
 * the fly so display matches the source layout exactly.
 */
import type { ReactNode } from 'react'
import type { ThemePropsV2 } from '@/types/theme-v2'
import { UI } from '@/lib/ui-strings'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { Hairline } from './styles'

function splitItems(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-•·*]\s*/, '').trim())
    .filter(Boolean)
}

function ItemList({ items }: { items: string[] }) {
  return (
    <ul className="mag-incl__list">
      {items.map((t, i) => (
        <li key={i}>
          <div className="mag-incl__item-text">{t}</div>
          <Hairline />
        </li>
      ))}
    </ul>
  )
}

function Column({
  heading,
  items,
  editable,
  onSave,
  rawValue,
  placeholder,
}: {
  heading: string
  items: string[]
  editable: boolean
  onSave: (v: string) => Promise<boolean>
  rawValue: string | null
  placeholder: string
}) {
  return (
    <div className="mag-incl__col">
      <div className="mag-incl__col-heading">{heading}</div>
      <Hairline />
      {editable ? (
        <EditableField
          as="multiline"
          value={rawValue}
          editable
          rows={6}
          placeholder={placeholder}
          onSave={onSave}
          renderDisplay={(v) => <ItemList items={splitItems(v)} />}
        />
      ) : (
        <ItemList items={items} />
      )}
    </div>
  )
}

export function Included({ data }: ThemePropsV2) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable
  const inc = splitItems(data.project.included)
  const not = splitItems(data.project.not_included)

  if (!editable && inc.length === 0 && not.length === 0) return null

  const cols: ReactNode[] = []

  if (editable || inc.length > 0) {
    cols.push(
      <Column
        key="inc"
        heading={UI.included.toUpperCase()}
        items={inc}
        editable={editable}
        rawValue={data.project.included}
        placeholder="One item per line"
        onSave={(v) => ctx!.mutations.saveProjectPatch({ included: v })}
      />
    )
  }
  if (editable || not.length > 0) {
    cols.push(
      <Column
        key="not"
        heading={UI.notIncluded.toUpperCase()}
        items={not}
        editable={editable}
        rawValue={data.project.not_included}
        placeholder="One item per line"
        onSave={(v) => ctx!.mutations.saveProjectPatch({ not_included: v })}
      />
    )
  }

  if (cols.length === 0) return null

  return (
    <section id="included" className="mag-section mag-section--py">
      <div className="mag-shell">
        <Hairline className="mag-incl__hairline-top" />
        <div className="mag-eyebrow mag-incl__heading">
          {UI.sectionLabels.included.toUpperCase()}
        </div>
        <div className="mag-incl__grid">{cols}</div>
      </div>
    </section>
  )
}
