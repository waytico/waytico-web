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
  draft: { label: 'Draft', chipClass: 'bg-secondary text-foreground/60' },
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
}

/**
 * Returns the list of menu items for a given status.
 * MUST stay in sync across trip page and dashboard.
 */
export function buildTripMenu(status: string, cb: MenuCallbacks): MenuItem[] {
  const items: MenuItem[] = []

  if (status === 'draft') {
    items.push({ label: 'Publish', onClick: () => cb.changeStatus('quoted') })
    items.push({ label: 'Archive…', onClick: cb.requestArchive })
    items.push({ label: 'Delete', onClick: cb.requestDelete, variant: 'danger' })
  } else if (status === 'quoted') {
    if (cb.onActivate) {
      items.push({ label: 'Activate', onClick: cb.onActivate })
    }
    items.push({ label: 'Archive…', onClick: cb.requestArchive })
    items.push({ label: 'Delete', onClick: cb.requestDelete, variant: 'danger' })
  } else if (status === 'active') {
    items.push({ label: 'Completed', onClick: () => cb.changeStatus('completed') })
    items.push({ label: 'Archive…', onClick: cb.requestArchive })
    items.push({ label: 'Delete', onClick: cb.requestDelete, variant: 'danger' })
  } else if (status === 'completed') {
    items.push({ label: 'Reactivate', onClick: () => cb.changeStatus('active') })
    items.push({ label: 'Archive…', onClick: cb.requestArchive })
    items.push({ label: 'Delete', onClick: cb.requestDelete, variant: 'danger' })
  } else if (status === 'archived') {
    items.push({ label: 'Restore', onClick: cb.restore })
    items.push({ label: 'Delete', onClick: cb.requestDelete, variant: 'danger' })
  }

  return items
}
