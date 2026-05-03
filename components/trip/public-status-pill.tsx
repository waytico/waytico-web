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

/**
 * Public-side labels — distinct from UI.status which is the owner-side
 * string ("Quoted" reads as a state in the action bar). On the traveler-
 * facing hero strip the pill names the document, not the state, so
 * "Quote · R10FNU" reads as "this is a Quote, code R10FNU" rather than
 * "the Quoted-status thing, code R10FNU". Same shift would apply to a
 * future "Booking" or "Trip" surface; keeping the map separate makes
 * that future change a one-line edit here.
 */
const PUBLIC_STATUS_LABELS: Record<Status, string> = {
  quoted: 'Quote',
  active: 'Active',
  completed: 'Completed',
}

export function PublicStatusPill({
  status,
  onPhoto = false,
  code,
}: {
  status: string | null | undefined
  onPhoto?: boolean
  /**
   * Optional 6-char quote code (uppercase) — appended after the status
   * label as `· CODE` so traveler-facing surface shows both the lifecycle
   * stage and a stable shortcode. Hidden when null/undefined.
   */
  code?: string | null
}) {
  if (!status) return null
  if (!PUBLIC_STATUSES.includes(status as Status)) return null
  const s = status as Status
  const label = PUBLIC_STATUS_LABELS[s]

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
      aria-label={`Trip status: ${UI.status[s] || s}${code ? `, code ${code}` : ''}`}
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
      <span>{label}</span>
      {code && (
        <>
          <span aria-hidden="true" style={{ opacity: 0.5 }}>·</span>
          <span>{code}</span>
        </>
      )}
    </span>
  )
}
