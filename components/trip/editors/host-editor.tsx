'use client'

export type Host = {
  name?: string | null
  title?: string | null
  bio?: string | null
  avatarUrl?: string | null
} | null | undefined

export type HostPatch = {
  name: string | null
  title: string | null
  bio: string | null
  avatarUrl: string | null
}

type Props = {
  value: Host
  onChange: (next: HostPatch | null) => void
}

function emptyToNull(v: string): string | null {
  return v.trim() ? v.trim() : null
}

/**
 * Inline host editor.
 *
 * Fields:
 *   - Name: required to surface the block at all (canvas hides host
 *     section + hero overlay when missing)
 *   - Title: short professional descriptor (e.g. "Art historian")
 *   - Bio: pull-quote / prose for Atelier+Expedition host blocks
 *   - Avatar URL: paste-only for now; Studio drawer doesn't yet handle
 *     avatar upload. Operators paste a public URL or leave blank.
 *
 * "Clear host" wipes the entire host object to null (block disappears
 * on render). Stateless — drawer batches the save.
 */
export function HostEditor({ value, onChange }: Props) {
  const current: HostPatch = {
    name: value?.name ?? null,
    title: value?.title ?? null,
    bio: value?.bio ?? null,
    avatarUrl: value?.avatarUrl ?? null,
  }

  const setField = (key: keyof HostPatch, raw: string) => {
    onChange({ ...current, [key]: emptyToNull(raw) })
  }

  const anyValue = Object.values(current).some((v) => v !== null)

  return (
    <div className="space-y-4">
      <Field
        label="Name"
        hint="Required — without a name, the host block stays hidden"
        value={current.name || ''}
        onChange={(v) => setField('name', v)}
        placeholder="Claire Vasseur"
      />
      <Field
        label="Title"
        hint="Short role (Art historian, Mountain guide)"
        value={current.title || ''}
        onChange={(v) => setField('title', v)}
        placeholder="Art historian"
      />
      <Field
        label="Bio"
        hint="Used as a pull-quote on Atelier and Expedition themes"
        as="textarea"
        rows={4}
        value={current.bio || ''}
        onChange={(v) => setField('bio', v)}
        placeholder="Nine years at the Musée d'Orsay…"
      />
      <Field
        label="Avatar URL"
        hint="Public image URL (paste-only for now)"
        type="url"
        value={current.avatarUrl || ''}
        onChange={(v) => setField('avatarUrl', v)}
        placeholder="https://…"
      />

      {anyValue && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-foreground/60 hover:text-foreground hover:underline"
        >
          Clear host (hide block)
        </button>
      )}
    </div>
  )
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  as = 'input',
  type = 'text',
  rows = 3,
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  as?: 'input' | 'textarea'
  type?: string
  rows?: number
}) {
  const baseClass =
    'w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors'
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-1">
        {label}
      </label>
      {as === 'textarea' ? (
        <textarea
          className={baseClass}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          className={baseClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
      {hint && <p className="text-xs text-foreground/50 mt-1">{hint}</p>}
    </div>
  )
}
