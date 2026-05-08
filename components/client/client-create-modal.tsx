'use client'

import NewClientModal from '@/components/dashboard/new-client-modal'
import type { Client } from '@/components/trip/trip-types'

type Props = {
  open: boolean
  /** Pre-populate from a smart-detected draft. The modal opens with
   *  these values pre-filled. */
  preDraft?: Partial<Client>
  onClose: () => void
  onSaved: (client: Client, deduped: boolean) => void
}

/**
 * ClientCreateModal — thin wrapper around NewClientModal exposing the
 * `preDraft` prop. The wrapper exists so that picker / trip-page
 * call-sites depend on the stable `client/` namespace; Stage 2 swaps
 * the implementation to the unified <ClientCard mode="create"> without
 * touching call-sites.
 */
export default function ClientCreateModal({ open, preDraft, onClose, onSaved }: Props) {
  return (
    <NewClientModal
      open={open}
      preDraft={preDraft}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}
