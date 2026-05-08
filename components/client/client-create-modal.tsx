'use client'

import ClientCardModal from './client-card-modal'
import type { Client } from '@/components/trip/trip-types'

type Props = {
  open: boolean
  /** Pre-populate from a smart-detected draft. */
  preDraft?: Partial<Client>
  onClose: () => void
  onSaved: (client: Client, deduped: boolean) => void
}

/**
 * ClientCreateModal — trip-page-side create entrypoint. Stage 3 makes
 * this a tiny wrapper around <ClientCardModal mode="create" host="trip">.
 * Used by trip-page client-info accent-prompt flow, the
 * SwitchClientDialog, and the share-prompt-banner create-flow in
 * trip-page-client.tsx.
 */
export default function ClientCreateModal({ open, preDraft, onClose, onSaved }: Props) {
  return (
    <ClientCardModal
      open={open}
      mode="create"
      host="trip"
      client={null}
      initialDraft={preDraft}
      onSaved={(saved, deduped) => onSaved(saved, deduped)}
      onClose={onClose}
    />
  )
}
