'use client'

import { EditableField } from '@/components/editable/editable-field'

type OverviewBlockProps = {
  /** `trip_projects.description` */
  description: string | null | undefined
  owner: boolean
  /** Called with the new description text on commit. Returns true on success. */
  onSave: (value: string) => Promise<boolean>
}

/**
 * Block #2 — Overview.
 *
 * Extracted 1:1 from trip-page-client.tsx (lines 781–794 as of TZ-5 step 3b).
 * Same editable multiline field; colours switched to `--theme-*` utilities so
 * it works on Journal / Expedition / Atelier.
 *
 * Hidden entirely for clients when description is empty.
 */
export function OverviewBlock({ description, owner, onSave }: OverviewBlockProps) {
  if (!description && !owner) return null

  return (
    <section>
      <h2 className="text-2xl font-serif font-bold mb-4 text-theme-fg">Overview</h2>
      <EditableField
        as="multiline"
        editable={owner}
        value={description}
        placeholder="Click to add overview"
        rows={5}
        className="text-theme-fg-soft leading-relaxed w-full"
        onSave={onSave}
      />
    </section>
  )
}
