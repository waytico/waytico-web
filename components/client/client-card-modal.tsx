'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import ClientCard from './client-card'
import type {
  ClientCardHost,
  ClientCardMode,
  ClientCardTripFields,
} from './client-card'
import type { Client } from '@/components/trip/trip-types'

type Props = {
  open: boolean
  mode: Exclude<ClientCardMode, 'view'>
  host: ClientCardHost
  client: Client | null
  initialDraft?: Partial<Client>
  showTripFields?: boolean
  tripFields?: ClientCardTripFields
  onSaved: (client: Client, deduped: boolean) => void | Promise<void>
  onTripFieldsSave?: (patch: {
    bookingRef?: string | null
    specialRequests?: string | null
    internalNotes?: string | null
  }) => Promise<boolean>
  onRequestDelete?: () => void
  onClose: () => void
}

/**
 * ClientCardModal — Dialog wrapper around <ClientCard> that mounts via
 * portal in document.body so it escapes any host stacking context
 * (sticky banners, transformed trip-page sections, etc.).
 *
 * Esc closes; backdrop click closes; click on the inner card swallows
 * the event.
 */
export default function ClientCardModal(props: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!props.open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [props.open, props.onClose])

  if (!mounted || !props.open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-black/40"
      onClick={props.onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.mode === 'create' ? 'New client' : 'Edit client'}
        className="relative w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ClientCard
          mode={props.mode}
          host={props.host}
          client={props.client}
          initialDraft={props.initialDraft}
          showTripFields={props.showTripFields}
          tripFields={props.tripFields}
          onSaved={props.onSaved}
          onTripFieldsSave={props.onTripFieldsSave}
          onRequestDelete={props.onRequestDelete}
          onClose={props.onClose}
        />
      </div>
    </div>,
    document.body,
  )
}
