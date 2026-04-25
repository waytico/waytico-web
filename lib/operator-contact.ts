// ----------------------------------------------------------------------------
// Operator contact resolver
// ----------------------------------------------------------------------------
// Trip pages combine three sources for the "contact the operator" section:
//
//   1. `project.operator_contact` — explicit per-trip contact set by the agent
//   2. `owner.*` — the agent's account profile (email, business_name, name)
//   3. null — nothing is known
//
// Per TZ-5 answer to Q6, resolution cascades with these rules:
//   email   → operator_contact.email  ?? owner.email
//   name    → operator_contact.name   ?? owner.business_name ?? owner.name
//   phone   → operator_contact.phone  ?? null (no fallback)
//   whatsapp, telegram, website → no fallback (operator-only)
//
// The operator block is hidden entirely only if *nothing* resolves — not even
// owner.email. That way a page never looks orphaned.

export type ResolvedOperatorContact = {
  email: string | null
  name: string | null
  phone: string | null
  whatsapp: string | null
  telegram: string | null
  website: string | null
}

type OperatorContactInput = {
  email?: string | null
  name?: string | null
  phone?: string | null
  whatsapp?: string | null
  telegram?: string | null
  website?: string | null
} | null | undefined

type OwnerInput = {
  email?: string | null
  name?: string | null
  business_name?: string | null
} | null | undefined

const clean = (v: string | null | undefined): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}

/**
 * Filter known placeholder values that should be treated as absent.
 * Currently: anonymous trip owners get an `unknown@waytico.com` stub
 * email — surfacing that to clients looks broken, so treat it as null.
 */
const cleanEmail = (v: string | null | undefined): string | null => {
  const s = clean(v)
  if (!s) return null
  if (s.toLowerCase() === 'unknown@waytico.com') return null
  return s
}

export function resolveOperatorContact(
  operatorContact: OperatorContactInput,
  owner: OwnerInput,
): ResolvedOperatorContact {
  return {
    email: cleanEmail(operatorContact?.email) ?? cleanEmail(owner?.email),
    name:
      clean(operatorContact?.name) ??
      clean(owner?.business_name) ??
      clean(owner?.name),
    phone: clean(operatorContact?.phone),
    whatsapp: clean(operatorContact?.whatsapp),
    telegram: clean(operatorContact?.telegram),
    website: clean(operatorContact?.website),
  }
}

/** True if the resolved contact has at least one usable channel. */
export function hasAnyContact(c: ResolvedOperatorContact): boolean {
  return Boolean(c.email || c.phone || c.whatsapp || c.telegram || c.website)
}

/** Anchor href for a channel: prefers deep-linkable schemes when possible. */
export function channelHref(
  channel: 'email' | 'phone' | 'whatsapp' | 'telegram' | 'website',
  value: string | null,
): string | null {
  if (!value) return null
  const v = value.trim()
  switch (channel) {
    case 'email':
      return `mailto:${v}`
    case 'phone':
      return `tel:${v.replace(/\s+/g, '')}`
    case 'whatsapp': {
      // Strip non-digits to build a wa.me link. If the user entered a @handle
      // or URL, fall back to that literal value.
      const digits = v.replace(/[^\d]/g, '')
      if (digits.length >= 6) return `https://wa.me/${digits}`
      return v.startsWith('http') ? v : null
    }
    case 'telegram': {
      if (v.startsWith('http')) return v
      const handle = v.replace(/^@/, '')
      return handle ? `https://t.me/${handle}` : null
    }
    case 'website':
      return v.startsWith('http') ? v : `https://${v}`
    default:
      return null
  }
}
