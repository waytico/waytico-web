'use client'

import { useMemo } from 'react'
import { getStrings, type StringSet } from './strings'

/** React hook that returns the string dictionary for a given language.
 *  Server components should call `getStrings(language)` directly instead. */
export function useStrings(
  language: string | null | undefined,
): StringSet {
  return useMemo(() => getStrings(language), [language])
}
