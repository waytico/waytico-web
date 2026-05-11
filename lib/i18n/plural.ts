/**
 * Language-aware plural form selector.
 *
 * Wraps `Intl.PluralRules.select` and maps its categories ("one", "few",
 * "many", "other") to a small set of named forms supplied by the caller.
 *
 * English needs only `one` and `many` (the latter doubles as "other").
 * Russian needs `one` / `few` / `many`:
 *   one  → 1, 21, 31, 41, … (numbers ending in 1 except 11)
 *   few  → 2-4, 22-24, 32-34, … (numbers ending in 2-4 except 12-14)
 *   many → 0, 5-20, 25-30, … (everything else)
 *
 * Callers pass `few` only for languages that distinguish it. When the
 * runtime returns "few" but no form was supplied, falls back to `many`
 * (which is what English callers want — they only pass `one` / `many`).
 */

import { resolveLanguage } from './strings'

type PluralForms = {
  one: string
  few?: string
  many: string
}

export function pluralize(
  language: string | null | undefined,
  count: number,
  forms: PluralForms,
): string {
  const lang = resolveLanguage(language)
  let rule: Intl.LDMLPluralRule
  try {
    rule = new Intl.PluralRules(lang).select(count)
  } catch {
    // If the runtime can't resolve the locale for any reason, treat as
    // English ("one" for exactly 1, "many" for everything else).
    rule = count === 1 ? 'one' : 'other'
  }
  switch (rule) {
    case 'one':
      return forms.one
    case 'few':
      return forms.few ?? forms.many
    case 'many':
      return forms.many
    case 'other':
    default:
      return forms.many
  }
}
