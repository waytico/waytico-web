'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Eye, Lock, Send } from 'lucide-react'
import ShareMenu from '@/components/share-menu'
import { apiFetch } from '@/lib/api'
import { type ThemeId } from '@/lib/themes'
import { getStatusMeta } from '@/lib/trip-status'
import { ThemeSwitcher } from '@/components/trip/theme-switcher'

type Props = {
  projectId: string
  status: string
  title: string
  shareUrl: string
  canShare: boolean
  /** Persisted design_theme from the project (null = default 'editorial'). */
  designTheme?: string | null
  onPreviewAsClient: () => void
  /**
   * Lifecycle callbacks — kept on the prop type for backward
   * compatibility with the trip-page-client wrapper, but no longer
   * invoked here. State transitions (Make it a trip / Archive /
   * Delete / Restore / Reactivate / Mark complete) live on the
   * dashboard cards and rows, not on the trip-page action bar.
   */
  onStatusChanged?: () => void
  onRequestArchive?: () => void
  onRequestDelete?: () => void
  /** Showcase / demo plumbing — passed straight to ThemeSwitcher. */
  isShowcase?: boolean
  onLocalThemeChange?: (next: ThemeId) => void
  /**
   * `false` (default) — render only the actions row; the parent (the
   *   global Header) owns positioning, sticky, max-width and padding.
   *   This is the trip-page-owner path.
   *
   * `true` — wrap the row in its own sticky bar with a max-width
   *   container. Used by the showcase demo where there's no global
   *   Header to host the row, so the bar floats below the orange
   *   ShowcaseBanner instead. Pass `topOffset` (px) to slide it
   *   underneath whatever sits above it.
   */
  standalone?: boolean
  topOffset?: number
  /**
   * Themes that gate ClientInfo behind a toggle (Magazine) opt in by
   * setting this to true. Themes that show ClientInfo unconditionally
   * (Classic, Cinematic, Clean) leave it undefined and the toggle is
   * never rendered. The owner of the open/closed state lives in
   * trip-page-client so it can drive both this toggle and the
   * ClientInfo render.
   */
  showClientInfoToggle?: boolean
  clientInfoOpen?: boolean
  onToggleClientInfo?: () => void
  /**
   * Forwarded to ShareMenu. Fired when the operator picks any share
   * channel (Email/WhatsApp/Telegram/Copy). Drives the SharePromptBanner
   * shown for trips without a linked client_id (TZ Stage 5).
   */
  onShareAction?: () => void
  /** Publish state — drives Send vs Save / Save & notify CTA. */
  isPublished?: boolean
  hasPendingPublish?: boolean
  /** Called after a successful publish so the page can refresh. */
  onPublished?: () => void
  /**
   * When true, the Preview slot is replaced by an "Exit preview" pill that
   * pulses in accent colors. The owner is currently viewing the trip page
   * as a client; pressing the pill leaves preview mode. The pill occupies
   * exactly the same x-coordinate as the Preview button it replaces, so
   * the operator can toggle preview on / off without moving the mouse.
   */
  previewMode?: boolean
  onExitPreview?: () => void
}

/**
 * Trip action row for the owner: status pill (left) + 4 actions (right).
 *
 * By default this returns just the inline row — it expects to live
 * inside the global Header's `tripActions` slot, where the Header owns
 * sticky-ness and outer chrome. Set `standalone` to wrap the row in
 * its own sticky bar (used in showcase mode where there's no Header
 * to host it).
 *
 * Mobile keeps the labels off the four right-hand actions: Lock /
 * palette / eye / Send icons only. Operators are 90% on desktop, so
 * this trade-off saves a row of vertical chrome on phones without
 * hurting the primary user. Status pill on the left keeps its label
 * because it's the only control that conveys current state.
 */
export function TripActionBar({
  projectId,
  status,
  title,
  shareUrl,
  canShare,
  designTheme,
  onPreviewAsClient,
  isShowcase,
  onLocalThemeChange,
  standalone = false,
  topOffset = 0,
  showClientInfoToggle,
  clientInfoOpen,
  onToggleClientInfo,
  onShareAction,
  previewMode = false,
  onExitPreview,
  isPublished = false,
  hasPendingPublish = false,
  onPublished,
}: Props) {
  const { getToken } = useAuth()

  // Lifecycle handlers (changeStatus, restoreFromArchive, busy state,
  // menuOpen state, ActivateStubModal) used to live here. They moved
  // to the dashboard cards / rows when the trip-page status pill became
  // read-only. SendOrSaveControl below has its own busy state — this
  // component itself no longer mutates anything.

  const meta = getStatusMeta(status)

  // Status pill is read-only here. All state transitions (Make it a trip,
  // Archive, Delete, Restore, Reactivate, Mark complete) live on the
  // dashboard now — the trip page is for editing the proposal, not for
  // managing its lifecycle. This keeps the action bar focused on the
  // single thing the operator does here: refine and Send.

  // Pill-wrapper layout:
  //
  //   ╭─[ • QUOTE │ 🔒 Client │ 🎨 Design │ 👁 Preview │ ✈ Share ]─╮
  //
  // One soft cream capsule hugs all controls. Status pill stays flush
  // left; the actions group is flush right via ml-auto so Share lands
  // at the trailing edge. A single hairline divider after the status
  // pill is always visible — it separates the trip-state indicator from
  // the agent's tools. Inter-action dividers only show on lg+ alongside
  // the labels — bare-icon mode (mobile / tablet / laptop) reads
  // cleaner without them.
  const inlineRow = (
    <div className="flex items-center gap-1 lg:gap-1.5 w-full rounded-full bg-secondary/40 border border-border/50 px-1.5 py-0.5">
      {/* Status pill — non-interactive label. Lifecycle actions are on
          the dashboard. */}
      <div className="relative inline-block lg:mr-3">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-sans font-semibold uppercase tracking-wider rounded-full ${meta.chipClass}`}
          aria-label={`Trip status: ${meta.label}`}
        >
          {meta.hasDot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
          <span>{meta.label}</span>
        </span>
      </div>

      {/* Always-visible divider between status pill and action group. */}
      <div className="w-px h-5 bg-border/60 mx-0.5 hidden lg:block" aria-hidden="true" />

      {/* Agent tools. Bare icons below lg, labelled at lg+. Inter-tool
          dividers ride along with the labels. Share is the primary CTA
          — solid terracotta — and anchors the right edge. */}
      <div className="flex items-center gap-0.5 lg:gap-1 ml-auto">
        {showClientInfoToggle && (
          <>
            <button
              type="button"
              onClick={onToggleClientInfo}
              aria-pressed={clientInfoOpen ? 'true' : 'false'}
              aria-label={clientInfoOpen ? 'Hide client info' : 'Show client info'}
              className={
                'inline-flex items-center gap-1.5 px-2 lg:px-2.5 py-1 rounded-full text-sm transition-colors ' +
                (clientInfoOpen
                  ? 'bg-accent/10 text-accent'
                  : 'text-foreground/70 hover:text-foreground hover:bg-background/60')
              }
            >
              <Lock className="w-4 h-4" />
              <span className="hidden lg:inline">Client</span>
              <span className="hidden lg:inline">
                {clientInfoOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </span>
            </button>
            <div className="w-px h-5 bg-border/60 hidden lg:block" aria-hidden="true" />
          </>
        )}
        <ThemeSwitcher
          projectId={projectId}
          value={designTheme}
          isShowcase={isShowcase}
          onLocalChange={onLocalThemeChange}
        />
        <div className="w-px h-5 bg-border/60 hidden lg:block" aria-hidden="true" />
        {previewMode ? (
          <button
            type="button"
            onClick={onExitPreview}
            aria-label="Exit preview"
            className="inline-flex items-center gap-1.5 px-2 lg:px-2.5 py-1 rounded-full text-sm bg-accent text-accent-foreground animate-pulse hover:opacity-90 transition-opacity"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden lg:inline">Exit preview</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onPreviewAsClient}
            aria-label="Preview as client"
            className="inline-flex items-center gap-1.5 px-2 lg:px-2.5 py-1 rounded-full text-sm text-foreground/70 hover:text-foreground hover:bg-background/60 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden lg:inline">Preview</span>
          </button>
        )}
        <div className="w-px h-5 bg-border/60 hidden lg:block" aria-hidden="true" />
      </div>
      {canShare && (
        <div className="ml-auto lg:ml-3">
          <SendOrSaveControl
            projectId={projectId}
            title={title}
            shareUrl={shareUrl}
            publicStatus={status}
            isPublished={isPublished}
            hasPendingPublish={hasPendingPublish}
            onShareAction={onShareAction}
            onPublished={onPublished}
          />
        </div>
      )}
    </div>
  )

  // Default — return inline content; the global Header hosts it.
  if (!standalone) {
    return inlineRow
  }

  // Standalone — wrap in our own sticky bar (used by the showcase
  // demo where there's no global Header to host the row).
  return (
    <div
      className="sticky z-30 w-full border-b border-border/60 bg-background/95 backdrop-blur-sm"
      style={{ top: topOffset }}
    >
      <div className="max-w-7xl mx-auto px-4 py-2">{inlineRow}</div>
    </div>
  )
}

/**
 * Send / Save / Save & notify control.
 *
 * State machine:
 *   1. Pre-first-publish (!isPublished)
 *      → single "Send" button. Click publishes, then opens ShareMenu.
 *   2. Published, no pending edits (isPublished && !hasPendingPublish)
 *      → "Send" button. Opens ShareMenu (no publish — nothing to publish).
 *   3. Published with pending edits (isPublished && hasPendingPublish)
 *      → "Save" + "Save & notify". Save publishes silently. Save & notify
 *      publishes, then opens ShareMenu.
 *
 * Refusing to publish on a no-op (server returns published=false) is
 * idempotent; we still open ShareMenu when notify=true was clicked,
 * because the agent's intent was to share.
 */
type SendOrSaveProps = {
  projectId: string
  title: string
  shareUrl: string
  publicStatus: string
  isPublished: boolean
  hasPendingPublish: boolean
  onShareAction?: () => void
  onPublished?: () => void
}

function SendOrSaveControl({
  projectId,
  title,
  shareUrl,
  publicStatus,
  isPublished,
  hasPendingPublish,
  onShareAction,
  onPublished,
}: SendOrSaveProps) {
  const { getToken } = useAuth()
  const [busy, setBusy] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const publish = async (): Promise<boolean> => {
    setBusy(true)
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Sign in again')
        return false
      }
      const res = await apiFetch(`/api/projects/${projectId}/publish`, {
        method: 'POST',
        token,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Could not save')
        return false
      }
      onPublished?.()
      return true
    } catch {
      toast.error('Network error')
      return false
    } finally {
      setBusy(false)
    }
  }

  // Send (initial) and Save & notify both just open the share menu.
  // The actual publish happens inside ShareMenu.beforeShare when the
  // operator picks a channel — opening the menu and walking away
  // must not flip the trip into `quoted` or alter the snapshot.
  const handleSendOrShare = () => {
    if (busy) return
    setShareOpen(true)
  }

  // Silent re-publish for the "Save" button. This path only exists
  // when the trip is already published and has pending edits the
  // operator wants to push to the client view without re-sharing.
  // Toast confirms because nothing else changes visibly.
  const handleSave = async () => {
    if (busy) return
    const ok = await publish()
    if (ok) toast.success('Saved')
  }

  // Save & notify is structurally the same as Send: open the menu,
  // defer publish to the channel pick. Same beforeShare hook handles
  // the publish (with a non-empty diff this time → change_log entry).
  const handleSaveAndNotify = () => {
    if (busy) return
    setShareOpen(true)
  }

  // onShareCommit is invoked by ShareMenu the moment the operator
  // picks a channel — fire-and-forget so the native click handler
  // can still open the channel in its own tab (popup blocker is
  // friendly to direct user-gesture window.open, but goes sour
  // after async waits). Publish runs in parallel; on failure it
  // surfaces a toast and the operator can retry from Save & notify.
  const onShareCommit = () => {
    if (!isPublished || hasPendingPublish) {
      void publish()
    }
  }

  // Hide the control when there's nothing to send (archived,
  // generating, completed). `draft` IS allowed — the whole point of
  // Send is to publish a draft for the first time.
  if (
    publicStatus === 'archived' ||
    publicStatus === 'generating' ||
    publicStatus === 'completed'
  ) {
    return null
  }

  // Render outline:
  //   <wrapper>
  //     <buttons (Send | Save + Save&notify)>
  //     <ShareMenu always present, controlled via shareOpen>
  //   </wrapper>
  //
  // ShareMenu must persist across state transitions: clicking Send
  // publishes → isPublished/hasPendingPublish change → component
  // re-renders. If ShareMenu only lived in one branch, the popover
  // it tried to open would be unmounted by the next render. Keeping
  // it at the wrapper level survives the buttons swapping out.
  const sharedShareMenu = (
    <ShareMenu
      title={title}
      url={shareUrl}
      publicStatus={publicStatus}
      label="Send"
      forceOpen={shareOpen}
      onOpenChange={(v) => setShareOpen(v)}
      hideTrigger
      onShareAction={onShareAction}
      onShareCommit={onShareCommit}
    />
  )

  // Pending edits — two-button cluster, plus the persistent ShareMenu
  // (Save & notify opens it after a successful publish).
  if (isPublished && hasPendingPublish) {
    return (
      <div className="relative inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleSave}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1 rounded-full text-sm font-medium bg-secondary text-foreground hover:bg-secondary/80 transition-colors whitespace-nowrap disabled:opacity-60"
          title="Publish updates to the client view (silent)"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleSaveAndNotify}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1 rounded-full text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors whitespace-nowrap disabled:opacity-60"
          title="Publish updates and share the link"
        >
          Save & notify
        </button>
        {sharedShareMenu}
      </div>
    )
  }

  // Pre-first-publish OR published with no pending edits — single Send.
  // Our own trigger (so we can run the publish step before opening),
  // ShareMenu rendered with hideTrigger and externally controlled.
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleSendOrShare}
        disabled={busy}
        aria-label="Send"
        className="inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1 rounded-full text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors whitespace-nowrap disabled:opacity-60"
      >
        <Send className="w-4 h-4" aria-hidden="true" />
        <span>Send</span>
      </button>
      {sharedShareMenu}
    </div>
  )
}
