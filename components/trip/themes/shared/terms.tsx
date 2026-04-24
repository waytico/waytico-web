'use client'

import { EditableField } from '@/components/editable/editable-field'

type TermsBlockProps = {
  terms: string | null | undefined
  owner: boolean
  onSave: (value: string) => Promise<boolean>
}

/**
 * Terms block — plain editable multiline (same as current trip-page-client
 * lines 1038–1051). The themed visual treatment comes from `--theme-*`.
 *
 * No list parsing here — terms stay as-is whether a user wrote one paragraph
 * or a bulleted list; per-theme components can add rule decorations around
 * the section if they want.
 */
export function TermsBlock({ terms, owner, onSave }: TermsBlockProps) {
  if (!terms && !owner) return null

  return (
    <section>
      <h2 className="text-2xl font-serif font-bold mb-4 text-theme-fg">Terms</h2>
      <EditableField
        as="multiline"
        editable={owner}
        value={terms}
        placeholder="Click to add terms"
        rows={4}
        className="text-sm text-theme-fg-mute w-full"
        onSave={onSave}
      />
    </section>
  )
}
