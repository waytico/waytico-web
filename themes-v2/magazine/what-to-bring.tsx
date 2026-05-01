'use client'

import type { ThemePropsV2 } from '@/types/theme-v2'
import { useThemeCtxV2 } from '@/lib/theme-context-v2'
import { EditableField } from '@/components/shared-v2/editable-field'
import { Hairline } from './styles'

type Category = {
  category: string
  items: Array<string | { name?: string; item?: string }>
}

function itemsToStrings(items: Category['items']): string[] {
  return items
    .map((x) => (typeof x === 'string' ? x : x?.name || x?.item || ''))
    .filter(Boolean)
}

export function WhatToBring({ data }: ThemePropsV2) {
  const ctx = useThemeCtxV2()
  const editable = !!ctx?.editable
  const active = ctx?.active

  const categories =
    (data.project as unknown as { what_to_bring?: Category[] }).what_to_bring ?? []

  if (!editable && categories.length === 0) return null

  const saveAll = (next: Category[]) => {
    if (!active) return Promise.resolve(false)
    const normalised = next.map((c) => ({
      category: c.category,
      items: itemsToStrings(c.items),
    }))
    return active.saveWhatToBring(normalised)
  }

  return (
    <section className="mag-section mag-section--py">
      <div className="mag-shell">
        <Hairline className="mag-active__hairline" />
        <div className="mag-eyebrow mag-active__heading">WHAT TO BRING</div>
        <div className="mag-wtb__grid">
          {categories.map((cat, i) => {
            const itemStrings = itemsToStrings(cat.items)
            const joined = itemStrings.join('\n')
            return (
              <div key={i} className="mag-wtb__card">
                <h4 className="mag-wtb__category">
                  {editable ? (
                    <EditableField
                      as="text"
                      value={cat.category}
                      editable
                      onSave={(v) =>
                        saveAll(
                          categories.map((c, idx) =>
                            idx === i
                              ? { category: v, items: itemStrings }
                              : c,
                          ),
                        )
                      }
                      renderDisplay={(v) => <span>{v}</span>}
                    />
                  ) : (
                    cat.category
                  )}
                </h4>
                {editable ? (
                  <EditableField
                    as="multiline"
                    value={joined}
                    editable
                    rows={Math.max(3, itemStrings.length)}
                    placeholder="One item per line"
                    onSave={(v: string) => {
                      const newItems = v
                        .split('\n')
                        .map((s) => s.replace(/^[-•·]\s*/, '').trim())
                        .filter(Boolean)
                      return saveAll(
                        categories.map((c, idx) =>
                          idx === i
                            ? { category: cat.category, items: newItems }
                            : c,
                        ),
                      )
                    }}
                    renderDisplay={() => (
                      <ul className="mag-wtb__items">
                        {itemStrings.map((it, j) => (
                          <li key={j}>{it}</li>
                        ))}
                      </ul>
                    )}
                  />
                ) : (
                  <ul className="mag-wtb__items">
                    {itemStrings.map((it, j) => (
                      <li key={j}>{it}</li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
