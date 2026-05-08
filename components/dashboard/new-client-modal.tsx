'use client'

import ClientCardModal from '@/components/client/client-card-modal'
import type { Client } from '@/components/trip/trip-types'

type Props = {
  open: boolean
  onClose: () => void
  /** Pre-populate fields from a smart-detected draft. The modal opens
   *  with these values pre-filled (used by SmartClientPicker
   *  auto-create flow). */
  preDraft?: Partial<Client>
  /** Called with the resulting client (newly created OR existing-deduped). */
  onSaved: (client: Client, deduped: boolean) => void
}

/**
 * NewClientModal — Stage 3 wrapper around <ClientCardModal mode="create"
 * host="dashboard">. ClientCard owns the form, validation, and POST
 * /api/clients/upsert call; this file is now only the dashboard-side
 * mounting point so dashboard call-sites (clients-tab.tsx) keep their
 * familiar import path.
 */
export default function NewClientModal({ open, onClose, preDraft, onSaved }: Props) {
  return (
    <ClientCardModal
      open={open}
      mode="create"
      host="dashboard"
      client={null}
      initialDraft={preDraft}
      onSaved={(saved, deduped) => onSaved(saved, deduped)}
      onClose={onClose}
    />
  )
}
