/**
 * Magazine — Overview section.
 *
 * Source: magazine-trip.jsx lines 165–188. Three Cormorant 18px paragraphs
 * on the cream background with italic-first-sentence on the lead paragraph.
 *
 * We split data.project.description on blank lines to get paragraphs.
 * For italic-first-sentence we render the lead paragraph fully italic
 * (close enough to the source intent without fragile sentence-boundary
 * regex) and the rest upright. If there's only one paragraph, it's
 * rendered upright — italic-only-block reads as block-quote, not as a
 * lede.
 *
 * Empty state: if description is null/blank → section is hidden entirely.
 */
import type { ThemePropsV2 } from '@/types/theme-v2'
import { CREAM, display } from './styles'

export function Overview({ data }: ThemePropsV2) {
  const description = data.project.description?.trim()
  if (!description) return null

  const paragraphs = description
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) return null

  const useItalicLead = paragraphs.length > 1

  return (
    <section style={{ padding: '64px 24px 56px', background: CREAM }}>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          style={{
            ...display,
            fontSize: 18,
            lineHeight: 1.5,
            margin: 0,
            marginBottom: i === paragraphs.length - 1 ? 0 : 18,
            ...(useItalicLead && i === 0 ? { fontStyle: 'italic' } : null),
          }}
        >
          {p}
        </p>
      ))}
    </section>
  )
}
