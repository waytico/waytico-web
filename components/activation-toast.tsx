'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

/**
 * Handles Stripe Checkout return redirects.
 *   ?activated=1 → success toast + strip query
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

    if (activated) {
      toast.success('Trip activated. Preparing checklists…')
    } else if (cancelled) {
      toast('Payment cancelled')
    }

    // Strip query params but keep path
    router.replace(pathname)
  }, [searchParams, pathname, router])

  return null
}
