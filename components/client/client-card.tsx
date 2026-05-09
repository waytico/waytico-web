'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  User,
  UserPlus,
  Plus,
  Edit3,
  RefreshCcw,
  Link2Off,
  Trash2,
  X,
  Compass,
  StickyNote,
  Hash,
  Sparkles,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { clientAvatarClass, clientInitials } from '@/lib/clients-derive'
import type { Client } from '@/components/trip/trip-types'
import {
  CHANNELS,
  PRIMARY_CHANNELS,
  EXTRA_CHANNELS,
  REQUIRED_ANY_CHANNELS,
  buildChannels,
  type ChannelKey,
} from './client-card-fields'

export type ClientCardMode = 'view' | 'edit' | 'create'
export type ClientCardHost = 'trip' | 'dashboard'

export type ClientCardTripFields = {
  bookingRef: string | null
  specialRequests: string | null
  internalNotes: string | null
}

type Props = {
  mode: ClientCardMode
  host: ClientCardHost
  /** Existing client. Required for view/edit. Null for create. */
  client: Client | null
  /** Initial values for create mode (from smart-picker detection). */
  initialDraft?: Partial<Client>
  /** Trip-only operator fields. Visible when host === 'trip' AND
   *  showTripFields. */
  showTripFields?: boolean
  tripFields?: ClientCardTripFields
  /** Called after successful save (edit/create). Returns the persisted
   *  client + dedup flag (server-derived in Stage 5; for now inferred). */
  onSaved: (client: Client, deduped: boolean) => void | Promise<void>
  /** Save trip-specific fields. Required if showTripFields. */
  onTripFieldsSave?: (patch: {
    bookingRef?: string | null
    specialRequests?: string | null
    internalNotes?: string | null
  }) => Promise<boolean>
  /** Called when operator clicks Edit in view mode. */
  onRequestEdit?: () => void
  /** Switch action — caller opens picker. */
  onRequestSwitch?: () => void
  /** Unlink action. */
  onRequestUnlink?: () => void
  /** Delete action (dashboard edit mode only). */
  onRequestDelete?: () => void
  /** TZ Stage 4: dashboard host only — opens a new chat with this
   *  client pre-attached. */
  onRequestNewTrip?: () => void
  /** Edit mode only — close button. */
  onClose?: () => void
}

type FormState = {
  nickname: string
  name: string
  source: string
  notes: string
  channels: Record<ChannelKey, string>
  archived: boolean
  blacklisted: boolean
  tripBookingRef: string
  tripSpecial: string
  tripInternal: string
}

const EMPTY_FORM: FormState = {
  nickname: '',
  name: '',
  source: '',
  notes: '',
  channels: {
    phone: '',
    whatsapp: '',
    email: '',
    telegram: '',
    instagram: '',
    facebook: '',
    youtube: '',
    tiktok: '',
  },
  archived: false,
  blacklisted: false,
  tripBookingRef: '',
  tripSpecial: '',
  tripInternal: '',
}

function fromClient(
  client: Client | null,
  draft?: Partial<Client>,
  tripFields?: ClientCardTripFields,
): FormState {
  const src = (client ?? draft ?? {}) as Partial<Client>
  return {
    nickname: src.nickname ?? '',
    name: src.name ?? '',
    source: src.source ?? '',
    notes: src.notes ?? '',
    channels: {
      phone: src.phone ?? '',
      whatsapp: src.whatsapp ?? '',
      email: src.email ?? '',
      telegram: src.telegram ?? '',
      instagram: src.instagram ?? '',
      facebook: src.facebook ?? '',
      youtube: src.youtube ?? '',
      tiktok: src.tiktok ?? '',
    },
    archived: client?.archived ?? false,
    blacklisted: client?.blacklisted ?? false,
    tripBookingRef: tripFields?.bookingRef ?? '',
    tripSpecial: tripFields?.specialRequests ?? '',
    tripInternal: tripFields?.internalNotes ?? '',
  }
}

function hasIdentifier(form: FormState): boolean {
  return REQUIRED_ANY_CHANNELS.some((k) => (form.channels[k] ?? '').trim().length > 0)
}

function buildPayload(form: FormState, baseline: Client | null): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const setIfChanged = (key: string, value: string | null) => {
    const prev = (baseline as any)?.[key] ?? null
    if ((prev ?? null) !== (value ?? null)) out[key] = value
  }
  setIfChanged('nickname', form.nickname.trim() || null)
  setIfChanged('name', form.name.trim() || null)
  setIfChanged('source', form.source.trim() || null)
  setIfChanged('notes', form.notes.trim() || null)
  for (const k of Object.keys(form.channels) as ChannelKey[]) {
    const raw = form.channels[k]
    const norm = CHANNELS[k].normalise(raw)
    setIfChanged(k, norm.length > 0 ? norm : null)
  }
  if (baseline) {
    if (form.archived !== baseline.archived) out.archived = form.archived
    if (form.blacklisted !== baseline.blacklisted) out.blacklisted = form.blacklisted
  }
  return out
}

export default function ClientCard(props: Props) {
  const {
    mode,
    host,
    client,
    initialDraft,
    showTripFields,
    tripFields,
    onSaved,
    onTripFieldsSave,
    onRequestEdit,
    onRequestSwitch,
    onRequestUnlink,
    onRequestDelete,
    onRequestNewTrip,
    onClose,
  } = props

  if (mode === 'view') {
    return (
      <ClientCardView
        host={host}
        client={client}
        showTripFields={!!showTripFields}
        tripFields={tripFields}
        onRequestEdit={onRequestEdit}
        onRequestSwitch={onRequestSwitch}
        onRequestUnlink={onRequestUnlink}
        onRequestNewTrip={onRequestNewTrip}
      />
    )
  }
  return (
    <ClientCardForm
      mode={mode}
      host={host}
      client={client}
      initialDraft={initialDraft}
      showTripFields={!!showTripFields}
      tripFields={tripFields}
      onSaved={onSaved}
      onTripFieldsSave={onTripFieldsSave}
      onRequestDelete={onRequestDelete}
      onClose={onClose}
    />
  )
}

// ─── View ────────────────────────────────────────────────────────────

function ClientCardView({
  host,
  client,
  showTripFields,
  tripFields,
  onRequestEdit,
  onRequestSwitch,
  onRequestUnlink,
  onRequestNewTrip,
}: {
  host: ClientCardHost
  client: Client | null
  showTripFields: boolean
  tripFields?: ClientCardTripFields
  onRequestEdit?: () => void
  onRequestSwitch?: () => void
  onRequestUnlink?: () => void
  onRequestNewTrip?: () => void
}) {
  if (!client) return null

  const heading = client.nickname || client.name || 'Client'
  const sub = client.nickname && client.name ? client.name : null
  const channels = buildChannels(client)
  const showFor = showTripFields && host === 'trip' && tripFields
  const hasFor =
    showFor &&
    (tripFields!.bookingRef || tripFields!.specialRequests || tripFields!.internalNotes)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/70">
        <span
          className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold shrink-0 ${clientAvatarClass(client)}`}
          aria-hidden="true"
        >
          {clientInitials(client)}
        </span>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-semibold text-foreground truncate">{heading}</span>
          {sub ? (
            <span className="text-xs text-foreground/60 truncate">{sub}</span>
          ) : host === 'trip' ? (
            <span className="text-[11px] text-foreground/55 italic">linked to this trip</span>
          ) : null}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onRequestEdit && (
            <ActionBtn label="Edit" Icon={Edit3} onClick={onRequestEdit} />
          )}
          {host === 'dashboard' && onRequestNewTrip && (
            <ActionBtn label="New trip" Icon={Plus} onClick={onRequestNewTrip} />
          )}
          {onRequestSwitch && (
            <ActionBtn label="Switch" Icon={RefreshCcw} onClick={onRequestSwitch} />
          )}
          {onRequestUnlink && (
            <ActionBtn label="Unlink" Icon={Link2Off} onClick={onRequestUnlink} />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-4">
        {(client.name || client.nickname) && (
          <Section title="Identity">
            {client.name && (
              <Row label="Name" value={client.name} />
            )}
            {client.nickname && client.name && (
              <Row label="Nickname" value={client.nickname} />
            )}
          </Section>
        )}

        {channels.length > 0 && (
          <Section title="Contact">
            {channels.map(({ cfg, value, href }) => (
              <ChannelRow
                key={cfg.key}
                Icon={cfg.Icon}
                label={cfg.label}
                value={value}
                href={href}
              />
            ))}
          </Section>
        )}

        {client.notes && (
          <Section title="Notes">
            <p className="text-sm text-foreground whitespace-pre-wrap">{client.notes}</p>
          </Section>
        )}

        {client.source && (
          <Section title="Source">
            <p className="text-sm text-foreground">{client.source}</p>
          </Section>
        )}

        {showFor ? (
          hasFor ? (
            <Section title="For this trip" subtitle="operator only">
              {tripFields!.bookingRef && (
                <Row label="Booking ref" value={tripFields!.bookingRef} />
              )}
              {tripFields!.specialRequests && (
                <Row label="Special" value={tripFields!.specialRequests} multiline />
              )}
              {tripFields!.internalNotes && (
                <Row label="Notes" value={tripFields!.internalNotes} multiline />
              )}
            </Section>
          ) : null
        ) : null}
      </div>
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-foreground/55 flex items-baseline gap-2">
        <span>{title}</span>
        {subtitle && <span className="italic text-foreground/45 normal-case tracking-normal text-[10px]">— {subtitle}</span>}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({
  label,
  value,
  multiline,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-20 shrink-0 text-foreground/55 text-xs uppercase tracking-wider pt-0.5">
        {label}
      </span>
      <span className={`flex-1 min-w-0 text-foreground ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`}>
        {value}
      </span>
    </div>
  )
}

function ChannelRow({
  Icon,
  label,
  value,
  href,
}: {
  Icon: React.ComponentType<any>
  label: string
  value: string
  href: string | null
}) {
  const inner = (
    <span className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-foreground/60 shrink-0" />
      <span className="w-20 shrink-0 text-foreground/55 text-xs uppercase tracking-wider">
        {label}
      </span>
      <span className="flex-1 min-w-0 truncate text-foreground">{value}</span>
    </span>
  )
  if (!href) return <div>{inner}</div>
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="block hover:text-accent transition-colors"
    >
      {inner}
    </a>
  )
}

function ActionBtn({
  label,
  Icon,
  onClick,
}: {
  label: string
  Icon: React.ComponentType<any>
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center gap-1 px-2 h-7 text-xs rounded-md text-foreground/70 hover:text-foreground hover:bg-secondary/60 transition-colors"
    >
      <Icon size={14} aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// ─── Edit / Create form ─────────────────────────────────────────────

function ClientCardForm({
  mode,
  host,
  client,
  initialDraft,
  showTripFields,
  tripFields,
  onSaved,
  onTripFieldsSave,
  onRequestDelete,
  onClose,
}: {
  mode: 'edit' | 'create'
  host: ClientCardHost
  client: Client | null
  initialDraft?: Partial<Client>
  showTripFields: boolean
  tripFields?: ClientCardTripFields
  onSaved: (client: Client, deduped: boolean) => void | Promise<void>
  onTripFieldsSave?: (patch: {
    bookingRef?: string | null
    specialRequests?: string | null
    internalNotes?: string | null
  }) => Promise<boolean>
  onRequestDelete?: () => void
  onClose?: () => void
}) {
  const { getToken } = useAuth()
  // TZ Stage 5: when a dashboard create hits an existing roster entry,
  // we don't close — we hoist the existing client into baseline so the
  // form swaps to edit-this-existing mode and the operator can either
  // Save changes or close.
  const [dedupNotice, setDedupNotice] = useState<Client | null>(null)
  const effectiveBaseline = dedupNotice ?? client
  const effectiveMode: 'edit' | 'create' = dedupNotice ? 'edit' : mode
  const [form, setForm] = useState<FormState>(() =>
    fromClient(client, initialDraft, tripFields),
  )
  const [showExtra, setShowExtra] = useState(false)
  const [saving, setSaving] = useState(false)

  // If parent swaps client/trip-fields underneath (e.g. switch
  // client), reset form. Edit mode always re-syncs to the latest
  // baseline; create mode keeps user input.
  useEffect(() => {
    if (effectiveMode === 'edit' && effectiveBaseline) {
      setForm(fromClient(effectiveBaseline, undefined, tripFields))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveBaseline?.id, tripFields?.bookingRef, tripFields?.specialRequests, tripFields?.internalNotes, effectiveMode])

  const valid = hasIdentifier(form)
  const detectedKey = useMemo<ChannelKey | null>(() => {
    if (mode !== 'create') return null
    for (const k of REQUIRED_ANY_CHANNELS) {
      if ((initialDraft?.[k] ?? '').toString().trim().length > 0) return k
    }
    return null
  }, [mode, initialDraft])

  function setChannel(k: ChannelKey, v: string) {
    setForm((s) => ({ ...s, channels: { ...s.channels, [k]: v } }))
  }

  async function handleSave() {
    if (!valid || saving) return
    setSaving(true)
    try {
      const token = await getToken()
      if (effectiveMode === 'edit' && effectiveBaseline) {
        const patch = buildPayload(form, effectiveBaseline)
        const tripPatch = collectTripPatch(form, tripFields)
        if (Object.keys(patch).length > 0) {
          const res = await apiFetch(`/api/clients/${effectiveBaseline.id}`, {
            method: 'PATCH',
            token,
            body: JSON.stringify(patch),
          })
          if (!res.ok) {
            if (res.status === 409) {
              toast.error('Another client already uses that email or phone.')
            } else {
              toast.error('Could not save client')
            }
            return
          }
          const data = await res.json()
          const saved = (data.client as Client) ?? null
          if (saved) await onSaved(saved, false)
        }
        if (showTripFields && tripPatch && onTripFieldsSave) {
          const ok = await onTripFieldsSave(tripPatch)
          if (!ok) {
            toast.error('Could not save trip fields')
            return
          }
        }
        if (Object.keys(patch).length > 0 || tripPatch) {
          toast.success('Client updated')
        }
        onClose?.()
      } else if (mode === 'create') {
        const payload = buildPayload(form, null)
        const res = await apiFetch('/api/clients/upsert', {
          method: 'POST',
          token,
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          toast.error('Could not save client')
          return
        }
        const data = await res.json()
        const saved = (data.client as Client) ?? null
        if (!saved) {
          toast.error('Could not save client')
          return
        }
        // TZ Stage 5: server tells us explicitly whether the upsert hit
        // an existing row. Fall back to the legacy created_at heuristic
        // only if the server didn't include the flag (older deploys).
        const serverCreated: boolean | undefined =
          typeof data.created === 'boolean' ? data.created : undefined
        const deduped =
          serverCreated !== undefined
            ? !serverCreated
            : Date.now() - +new Date(saved.created_at) > 5000
        await onSaved(saved, deduped)
        if (deduped) {
          if (host === 'dashboard') {
            // Don't close the modal — let the operator see the existing
            // record and either Save changes or close. Switch to edit
            // mode by hoisting the existing client into baseline state.
            setDedupNotice(saved)
            toast.success('Already in your roster — opened existing client')
            return
          }
          toast.success('Linked existing client (already in your roster)')
        } else {
          toast.success(host === 'trip' ? 'Client created and linked' : 'Client added')
        }
        onClose?.()
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const titleText =
    dedupNotice ? 'Existing client' : mode === 'create' ? 'New client' : 'Edit client'
  const saveLabel =
    dedupNotice
      ? 'Save changes'
      : mode === 'create'
        ? host === 'trip'
          ? 'Create & link to trip'
          : 'Create client'
        : 'Save changes'

  const hintText =
    mode === 'create' && host === 'dashboard'
      ? 'Adds them to your client list.'
      : null

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/70">
        <span
          className={
            'inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold shrink-0 ' +
            (mode === 'create'
              ? 'bg-accent/10 text-accent'
              : clientAvatarClass(client ?? ({ id: '', nickname: null, name: null } as any)))
          }
          aria-hidden="true"
        >
          {mode === 'create' ? <UserPlus size={18} /> : client ? clientInitials(client) : <User size={18} />}
        </span>
        <div className="flex flex-col flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">
            {titleText}
          </h2>
          {hintText && !dedupNotice && (
            <span className="text-[11px] text-foreground/55 truncate">{hintText}</span>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-foreground/55 hover:text-foreground"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-5">
        {dedupNotice && (
          <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-foreground">
            <div className="font-medium text-accent">
              Already in your roster — opened existing client below.
            </div>
            <div className="text-foreground/70 mt-0.5">
              Edit any field and Save changes, or Close to leave this client unchanged.
            </div>
          </div>
        )}

        {/* Identity */}
        <FormSection title="Identity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nickname"
              placeholder='e.g. "Anna 1 pax" or "Nick Rockies"'
              value={form.nickname}
              onChange={(v) => setForm((s) => ({ ...s, nickname: v }))}
            />
            <Input
              label="Name"
              placeholder="Full name"
              value={form.name}
              onChange={(v) => setForm((s) => ({ ...s, name: v }))}
            />
          </div>
        </FormSection>

        {/* Contact */}
        <FormSection title="Contact" subtitle="at least one required">
          <div className="space-y-2">
            {PRIMARY_CHANNELS.map((k) => (
              <ChannelInput
                key={k}
                channel={k}
                value={form.channels[k]}
                onChange={(v) => setChannel(k, v)}
                highlighted={mode === 'create' && detectedKey === k}
              />
            ))}
          </div>
          <details
            className="pt-1"
            open={showExtra}
            onToggle={(e) => setShowExtra((e.target as HTMLDetailsElement).open)}
          >
            <summary className="text-xs text-foreground/65 hover:text-foreground inline-flex items-center gap-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <ChevronDown
                size={12}
                className={`transition-transform ${showExtra ? 'rotate-180' : ''}`}
              />
              More channels (Facebook, YouTube, TikTok)
            </summary>
            <div className="mt-2 space-y-2">
              {EXTRA_CHANNELS.map((k) => (
                <ChannelInput
                  key={k}
                  channel={k}
                  value={form.channels[k]}
                  onChange={(v) => setChannel(k, v)}
                />
              ))}
            </div>
          </details>
        </FormSection>

        {/* About — full About not in create (compact form) */}
        {effectiveMode === 'edit' && (
          <FormSection title="About">
            <div className="space-y-3">
              <Input
                label="Source"
                Icon={Compass}
                placeholder="Instagram, referral…"
                value={form.source}
                onChange={(v) => setForm((s) => ({ ...s, source: v }))}
              />
              <Textarea
                label="Notes"
                Icon={StickyNote}
                value={form.notes}
                onChange={(v) => setForm((s) => ({ ...s, notes: v }))}
              />
            </div>
          </FormSection>
        )}

        {/* For this trip */}
        {showTripFields && host === 'trip' && effectiveMode === 'edit' && (
          <FormSection title="For this trip" subtitle="operator only">
            <div className="space-y-3">
              <Input
                label="Booking ref"
                Icon={Hash}
                placeholder="Booking / contract / invoice"
                value={form.tripBookingRef}
                onChange={(v) => setForm((s) => ({ ...s, tripBookingRef: v }))}
              />
              <Textarea
                label="Special requests"
                Icon={Sparkles}
                placeholder="Diet, allergies, mobility…"
                value={form.tripSpecial}
                onChange={(v) => setForm((s) => ({ ...s, tripSpecial: v }))}
              />
              <Textarea
                label="Internal notes"
                Icon={StickyNote}
                placeholder="Your private notes about this trip"
                value={form.tripInternal}
                onChange={(v) => setForm((s) => ({ ...s, tripInternal: v }))}
              />
            </div>
          </FormSection>
        )}

        {/* Lifecycle (dashboard host, edit mode only) */}
        {host === 'dashboard' && effectiveMode === 'edit' && (
          <div className="border-t border-dashed border-border/70 pt-4 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-foreground/55">
              Lifecycle
            </div>
            <div className="flex flex-wrap gap-2">
              <Toggle
                label="Archived"
                active={form.archived}
                onClick={() => setForm((s) => ({ ...s, archived: !s.archived }))}
              />
              <Toggle
                label="Blacklisted"
                active={form.blacklisted}
                accent="danger"
                onClick={() => setForm((s) => ({ ...s, blacklisted: !s.blacklisted }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border">
        <div>
          {effectiveMode === 'edit' && onRequestDelete && (
            <button
              type="button"
              onClick={onRequestDelete}
              className="inline-flex items-center gap-1 px-2 h-9 text-sm text-destructive hover:text-destructive/80"
            >
              <Trash2 size={14} aria-hidden="true" />
              <span>Delete</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 h-9 text-sm text-foreground/70 hover:text-foreground"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!valid || saving}
            className="px-4 h-9 text-sm rounded-md bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed hover:bg-foreground/90 transition-colors"
          >
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function collectTripPatch(
  form: FormState,
  baseline?: ClientCardTripFields,
): null | { bookingRef?: string | null; specialRequests?: string | null; internalNotes?: string | null } {
  if (!baseline) return null
  const out: { bookingRef?: string | null; specialRequests?: string | null; internalNotes?: string | null } = {}
  const eq = (a: string, b: string | null) => (a.trim() || null) === (b || null)
  if (!eq(form.tripBookingRef, baseline.bookingRef)) {
    out.bookingRef = form.tripBookingRef.trim() || null
  }
  if (!eq(form.tripSpecial, baseline.specialRequests)) {
    out.specialRequests = form.tripSpecial.trim() || null
  }
  if (!eq(form.tripInternal, baseline.internalNotes)) {
    out.internalNotes = form.tripInternal.trim() || null
  }
  return Object.keys(out).length > 0 ? out : null
}

function FormSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-[0.12em] font-medium text-foreground/55 flex items-baseline gap-2">
        <span>{title}</span>
        {subtitle && (
          <span className="italic text-foreground/45 normal-case tracking-normal">— {subtitle}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function Input({
  label,
  Icon,
  placeholder,
  value,
  onChange,
  type = 'text',
  highlighted,
}: {
  label: string
  Icon?: React.ComponentType<any>
  placeholder?: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'email' | 'tel'
  highlighted?: boolean
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/55">
        {Icon && <Icon size={12} className="text-foreground/55 shrink-0" />}
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full min-w-0 px-2.5 h-8 text-sm bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-accent ${highlighted ? 'border-accent' : 'border-border'}`}
      />
    </label>
  )
}

function Textarea({
  label,
  Icon,
  placeholder,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  Icon?: React.ComponentType<any>
  placeholder?: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foreground/55">
        {Icon && <Icon size={12} className="text-foreground/55 shrink-0" />}
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full min-w-0 px-2.5 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-accent resize-y"
      />
    </label>
  )
}

function ChannelInput({
  channel,
  value,
  onChange,
  highlighted,
}: {
  channel: ChannelKey
  value: string
  onChange: (v: string) => void
  highlighted?: boolean
}) {
  const cfg = CHANNELS[channel]
  return (
    <Input
      label={cfg.label}
      Icon={cfg.Icon}
      placeholder={cfg.placeholder}
      value={value}
      onChange={onChange}
      type={cfg.type}
      highlighted={highlighted}
    />
  )
}

function Toggle({
  label,
  active,
  onClick,
  accent,
}: {
  label: string
  active: boolean
  onClick: () => void
  accent?: 'danger'
}) {
  const tone =
    accent === 'danger'
      ? active
        ? 'bg-destructive/10 text-destructive border-destructive/40'
        : 'bg-card border-border text-foreground/55 hover:text-foreground hover:border-foreground/30'
      : active
        ? 'bg-accent/10 text-accent border-accent/40'
        : 'bg-card border-border text-foreground/55 hover:text-foreground hover:border-foreground/30'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 h-7 text-xs rounded-full border transition-colors ${tone}`}
    >
      {label}
    </button>
  )
}

