'use client'

export type OperatorContact = {
  name?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  telegram?: string | null
  website?: string | null
} | null | undefined

export type OperatorContactPatch = {
  name: string | null
  email: string | null
  phone: string | null
  whatsapp: string | null
  telegram: string | null
  website: string | null
}

type Props = {
  value: OperatorContact
  onChange: (next: OperatorContactPatch | null) => void
}

function emptyToNull(v: string): string | null {
  return v.trim() ? v.trim() : null
}

/**
 * Per-trip operator contact editor.
 *
 * These fields override whatever's on the operator's Studio profile
 * (`users` row) for a single trip — useful when one trip is run by a
 * different lead, or when a particular client should reach a specific
 * channel. The resolver in lib/operator-contact.ts already handles the
 * fallback chain to ownerInfo / hostAvatarUrl.
 *
 * Leaving all fields blank → null on the project, which means the
 * resolver falls back entirely to the operator's profile.
 */
export function OperatorContactEditor({ value, onChange }: Props) {
  const current: OperatorContactPatch = {
    name: value?.name ?? null,
    email: value?.email ?? null,
    phone: value?.phone ?? null,
    whatsapp: value?.whatsapp ?? null,
    telegram: value?.telegram ?? null,
    website: value?.website ?? null,
  }

  const setField = (key: keyof OperatorContactPatch, raw: string) => {
    onChange({ ...current, [key]: emptyToNull(raw) })
  }

  const anyValue = Object.values(current).some((v) => v !== null)

  return (
    <div className="space-y-4">
      <p className="text-xs text-foreground/60 leading-relaxed">
        Per-trip override for the contact section. Anything left blank
        falls back to the operator&apos;s profile.
      </p>
      <Field
        label="Display name"
        value={current.name || ''}
        onChange={(v) => setField('name', v)}
        placeholder="Claire Vasseur"
      />
      <Field
        label="Email"
        type="email"
        value={current.email || ''}
        onChange={(v) => setField('email', v)}
        placeholder="claire@example.com"
      />
      <Field
        label="Phone"
        type="tel"
        value={current.phone || ''}
        onChange={(v) => setField('phone', v)}
        placeholder="+33 6 12 34 56 78"
      />
      <Field
        label="WhatsApp"
        value={current.whatsapp || ''}
        onChange={(v) => setField('whatsapp', v)}
        placeholder="+33612345678"
        hint="Number with country code, no formatting"
      />
      <Field
        label="Telegram"
        value={current.telegram || ''}
        onChange={(v) => setField('telegram', v)}
        placeholder="@username"
      />
      <Field
        label="Website"
        type="url"
        value={current.website || ''}
        onChange={(v) => setField('website', v)}
        placeholder="https://…"
      />

      {anyValue && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-foreground/60 hover:text-foreground hover:underline"
        >
          Clear all (use profile fallback)
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
  type = 'text',
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-1">
        {label}
      </label>
      <input
        type={type}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <p className="text-xs text-foreground/50 mt-1">{hint}</p>}
    </div>
  )
}
