'use client'

import { useRouter } from 'next/navigation'
import { Mail, Phone, MessageCircle, Send, Instagram, Facebook, Youtube, Music } from 'lucide-react'
import type { Project, ProjectStatus } from '@/components/project-card'
import type { Client } from '@/components/trip/trip-types'

const STATUS_CHIP: Record<ProjectStatus, string> = {
  draft: 'bg-muted/60 text-foreground/70',
  quoted: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-sky-100 text-sky-800',
  archived: 'bg-muted/60 text-foreground/55',
}

function fmtDateShort(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(+d)) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatRange(start: string | null | undefined, end: string | null | undefined): string {
  const a = fmtDateShort(start)
  const b = fmtDateShort(end)
  if (a && b) return `${a} → ${b}`
  return a || b || ''
}

type Props = {
  client: Client
  trips: Project[]
}

type ChannelEntry = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  href: string | null
}

/** Strip non-digits — used to build tel:/wa.me/ links from messy input. */
function digitsOnly(s: string): string {
  return s.replace(/\D+/g, '')
}

function buildChannels(client: Client): ChannelEntry[] {
  const out: ChannelEntry[] = []
  if (client.email) {
    out.push({ icon: Mail, label: 'Email', value: client.email, href: `mailto:${client.email}` })
  }
  if (client.phone) {
    const d = digitsOnly(client.phone)
    out.push({ icon: Phone, label: 'Phone', value: client.phone, href: d ? `tel:+${d}` : null })
  }
  if (client.whatsapp) {
    const d = digitsOnly(client.whatsapp)
    out.push({
      icon: MessageCircle,
      label: 'WhatsApp',
      value: client.whatsapp,
      href: d ? `https://wa.me/${d}` : null,
    })
  }
  if (client.telegram) {
    const handle = client.telegram.replace(/^@/, '')
    out.push({ icon: Send, label: 'Telegram', value: `@${handle}`, href: `https://t.me/${handle}` })
  }
  if (client.instagram) {
    const handle = client.instagram.replace(/^@/, '')
    out.push({
      icon: Instagram,
      label: 'Instagram',
      value: `@${handle}`,
      href: `https://instagram.com/${handle}`,
    })
  }
  if (client.facebook) {
    out.push({
      icon: Facebook,
      label: 'Facebook',
      value: client.facebook,
      href: client.facebook.startsWith('http')
        ? client.facebook
        : `https://facebook.com/${client.facebook.replace(/^@/, '')}`,
    })
  }
  if (client.youtube) {
    out.push({
      icon: Youtube,
      label: 'YouTube',
      value: client.youtube,
      href: client.youtube.startsWith('http') ? client.youtube : null,
    })
  }
  if (client.tiktok) {
    const handle = client.tiktok.replace(/^@/, '')
    out.push({
      icon: Music,
      label: 'TikTok',
      value: `@${handle}`,
      href: `https://tiktok.com/@${handle}`,
    })
  }
  return out
}

/**
 * Inline expansion under a ClientRow.
 *
 * Top: identity panel with all known contact channels (clickable: tel:,
 * mailto:, wa.me, t.me etc.) plus source/notes when present. Lets the
 * operator see who this person is without opening the edit modal.
 *
 * Bottom: client's trips as compact one-line chips that route to
 * /t/[slug]; or an empty-state with "+ New trip for this client" CTA
 * (routes to '/' for now — pre-fill is tracked as a future task).
 */
export default function ClientRowExpanded({ client, trips }: Props) {
  const router = useRouter()
  const channels = buildChannels(client)
  const showName = client.name && client.name !== client.nickname
  const hasIdentity = channels.length > 0 || !!showName || !!client.source || !!client.notes

  return (
    <div className="bg-secondary/40 border-t border-border/30">
      {hasIdentity && (
        <div className="px-16 py-3 space-y-2">
          {showName && (
            <div className="text-sm text-foreground/85">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
                Name
              </span>
              {client.name}
            </div>
          )}
          {channels.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {channels.map((c, i) => {
                const Icon = c.icon
                const inner = (
                  <>
                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-16 flex-shrink-0">
                      {c.label}
                    </span>
                    <span className="text-sm text-foreground/85 truncate">{c.value}</span>
                  </>
                )
                return c.href ? (
                  <a
                    key={i}
                    href={c.href}
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel={c.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={i} className="flex items-center gap-2">
                    {inner}
                  </div>
                )
              })}
            </div>
          )}
          {client.source && (
            <div className="text-sm text-foreground/85">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
                Source
              </span>
              {client.source}
            </div>
          )}
          {client.notes && (
            <div className="text-sm text-foreground/85">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
                Notes
              </span>
              <span className="whitespace-pre-wrap">{client.notes}</span>
            </div>
          )}
        </div>
      )}

      {trips.length === 0 ? (
        <div className={`px-16 py-3 ${hasIdentity ? 'border-t border-border/30' : ''}`}>
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>No trips yet</span>
            <button
              type="button"
              onClick={() => {
                const label = client.nickname || client.name || ''
                const qs = new URLSearchParams({ clientId: client.id })
                if (label) qs.set('clientName', label)
                router.push(`/?${qs.toString()}`)
              }}
              className="text-xs text-foreground/80 hover:text-foreground underline-offset-2 hover:underline"
            >
              + New trip for this client
            </button>
          </div>
        </div>
      ) : (
        <div className={`px-16 py-2 space-y-1 ${hasIdentity ? 'border-t border-border/30' : ''}`}>
          {trips.map((t) => {
            const region = [t.region, t.country].filter(Boolean).join(', ')
            const range = formatRange(t.dates_start, t.dates_end)
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => router.push(`/t/${t.slug}`)}
                className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-left hover:bg-secondary transition-colors"
              >
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full ${STATUS_CHIP[t.status as ProjectStatus] ?? 'bg-muted/60 text-foreground/55'}`}
                >
                  {t.status}
                </span>
                <span className="flex-1 min-w-0 truncate text-sm text-foreground/85">
                  {t.title}
                  {region && <span className="text-muted-foreground"> · {region}</span>}
                </span>
                {range && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{range}</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
