/**
 * Public-side status indicator. Visually matches the agent's action-bar
 * status chip (same colors, same dot for Active) but without the
 * dropdown affordance — public viewers can't change status.
 *
 * Lives outside ThemeRoot, so it uses shadcn semantic tokens via
 * getStatusMeta().chipClass — same as the agent chip.
 */
import { getStatusMeta } from '@/lib/trip-status'

export function PublicStatusPill({ status }: { status: string | null | undefined }) {
  if (!status) return null
  if (!['quoted', 'active', 'completed'].includes(status)) return null
  const meta = getStatusMeta(status)
  return (
    <span
      className={
        'inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-sans font-semibold uppercase tracking-wider rounded-full ' +
        meta.chipClass
      }
    >
      {meta.hasDot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      <span>{meta.label}</span>
    </span>
  )
}
