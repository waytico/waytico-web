'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { apiFetch } from '@/lib/api'
import type { Client } from '@/components/trip/trip-types'

type State = {
  clients: Client[] | null
  refresh: () => Promise<void>
}

/**
 * useClients — single-source-of-truth fetch for the operator's CRM
 * roster. One GET /api/clients?limit=500 on mount; refresh() re-runs
 * the fetch (called after upsert/patch from modals so the row list
 * picks up changes without a page reload).
 *
 * Hosted in dashboard/page.tsx so ClientsTab and WorkspaceTabs share
 * the same list without duplicating the request.
 */
export function useClients(): State {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [clients, setClients] = useState<Client[] | null>(null)

  const refresh = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return
    try {
      const token = await getToken()
      const res = await apiFetch('/api/clients?limit=500', { token, cache: 'no-store' })
      if (!res.ok) {
        setClients([])
        return
      }
      const data = await res.json()
      setClients(data.clients ?? [])
    } catch {
      setClients([])
    }
  }, [isLoaded, isSignedIn, getToken])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let active = true
    ;(async () => {
      const token = await getToken()
      const res = await apiFetch('/api/clients?limit=500', { token, cache: 'no-store' }).catch(() => null)
      if (!active) return
      if (!res || !res.ok) {
        setClients([])
        return
      }
      const data = await res.json()
      if (active) setClients(data.clients ?? [])
    })()
    return () => {
      active = false
    }
  }, [isLoaded, isSignedIn, getToken])

  return { clients, refresh }
}
