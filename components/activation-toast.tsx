'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Handles Stripe Checkout return redirects.
 *   ?activated=1 → success toast + strip query + poll refresh (prep pipeline ~15s)
 *   ?cancelled=1 → info toast   + strip query
 */
export default function ActivationToast() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    const activated = searchParams.get('activated')
    const cancelled = searchParams.get('cancelled')
    if (!activated && !cancelled) return

    fired.current = true

    // Strip query params immediately
    router.replace(pathname)

    if (activated) {
      toast.success('Trip activated. Preparing checklists…')
      // Poll refresh: prep pipeline takes ~15s, refresh every 3s for up to 30s
      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        router.refresh()
        if (attempts >= 10) clearInterval(interval)
      }, 3000)
      return () => clearInterval(interval)
    } else if (cancelled) {
      toast('Payment cancelled')
    }
  }, [searchParams, pathname, router])

  return null
}
