'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail, Phone, Send } from 'lucide-react'
import { toast } from 'sonner'
import { WhatsAppIcon, TelegramIcon } from '@/lib/contact-icons'
import {
  channelHref,
  CHANNEL_LABEL,
  getVisibleChannels,
  type ChannelKey,
} from '@/lib/contact-resolution'
import type {
  OperatorContact,
  OwnerBrand,
} from './trip-types'

/**
 * Magazine mobile StickyBar — fixed bottom row with one tap target per
 * action: a Share button (first, leftmost) plus the operator's
 * highest-priority contact channels.
 *
 * The previous design surfaced a FROM-price + INQUIRE pill. That was
 * removed by product decision — the price already lives in the Price
 * section the viewer is scrolling through, and INQUIRE wrapped the
 * same channel-dropdown the icons here surface directly. One tap
 * rather than two.
 *
 * Channel allowlist (intentionally narrow):
 *   share → email → phone → whatsapp → telegram
 *
 * The operator's other channels (website / instagram / facebook /
 * youtube / tiktok) are reachable through the Contacts section at the
 * bottom of the page and the desktop TopNav. Showing them here would
 * either force touch targets below the iOS HIG 44px floor or wrap to
 * a second row on narrow viewports — neither is acceptable for a
 * fixed sticky element. Holding the count to ≤5 keeps every tap
 * target a comfortable size on a 320px viewport.
 *
 * Render contract:
 *   - Mobile only (display:none on ≥1024px) — desktop uses the TopNav.
 *   - Renders nothing when there are zero icons to show (no operator
 *     channels in the allowlist AND share is hidden by status).
 *   - Suppressed entirely on owner pages where TripCommandBar already
 *     occupies the same sticky-bottom region (collision avoidance —
 *     trip-page-client gates this via the `visible` prop).
 *   - Slides off-screen when #site-footer enters the viewport so the
 *     cream slab doesn't sit on top of the dark footer. Same
 *     IntersectionObserver pattern TripCommandBar uses.
 *
 * Share is the only icon that opens an in-page menu (Email / WhatsApp /
 * Telegram / Copy link). The contact icons are direct links —
 * `mailto:` / `tel:` / `wa.me/` / `t.me/` resolved by channelHref().
 */
type Props = {
  owner: OwnerBrand
  operatorContact: OperatorContact
  /** Trip title for share message. */
  title: string
  /** Public trip URL for share. */
  url: string
  /** Trip status — gates the Share button (only quoted/active have a
   *  share-able link the way the rest of the app expects). Everything
   *  else (drafts, archived, completed) hides Share but still shows
   *  contact icons so the viewer can reach the operator. */
  status: string
  /** Outer gate — false suppresses the bar entirely (e.g. on owner
   *  pages where TripCommandBar takes the sticky-bottom slot). */
  visible: boolean
}

/** Channels surfaced in the sticky bar, in render order. Order is
 *  intentional: communication-first (email, phone, WA, TG) by user
 *  preference frequency, not alphabetical. */
const STICKY_CHANNELS: ChannelKey[] = ['email', 'phone', 'whatsapp', 'telegram']

const ICON: Partial<Record<ChannelKey, React.ComponentType<any>>> = {
  email: Mail,
  phone: Phone,
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
}

export function MagazineStickyBar({
  owner,
  operatorContact,
  title,
  url,
  status,
  visible,
}: Props) {
  // Footer-visibility observer — see header comment.
  const [footerVisible, setFooterVisible] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const target = document.getElementById('site-footer')
    if (!target) return
    const io = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: '0px 0px 0px 0px', threshold: 0 },
    )
    io.observe(target)
    return () => io.disconnect()
  }, [])

  // Share menu state. Anchored to the share button via a ref so
  // click-outside dismissal works the same way ContactAgentMenu and
  // ShareMenu handle it elsewhere in the app.
  const [shareOpen, setShareOpen] = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!shareOpen) return
    const onClick = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false)
      }
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShareOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [shareOpen])

  if (!visible) return null

  // Filter the operator's visible channels down to the sticky-bar
  // allowlist while preserving the canonical priority order from
  // STICKY_CHANNELS (not the order the operator filled them in
  // Profile). One channel per icon — no duplicates possible since
  // CHANNEL_KEYS itself is a unique enum.
  const allChannels = getVisibleChannels(owner, operatorContact)
  const byKey = new Map(allChannels.map((c) => [c.key, c.value]))
  const stickyChannels = STICKY_CHANNELS.filter((k) => byKey.has(k)).map(
    (k) => ({ key: k, value: byKey.get(k)! }),
  )

  const shareEnabled = status === 'quoted' || status === 'active'

  // Nothing to show — render nothing rather than an empty bar.
  if (!shareEnabled && stickyChannels.length === 0) return null

  // Share menu URLs.
  const shareMessage = `${title} — ${url}`
  const mailto = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    } catch {
      toast.error('Could not copy')
    }
    setShareOpen(false)
  }

  return (
    // Wrap in data-theme so the [data-theme="magazine"] .tp-mag-stickybar*
    // selectors match. The component is rendered OUTSIDE the page-level
    // <ThemeRoot> in trip-page-client (sits after </ThemeRoot>) — same
    // wrapper convention used by FooterMagazine.
    <div data-theme="magazine">
      <div
        className={
          'tp-mag-stickybar' +
          (footerVisible ? ' tp-mag-stickybar--hidden' : '')
        }
        role="region"
        aria-label="Share and contact"
        aria-hidden={footerVisible || undefined}
      >
        <div className="tp-mag-stickybar__inner">
          {shareEnabled && (
            <div className="tp-mag-stickybar__item" ref={shareRef}>
              <button
                type="button"
                onClick={() => setShareOpen((v) => !v)}
                className="tp-mag-stickybar__btn"
                aria-label="Share trip"
                aria-haspopup="menu"
                aria-expanded={shareOpen}
              >
                <Send size={20} aria-hidden="true" />
              </button>
              {shareOpen && (
                <div
                  role="menu"
                  className="tp-mag-stickybar__menu"
                >
                  <a
                    role="menuitem"
                    href={mailto}
                    onClick={() => setShareOpen(false)}
                    className="tp-mag-stickybar__menuitem"
                  >
                    Email
                  </a>
                  <a
                    role="menuitem"
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShareOpen(false)}
                    className="tp-mag-stickybar__menuitem"
                  >
                    WhatsApp
                  </a>
                  <a
                    role="menuitem"
                    href={tgUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShareOpen(false)}
                    className="tp-mag-stickybar__menuitem"
                  >
                    Telegram
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={copyLink}
                    className="tp-mag-stickybar__menuitem tp-mag-stickybar__menuitem--button"
                  >
                    Copy link
                  </button>
                </div>
              )}
            </div>
          )}

          {stickyChannels.map(({ key, value }) => {
            const Icon = ICON[key]
            if (!Icon) return null
            return (
              <a
                key={key}
                href={channelHref(key, value)}
                target={key === 'email' || key === 'phone' ? undefined : '_blank'}
                rel={
                  key === 'email' || key === 'phone'
                    ? undefined
                    : 'noopener noreferrer'
                }
                className="tp-mag-stickybar__btn tp-mag-stickybar__btn--link"
                aria-label={CHANNEL_LABEL[key]}
              >
                <Icon size={20} aria-hidden="true" />
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
