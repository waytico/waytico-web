/**
 * Russian dative-case inflector for single-word personal names.
 *
 * Used by the contact-agent CTA so the Magazine eyebrow reads
 * "НАПИШИ ВАДИМУ" (dative) instead of the nominative "НАПИШИ ВАДИМ" the
 * operator entered on their brand profile. Russian addressing
 * grammatically requires the dative case after "Напиши".
 *
 * Behaviour is intentionally conservative:
 *   - Only inflects when `language` resolves to Russian.
 *   - Only inflects single Cyrillic words (no spaces, no Latin letters).
 *     This keeps company names ("Travel Studio Anna"), multi-word
 *     phrases ("команде"), and mixed-script handles untouched — the
 *     operator can always type the exact form they want.
 *   - Falls back to the original string for unknown endings.
 *
 * Heuristic rules cover the common -m, -й, -ь, -а, -я endings. Edge
 * cases (Мария → Марии, Дмитрий → Дмитрию, foreign names ending in -о
 * etc.) intentionally pass through unchanged; the operator can supply
 * the dative form directly via brand profile if those names come up in
 * practice.
 */

import { resolveLanguage } from './strings'

const CYR_WORD_RE = /^[а-яё]+$/i

export function toDativeName(
  name: string | null | undefined,
  language: string | null | undefined,
): string {
  if (!name) return ''
  const trimmed = name.trim()
  if (trimmed.length === 0) return ''
  if (resolveLanguage(language) !== 'ru') return trimmed
  if (!CYR_WORD_RE.test(trimmed)) return trimmed

  const last = trimmed[trimmed.length - 1].toLowerCase()
  const stem = trimmed.slice(0, -1)

  switch (last) {
    // Soft-sign / -й masculine: drop and add -ю.
    // Игорь → Игорю, Андрей → Андрею.
    case 'ь':
    case 'й':
      return stem + 'ю'

    // Feminine -а / -я: drop and add -е.
    // Анна → Анне, Ольга → Ольге, Дарья → Дарье.
    // Note: this also covers some masculine -а names (Никита → Никите),
    // which behaves the same way in dative.
    case 'а':
    case 'я':
      return stem + 'е'

    // Already-inflected or non-inflectable endings — leave alone.
    case 'е':
    case 'и':
    case 'о':
    case 'у':
    case 'ы':
    case 'ю':
      return trimmed

    default: {
      // Consonant ending → +у. Covers the bulk of masculine names:
      // Вадим → Вадиму, Иван → Ивану, Олег → Олегу.
      if (/[бвгджзклмнпрстфхцчшщ]/i.test(last)) {
        return trimmed + 'у'
      }
      return trimmed
    }
  }
}
