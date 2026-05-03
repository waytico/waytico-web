'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'

type Props = {
  projectId: string
  publicStatus: string
  /** 'default' — large hero-style button. 'compact' — slim pill, fits inside action bar */
  variant?: 'default' | 'compact'
}

/**
 * Activate button — visible ONLY if:
 *   - user is signed in (Clerk)
 *   - user is owner (authed GET /api/projects/:id returns 200)
 *   - public status === 'quoted'
 *
 * Click → POST /api/stripe/create-checkout → redirect to Stripe-hosted page.
 */
export default function ActivateButton({ projectId, publicStatus, variant = 'default' }: Props) {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setIsOwner(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) return
        const res = await apiFetch(`/api/projects/by-id/${projectId}`, { token })
        if (!cancelled && res.ok) setIsOwner(true)
      } catch {
        /* ignore — not owner */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, getToken, projectId])

  if (!isSignedIn || !isOwner || publicStatus !== 'quoted') return null

  const handleClick = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again')
        setLoading(false)
        return
      }
      const res = await apiFetch('/api/stripe/create-checkout', {
        method: 'POST',
        token,
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) {
        toast.error(data?.error || 'Could not start checkout')
        setLoading(false)
        return
      }
      window.location.href = data.url as string
    } catch {
      toast.error('Network error')
      setLoading(false)
    }
  }

  const sizeClass =
    variant === 'compact'
      ? 'px-3.5 py-1.5 text-sm'
      : 'px-6 py-3'

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground font-semibold rounded-full shadow-sm hover:bg-accent/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${sizeClass}`}
    >
      {loading ? (
        <>
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {variant === 'compact' ? 'Processing…' : 'Starting checkout…'}
        </>
      ) : (
        <>{variant === 'compact' ? 'Make it a trip' : 'Make it a trip'}</>
      )}
    </button>
  )
}
