'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { OnboardingTip } from '@/components/onboarding-tip'

type Props = {
  title: string
  url: string
  publicStatus: string
  /** When provided, overrides internal open state (controlled mode). */
  forceOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Custom label for the trigger button. Defaults to "Send". */
  label?: string
  /** When true, the trigger button is hidden — only the dropdown renders (controlled mode). */
  hideTrigger?: boolean
  /** Fired AFTER the share channel kicks off. Drives the
   *  share-prompt-banner ("Attach a client?") and any analytics. */
  onShareAction?: () => void
  /**
   * Fire-and-forget hook called when the operator picks a channel.
   * The trip-action-bar uses this to publish the working copy at the
   * moment a real share happens; running it BEFORE the native action
   * (without await) keeps the user-gesture chain intact so popup
   * blockers don't kill the new tab on WhatsApp / Telegram. If the
   * publish fails it surfaces its own toast; the share itself goes
   * through regardless.
   */
  onShareCommit?: () => void
  /**
   * Link-preview framing for OG metadata. `new` (default) → the
   * preview reads "You got a trip from {agent}". `update` → "{agent}
   * updated the trip" and forces a WhatsApp cache miss via a
   * timestamp param. The base `url` stays canonical for analytics;
   * only the shared variant carries the query string.
   */
  mode?: 'new' | 'update'
}

export default function ShareMenu({ title, url, publicStatus, forceOpen, onOpenChange, label = 'Send', hideTrigger, onShareAction, onShareCommit, mode = 'new' }: Props) {
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

  // Hide the menu in states with no public link to share (archived /
  // generating / completed). `draft` is permitted — the channel pick
  // is what triggers the publish via onShareCommit.
  if (
    publicStatus === 'archived' ||
    publicStatus === 'generating' ||
    publicStatus === 'completed'
  ) {
    return null
  }

  /**
   * Mode-tagged share URL. WhatsApp / Telegram / iMessage fetch the
   * server-rendered <meta> tags for the exact URL the operator sent —
   * the same canonical `/t/{slug}` rendered with `?s=update&v={ts}`
   * yields a different og:title via generateMetadata, which is how
   * the "{agent} updated the trip" framing is delivered.
   *
   * `v` is computed at render time. Multiple channel clicks in a
   * single open-of-menu share the same render frame (until a state
   * change re-renders), so all recipients of one Save&notify burst
   * see consistent metadata. A new menu-open after a publish cycle
   * remounts the surrounding controller and yields a fresh `v`.
   */
  const buildShareUrl = (): string => {
    try {
      const u = new URL(url)
      u.searchParams.set('s', mode)
      if (mode === 'update') {
        u.searchParams.set('v', String(Date.now()))
      }
      return u.toString()
    } catch {
      // url is relative or malformed — fall back to a manual append
      // that won't crash but may produce a duplicate ?s= if the caller
      // passes a pre-decorated URL. Caller is expected to pass a clean
      // absolute URL via shareUrl in trip-page-client, so this branch
      // is purely defensive.
      const sep = url.includes('?') ? '&' : '?'
      const suffix = mode === 'update' ? `s=update&v=${Date.now()}` : 's=new'
      return `${url}${sep}${suffix}`
    }
  }
  const shareUrl = buildShareUrl()

  const message = `${title} — ${shareUrl}`
  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareUrl)}`
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`

  /** Common click handler for share channels — kicks off the publish
   *  (if anything to publish), closes the menu, and lets the native
   *  <a> click open the channel in its own tab. No preventDefault. */
  const commitAndClose = () => {
    onShareCommit?.()
    setIsOpen(false)
    onShareAction?.()
  }

  const copy = async () => {
    onShareCommit?.()
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy')
    }
    setIsOpen(false)
    onShareAction?.()
  }

  return (
    <div ref={ref} className="relative inline-block">
      {!hideTrigger && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={label}
          className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1 rounded-full text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors whitespace-nowrap"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          <span>{label}</span>
        </button>
      )}

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl bg-background border border-border shadow-lg z-20 overflow-hidden"
        >
          <OnboardingTip>
            Send the trip page link to your client.
          </OnboardingTip>
          <div className="py-1">
          <a
            role="menuitem"
            href={mailto}
            onClick={commitAndClose}
            className="block px-4 py-2 text-sm hover:bg-secondary transition-colors"
          >
            Email
          </a>
          <a
            role="menuitem"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={commitAndClose}
            className="block px-4 py-2 text-sm hover:bg-secondary transition-colors"
          >
            WhatsApp
          </a>
          <a
            role="menuitem"
            href={telegram}
            target="_blank"
            rel="noopener noreferrer"
            onClick={commitAndClose}
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
        </div>
      )}
    </div>
  )
}
