'use client'

import {
  Ban,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  MessageCircle,
  Send,
  Instagram,
  Facebook,
  Youtube,
  Music,
} from 'lucide-react'
import ActionMenu from '@/components/action-menu'
import ClientRowExpanded from './client-row-expanded'
import type { Client } from '@/components/trip/trip-types'
import type { Project } from '@/components/project-card'
import {
  clientAvatarClass,
  clientInitials,
  clientLastActivity,
  clientTripCounts,
} from '@/lib/clients-derive'

type Props = {
  client: Client
  trips: Project[]
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  onArchiveToggle: () => void
  onBlacklistToggle: () => void
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function fmtActivity(d: Date | null): string {
  if (!d || Number.isNaN(+d)) return ''
  const diffMs = Date.now() - +d
  const day = 24 * 3600 * 1000
  if (diffMs < day) return 'Today'
  if (diffMs < 2 * day) return 'Yesterday'
  if (diffMs < 7 * day) return Math.floor(diffMs / day) + 'd ago'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/**
 * One row in the ClientsTab list. Handles its own avatar / channel
 * icons / counts / chevron toggle and an ActionMenu (Edit / Archive /
 * Blacklist toggles). No Delete by design — clients are archived,
 * never removed (per TZ §0 glossary).
 *
 * Click anywhere except the action menu toggles expansion.
 */
export default function ClientRow({
  client,
  trips,
  expanded,
  onToggle,
  onEdit,
  onArchiveToggle,
  onBlacklistToggle,
}: Props) {
  const heading = client.nickname || client.name || client.email || client.phone || 'Unnamed'
  const counts = clientTripCounts(client, trips)
  const activity = clientLastActivity(client, trips)

  // Channel icons row, only filled channels rendered.
  const channelNodes: React.ReactNode[] = []
  if (client.email) {
    channelNodes.push(
      <span key="email" className="inline-flex items-center gap-1 text-muted-foreground">
        <Mail className="w-3 h-3" />
        <span className="truncate max-w-[180px]">{truncate(client.email, 32)}</span>
      </span>,
    )
  }
  if (client.phone) channelNodes.push(<Phone key="phone" className="w-3.5 h-3.5 text-muted-foreground" />)
  if (client.whatsapp) channelNodes.push(<MessageCircle key="wa" className="w-3.5 h-3.5 text-muted-foreground" />)
  if (client.telegram) channelNodes.push(<Send key="tg" className="w-3.5 h-3.5 text-muted-foreground" />)
  if (client.instagram) channelNodes.push(<Instagram key="ig" className="w-3.5 h-3.5 text-muted-foreground" />)
  if (client.facebook) channelNodes.push(<Facebook key="fb" className="w-3.5 h-3.5 text-muted-foreground" />)
  if (client.youtube) channelNodes.push(<Youtube key="yt" className="w-3.5 h-3.5 text-muted-foreground" />)
  if (client.tiktok) channelNodes.push(<Music key="tt" className="w-3.5 h-3.5 text-muted-foreground" />)

  const tripsLabel =
    counts.total === 0
      ? '—'
      : counts.active > 0
        ? `${counts.total} trip${counts.total === 1 ? '' : 's'} · ${counts.active} active`
        : `${counts.total} trip${counts.total === 1 ? '' : 's'}`

  // Visual state: blacklisted dims to 50%, archived to 40% + italic.
  const rowOpacity = client.archived ? 'opacity-40' : client.blacklisted ? 'opacity-60' : ''

  return (
    <>
      <div
        className={`group flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors cursor-pointer ${rowOpacity}`}
        onClick={onToggle}
        role="button"
        aria-expanded={expanded}
      >
        <span
          className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold flex-shrink-0 ${clientAvatarClass(client)}`}
        >
          {clientInitials(client)}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-sm font-medium text-foreground truncate ${client.archived ? 'italic' : ''}`}
            >
              {heading}
            </span>
            {client.blacklisted && (
              <Ban className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            )}
          </div>
          {channelNodes.length > 0 && (
            <div className="flex items-center gap-1.5 mt-0.5 text-[13px]">
              {channelNodes}
            </div>
          )}
        </div>

        <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground w-20 flex-shrink-0">
          <span>{fmtActivity(activity)}</span>
        </div>
        <div className="hidden md:flex flex-col items-end text-xs text-muted-foreground w-32 flex-shrink-0">
          <span className="whitespace-nowrap">{tripsLabel}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <ActionMenu
            ariaLabel="Client actions"
            items={[
              { label: 'Edit', onClick: onEdit },
              {
                label: client.blacklisted ? 'Remove from blacklist' : 'Blacklist',
                onClick: onBlacklistToggle,
              },
              {
                label: client.archived ? 'Restore' : 'Archive',
                onClick: onArchiveToggle,
              },
            ]}
          />
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <ClientRowExpanded trips={trips.filter((t) => t.client?.id === client.id)} />
      )}
    </>
  )
}
