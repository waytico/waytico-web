'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Mail, Phone, Globe } from 'lucide-react'
import {
  WhatsAppIcon,
  TelegramIcon,
  InstagramIcon,
  FacebookIcon,
  YouTubeIcon,
  TikTokIcon,
} from '@/lib/contact-icons'
import {
  channelHref,
  CHANNEL_LABEL,
  getVisibleChannels,
  type ChannelKey,
} from '@/lib/contact-resolution'
import type { OperatorContact, OwnerBrand } from './trip-types'

type Props = {
  owner: OwnerBrand
  operatorContact: OperatorContact
  /** Whether the trigger is rendered against a dark photo background
   *  (Expedition theme overlay hero). When true we paint white with a
   *  shadow; otherwise muted ink color. */
  onPhoto?: boolean
  /** Trigger label override. Defaults to "Contact agent". The Magazine
   *  TopNav passes "Inquire" so the pill reads as a single-purpose CTA. */
  label?: string
}

const ICON: Record<ChannelKey, React.ComponentType<any>> = {
  email: Mail,
  phone: Phone,
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
  website: Globe,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  youtube: YouTubeIcon,
  tiktok: TikTokIcon,
}

/**
 * Contact-agent dropdown rendered in the hero top strip on public-side
 * trip pages. Mirrors the agent's "Share with client" dropdown pattern:
 * pill trigger, click-outside / Esc to close, channel rows as menu items.
 *
 * Channel list = getVisibleChannels(owner, operatorContact) — already
 * applies the same source order (override > brand) and hidden_channels
 * filter that the bottom Contacts section uses, so the two stay in
 * sync automatically.
 *
 * Component renders nothing when there are no visible channels — so on
 * trips where the operator hasn't filled their brand profile yet, the
 * dropdown disappears (instead of showing an empty menu).
 */
export function ContactAgentMenu({ owner, operatorContact, onPhoto = false, label }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const channels = getVisibleChannels(owner, operatorContact)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  if (channels.length === 0) return null

  // Trigger styling matches the validity strip's typography — small
  // monospace uppercase, muted color, lifted on dark photo backgrounds.
  // Affordance: subtle underline on hover (no border, no chrome) so it
  // reads as part of the document's metadata register, not a button.
  const triggerStyle: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-mono)',
    color: onPhoto ? 'rgba(255,255,255,0.92)' : 'var(--ink-mute)',
    textShadow: onPhoto ? '0 1px 4px rgba(0,0,0,0.4)' : undefined,
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 py-0.5 group cursor-pointer"
        style={triggerStyle}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="border-b border-current/0 group-hover:border-current/40 transition-colors">
          {label ?? 'Contact agent'}
        </span>
        <ChevronDown size={11} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-56 rounded-xl bg-background border border-border shadow-lg py-1 z-30"
        >
          {channels.map(({ key, value }) => {
            const Icon = ICON[key]
            return (
              <a
                key={key}
                role="menuitem"
                href={channelHref(key, value)}
                target={key === 'email' || key === 'phone' ? undefined : '_blank'}
                rel={key === 'email' || key === 'phone' ? undefined : 'noopener noreferrer'}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-secondary transition-colors"
              >
                <Icon size={16} className="text-foreground/60 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs uppercase tracking-wider text-foreground/50">
                    {CHANNEL_LABEL[key]}
                  </span>
                  <span className="block truncate text-foreground/90">
                    {key === 'website'
                      ? value.replace(/^https?:\/\//, '').replace(/\/$/, '')
                      : value}
                  </span>
                </span>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
