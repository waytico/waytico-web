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
  /** Fired AFTER a share channel finishes its native open. Drives the
   *  share-prompt-banner ("Attach a client?") and any analytics. */
  onShareAction?: () => void
  /**
   * Async hook called BEFORE the channel's native action runs. The
   * trip-action-bar uses this to publish the working copy only when
   * the operator actually picks a channel — opening the menu without
   * picking anything must not flip the trip into `quoted`. Returning
   * false aborts the share (publish failed). Sync return is fine too.
   */
  beforeShare?: () => Promise<boolean> | boolean
}

export default function ShareMenu({ title, url, publicStatus, forceOpen, onOpenChange, label = 'Send', hideTrigger, onShareAction, beforeShare }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
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
  // generating / completed). `draft` is permitted — picking a channel
  // is what triggers the actual publish.
  if (
    publicStatus === 'archived' ||
    publicStatus === 'generating' ||
    publicStatus === 'completed'
  ) {
    return null
  }

  const message = `${title} — ${url}`
  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(message)}`
  const telegram = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`

  /**
   * For external URLs we pre-open a blank window inside the user-
   * gesture tick so popup blockers don't kill it during the await;
   * the URL is set after publish resolves. Mailto goes through
   * location.href since protocol handlers escape blockers.
   */
  const runShare = async (
    e: React.MouseEvent,
    href: string,
    target: 'self' | 'blank',
  ) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    let popup: Window | null = null
    try {
      if (target === 'blank') {
        popup = window.open('', '_blank', 'noopener,noreferrer')
      }
      const ok = beforeShare ? await beforeShare() : true
      if (!ok) {
        if (popup) popup.close()
        return
      }
      if (target === 'blank') {
        if (popup) {
          popup.location.href = href
        } else {
          // Blocker swallowed the placeholder — fall back to in-tab
          // navigation rather than a silent dead-end.
          window.location.href = href
        }
      } else {
        window.location.href = href
      }
      setIsOpen(false)
      onShareAction?.()
    } catch {
      if (popup) popup.close()
      toast.error('Could not share')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (busy) return
    setBusy(true)
    try {
      const ok = beforeShare ? await beforeShare() : true
      if (!ok) return
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
      setIsOpen(false)
      onShareAction?.()
    } catch {
      toast.error('Could not copy')
    } finally {
      setBusy(false)
    }
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
            onClick={(e) => runShare(e, mailto, 'self')}
            className={`block px-4 py-2 text-sm hover:bg-secondary transition-colors ${busy ? 'opacity-60 pointer-events-none' : ''}`}
          >
            Email
          </a>
          <a
            role="menuitem"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => runShare(e, whatsapp, 'blank')}
            className={`block px-4 py-2 text-sm hover:bg-secondary transition-colors ${busy ? 'opacity-60 pointer-events-none' : ''}`}
          >
            WhatsApp
          </a>
          <a
            role="menuitem"
            href={telegram}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => runShare(e, telegram, 'blank')}
            className={`block px-4 py-2 text-sm hover:bg-secondary transition-colors ${busy ? 'opacity-60 pointer-events-none' : ''}`}
          >
            Telegram
          </a>
          <button
            type="button"
            role="menuitem"
            onClick={copy}
            disabled={busy}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors disabled:opacity-60"
          >
            Copy link
          </button>
          </div>
        </div>
      )}
    </div>
  )
}
