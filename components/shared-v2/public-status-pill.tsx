/**
 * Public-side status indicator.
 *
 * Editorial-style: a small dot + uppercase mono-caps label, no
 * background fill, no shadcn pill chrome. Matches the typographic
 * register of the validity dates and the contact-agent trigger that
 * sit on the same hero top strip — so the strip reads as a single
 * coherent metadata line on the document, not a chrome bar.
 *
 * Color comes from theme tokens so all three themes get a tasteful
 * accent without hard-coded values.
 *
 * `onPhoto` flips to a high-contrast light variant for the Cinematic
 * overlay theme, where the strip lays over a full-bleed hero photo.
 */
import { UI } from '@/lib/ui-strings'

type Status = 'quoted' | 'active' | 'completed'

const PUBLIC_STATUSES: Status[] = ['quoted', 'active', 'completed']

export function PublicStatusPill({
  status,
  onPhoto = false,
}: {
  status: string | null | undefined
  onPhoto?: boolean
}) {
  if (!status) return null
  if (!PUBLIC_STATUSES.includes(status as Status)) return null
  const s = status as Status

  const color = onPhoto
    ? 'rgba(255,255,255,0.92)'
    : s === 'completed'
      ? 'var(--ink-mute)'
      : 'var(--accent)'
  const dotColor = onPhoto
    ? 'var(--accent)'
    : s === 'completed'
      ? 'var(--ink-mute)'
      : 'var(--accent)'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-mono)',
        color,
        textShadow: onPhoto ? '0 1px 4px rgba(0,0,0,0.4)' : undefined,
      }}
      aria-label={`Trip status: ${UI.status[s] || s}`}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: dotColor,
          flexShrink: 0,
        }}
      />
      <span>{UI.status[s] || s}</span>
    </span>
  )
}

