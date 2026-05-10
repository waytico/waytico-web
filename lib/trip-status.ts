/**
 * Single source of truth for trip project statuses.
 *
 * Every UI surface that shows a status (hero chip, action bar pill,
 * dashboard card badge) and every surface that builds a status-dependent
 * action menu must import from here. Do NOT hard-code status labels,
 * colours, or menu items anywhere else.
 */

export type TripStatus =
  | 'draft'
  | 'generating'
  | 'quoted'
  | 'active'
  | 'completed'
  | 'archived'

export type StatusMeta = {
  label: string
  /** Tailwind class string for the chip body */
  chipClass: string
  /** Show a small dot before the label (used for Active) */
  hasDot?: boolean
}

export const STATUS_META: Record<TripStatus, StatusMeta> = {
  // Distinct accent per active state so the dashboard at a glance
  // tells the operator which trips are still working copies (draft —
  // amber, "needs your attention"), which are quotes out with the
  // client (quoted — accent terracotta), and which are running trips
  // (active — success green, with a status dot). Completed and
  // archived stay neutral grey because they're informational and the
  // operator's eye should slide past them in normal use.
  draft: { label: 'Draft', chipClass: 'bg-amber-100 text-amber-800' },
  generating: { label: 'Generating', chipClass: 'bg-secondary text-foreground/60' },
  quoted: { label: 'Quote', chipClass: 'bg-accent/10 text-accent' },
  active: { label: 'Active', chipClass: 'bg-success/15 text-success', hasDot: true },
  completed: { label: 'Completed', chipClass: 'bg-secondary text-foreground/60' },
  archived: { label: 'Archived', chipClass: 'bg-secondary text-foreground/60' },
}

/**
 * Fallback lookup that tolerates unknown strings without crashing the UI.
 * Useful because status is typed as `string` in some payloads.
 */
export function getStatusMeta(status: string): StatusMeta {
  return (
    STATUS_META[status as TripStatus] || {
      label: status,
      chipClass: 'bg-secondary text-foreground/60',
    }
  )
}

/* ── Action menu builder ────────────────────────────────────────── */

export type MenuItem = {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
}

export type MenuCallbacks = {
  /** Completed / Reactivate / Publish — uses PATCH /status */
  changeStatus: (next: TripStatus) => void
  /** Opens the archive-with-contact dialog */
  requestArchive: () => void
  /** Confirms and deletes the project */
  requestDelete: () => void
  /** Uses POST /:id/restore (returns to previous_status) */
  restore: () => void
  /** Optional — when provided, "Activate" appears as the first item for
   *  quoted trips. Currently used by the trip-action-bar to surface the
   *  ActivateStubModal placeholder. Dashboard project-card omits this so
   *  the menu there stays the way it always was. */
  onActivate?: () => void
  /** Optional — when provided, "View brief" appears as a menu item across
   *  all statuses. Currently used by the dashboard trip-row so the operator
   *  can re-read the original briefing-agent transcript and spot mismatches
   *  with the generated trip ("I said 3 days, plan has 5"). The trip page
   *  itself omits this — viewing the brief there would only clutter the
   *  edit surface without adding edit capability. */
  viewBrief?: () => void
}

/**
 * Returns the list of menu items for a given status.
 * MUST stay in sync across trip page and dashboard.
 */
export function buildTripMenu(status: string, cb: MenuCallbacks): MenuItem[] {
  const items: MenuItem[] = []
  // "View brief" sits between the primary action and Archive/Delete in
  // every status block. Skipped when no callback was supplied (so the
  // trip-action-bar's menu stays untouched). Helper closure keeps the
  // status branches readable.
  const pushBrief = () => {
    if (cb.viewBrief) {
      items.push({ label: 'View brief', onClick: cb.viewBrief })
    }
  }

  if (status === 'draft') {
    // No "Publish" item here — the Send button on the trip page is the
    // single source of truth for publishing. A menu shortcut would let
    // the operator promote the trip without taking a snapshot, which
    // would defeat the working-copy / published-snapshot split.
    pushBrief()
    items.push({ label: 'Archive…', onClick: cb.requestArchive })
    items.push({ label: 'Delete', onClick: cb.requestDelete, variant: 'danger' })
  } else if (status === 'quoted') {
    if (cb.onActivate) {
      items.push({ label: 'Make it a trip', onClick: cb.onActivate })
    }
    pushBrief()
    items.push({ label: 'Archive…', onClick: cb.requestArchive })
    items.push({ label: 'Delete', onClick: cb.requestDelete, variant: 'danger' })
  } else if (status === 'active') {
    items.push({ label: 'Completed', onClick: () => cb.changeStatus('completed') })
    pushBrief()
    items.push({ label: 'Archive…', onClick: cb.requestArchive })
    items.push({ label: 'Delete', onClick: cb.requestDelete, variant: 'danger' })
  } else if (status === 'completed') {
    items.push({ label: 'Reactivate', onClick: () => cb.changeStatus('active') })
    pushBrief()
    items.push({ label: 'Archive…', onClick: cb.requestArchive })
    items.push({ label: 'Delete', onClick: cb.requestDelete, variant: 'danger' })
  } else if (status === 'archived') {
    items.push({ label: 'Restore', onClick: cb.restore })
    pushBrief()
    items.push({ label: 'Delete', onClick: cb.requestDelete, variant: 'danger' })
  } else if (status === 'generating') {
    // Generating rows are normally short-lived (~30–60s). When one
    // sticks around, it's because the pipeline failed before the
    // catch-handler could soft-delete the row, or before the
    // hourly sweeper picked it up. Operator gets View brief (so
    // they can see what they typed) and Delete (so they can clear
    // it themselves without waiting). No Archive — there's nothing
    // to archive.
    pushBrief()
    items.push({ label: 'Delete', onClick: cb.requestDelete, variant: 'danger' })
  }

  return items
}
