'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import ClientCardModal from '@/components/client/client-card-modal'
import type { Client } from '@/components/trip/trip-types'

type Props = {
  open: boolean
  client: Client | null
  /** How many trips reference this client. Drives the delete-confirm
   *  message — operators get a louder warning when removing a client
   *  with linked trips (FK is ON DELETE SET NULL on backend, so trips
   *  survive but lose attribution). */
  tripCount?: number
  onClose: () => void
  onSaved: (client: Client) => void
  onDeleted?: (clientId: string) => void
}

/**
 * EditClientModal — Stage 3 wrapper around <ClientCardModal mode="edit"
 * host="dashboard">. The unified ClientCard renders all fields,
 * lifecycle toggles, and Save logic. This file owns only the
 * delete-with-confirm flow (tripCount-aware copy stays here so
 * dashboard-side ergonomics don't leak into the shared card).
 */
export default function EditClientModal({
  open,
  client,
  tripCount = 0,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const { getToken } = useAuth()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!client) return
    const headline = client.nickname || client.name || client.email || 'this client'
    const message =
      tripCount > 0
        ? `${headline} has ${tripCount} trip${tripCount === 1 ? '' : 's'} on file. Trips will keep their data but become unowned. Delete client?`
        : `Delete ${headline}? This cannot be undone.`
    if (!window.confirm(message)) return
    setBusy(true)
    try {
      const token = await getToken()
      const res = await apiFetch(`/api/clients/${client.id}`, { token, method: 'DELETE' })
      if (!res.ok) {
        toast.error('Could not delete')
        return
      }
      toast.success('Client deleted')
      onDeleted?.(client.id)
      onClose()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  if (!client) return null

  return (
    <ClientCardModal
      open={open && !busy}
      mode="edit"
      host="dashboard"
      client={client}
      onSaved={(saved) => onSaved(saved)}
      onRequestDelete={handleDelete}
      onClose={onClose}
    />
  )
}
