'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

type Props = {
  title: string
  url: string
  publicStatus: string
  /** When provided, overrides internal open state (controlled mode). */
  forceOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * Share menu — dropdown with 4 channels for sending the trip quote to a client.
 * Visible only while the trip is in 'quoted' or 'active' status.
 * Supports controlled `forceOpen` prop so external triggers (e.g. anon modal)
 * can open the dropdown programmatically.
 */
export default function ShareMenu({ title, url, publicStatus, forceOpen, onOpenChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const isOpen = forceOpen ?? open
  const setIsOpen = (v: boolean) => {
    setOpen(v)
    onOpenChange?.(v)
  }

  useEffect(() => {
    if (!isOpen) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [isOpen])

  if (publicStatus !== 'quoted' && publicStatus !== 'active') return null

  const message = `${title} — ${url}`
  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy')
    }
    setIsOpen(false)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-foreground/70 hover:text-foreground hover:bg-secondary transition-colors"
      >
        Share with client
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute left-1/2 -translate-x-1/2 mt-2 w-56 rounded-xl bg-background border border-border shadow-lg py-1 z-20"
        >
          <a
            role="menuitem"
            href={mailto}
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-secondary transition-colors"
          >
            Email
          </a>
          <a
            role="menuitem"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-secondary transition-colors"
          >
            WhatsApp
          </a>
          <a
            role="menuitem"
            href={telegram}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-2 text-sm hover:bg-secondary transition-colors"
          >
            Telegram
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={copy}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors"
          >
            Copy link
          </button>
        </div>
      )}
    </div>
  )
}
