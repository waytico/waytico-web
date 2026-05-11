/**
 * Shared trip-page UI strings — legacy entry point.
 *
 * @deprecated Use `getStrings(language)` (server) or `useStrings(language)`
 *   (client) from `@/lib/i18n/strings`. This shim points at the English
 *   dictionary so existing call sites keep working while components are
 *   migrated to language-aware lookup.
 */

import { STRINGS } from './i18n/strings'

export const UI = STRINGS.en

export type SectionLabel = keyof typeof UI.sectionLabels
