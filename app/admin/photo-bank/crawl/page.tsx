'use client'

/**
 * /admin/photo-bank/crawl — bookmark-compat redirect.
 *
 * The crawl form moved into a collapsible accordion at the top of
 * /admin/photo-bank (single-screen workflow: crawl + review). This
 * stub keeps any existing bookmarks pointing to the old URL working
 * by redirecting on mount.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminCrawlRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/photo-bank')
  }, [router])
  return (
    <div className="py-12 text-center text-sm text-zinc-500">
      Redirecting to /admin/photo-bank…
    </div>
  )
}
