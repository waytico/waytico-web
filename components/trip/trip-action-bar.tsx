'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Eye, Lock } from 'lucide-react'
import ShareMenu from '@/components/share-menu'
import { ActivateStubModal } from '@/components/activate-stub-modal'
import { apiFetch } from '@/lib/api'
import { type ThemeId } from '@/lib/themes'
import { getStatusMeta, buildTripMenu } from '@/lib/trip-status'
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
  onStatusChanged?: () => void
  onRequestArchive: () => void
  onRequestDelete: () => void
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
  onStatusChanged,
  onRequestArchive,
  onRequestDelete,
  isShowcase,
  onLocalThemeChange,
  standalone = false,
  topOffset = 0,
  showClientInfoToggle,
  clientInfoOpen,
  onToggleClientInfo,
  previewMode = false,
  onExitPreview,
}: Props) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activateStubOpen, setActivateStubOpen] = useState(false)
  const triggerWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (triggerWrapRef.current && !triggerWrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [menuOpen])

  const changeStatus = async (next: string, verb: string) => {
    if (busy) return
    setBusy(true)
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Sign in again')
        return
      }
      const res = await apiFetch(`/api/projects/${projectId}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || `Could not ${verb}`)
        return
      }
      toast.success(`${title} — ${verb}d`)
      onStatusChanged?.()
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  const restoreFromArchive = async () => {
    if (busy) return
    setBusy(true)
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Sign in again')
        return
      }
      const res = await apiFetch(`/api/projects/${projectId}/restore`, {
        method: 'POST',
        token,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Could not restore')
        return
      }
      toast.success(`${title} — restored`)
      onStatusChanged?.()
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  const meta = getStatusMeta(status)

  const items = buildTripMenu(status, {
    changeStatus: (next) =>
      changeStatus(next, next === 'completed' ? 'complete' : next === 'active' ? 'reactivate' : next),
    requestArchive: onRequestArchive,
    requestDelete: onRequestDelete,
    restore: restoreFromArchive,
    onActivate: status === 'quoted' ? () => setActivateStubOpen(true) : undefined,
  })

  // Pill-wrapper layout matching the Claude Design v2 handoff:
  //
  //   ╭─[ • QUOTE ⌄ │ 🔒 Client │ 🎨 Design │ 👁 Preview │ ✈ Share ]─╮
  //
  // One soft cream capsule hugs all controls. Status pill stays flush
  // left; the actions group is flush right via ml-auto so Share lands
  // at the trailing edge. A single hairline divider after the status
  // pill is always visible — it separates the trip-state control from
  // the agent's tools. Inter-action dividers only show on lg+ alongside
  // the labels — bare-icon mode (mobile / tablet / laptop) reads
  // cleaner without them.
  const inlineRow = (
    <div className="flex items-center gap-1 lg:gap-1.5 w-full rounded-full bg-secondary/40 border border-border/50 px-1.5 py-0.5">
      {/* Status pill — also opens the action menu (Make it a trip /
          Archive / Delete / Restore — depends on current status). */}
      <div ref={triggerWrapRef} className="relative inline-block">
        <button
          type="button"
          onClick={() => items.length > 0 && setMenuOpen((v) => !v)}
          disabled={busy || items.length === 0}
          className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-sans font-semibold uppercase tracking-wider rounded-full transition-opacity hover:opacity-80 disabled:opacity-60 ${meta.chipClass}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          {meta.hasDot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
          <span>{meta.label}</span>
          {items.length > 0 && <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {menuOpen && items.length > 0 && (
          <div
            role="menu"
            className="absolute left-0 mt-2 w-56 rounded-xl bg-background border border-border shadow-lg py-1 z-30"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  item.onClick()
                }}
                disabled={busy}
                className={
                  'block w-full text-left px-4 py-2 text-sm transition-colors disabled:opacity-60 ' +
                  (item.variant === 'danger'
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'hover:bg-secondary')
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Always-visible divider between status pill and action group. */}
      <div className="w-px h-5 bg-border/60 mx-0.5" aria-hidden="true" />

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
        {canShare && (
          <div className="lg:ml-3">
            <ShareMenu title={title} url={shareUrl} publicStatus={status} label="Share" />
          </div>
        )}
      </div>
    </div>
  )

  // Default — return inline content; the global Header hosts it.
  if (!standalone) {
    return (
      <>
        {inlineRow}
        <ActivateStubModal open={activateStubOpen} onClose={() => setActivateStubOpen(false)} />
      </>
    )
  }

  // Standalone — wrap in our own sticky bar (used by the showcase
  // demo where there's no global Header to host the row).
  return (
    <>
      <div
        className="sticky z-30 w-full border-b border-border/60 bg-background/95 backdrop-blur-sm"
        style={{ top: topOffset }}
      >
        <div className="max-w-7xl mx-auto px-4 py-2">{inlineRow}</div>
      </div>
      <ActivateStubModal open={activateStubOpen} onClose={() => setActivateStubOpen(false)} />
    </>
  )
}
