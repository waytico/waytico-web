'use client'

import { X } from 'lucide-react'
import SmartClientPicker from '@/components/dashboard/smart-client-picker'
import type { Client } from './trip-types'

type Props = {
  onPick: (client: Client) => Promise<void> | void
  onCreateNew: (draft: Partial<Client>) => Promise<void> | void
  onDismiss: () => void
}

/**
 * Inline banner under the Header. Shown after the operator triggers a
 * share channel on a trip without a linked client_id, persisted to
 * sessionStorage so a refresh / cross-tab navigation keeps it visible.
 *
 * Pure presentation — state machine lives in trip-page-client.tsx
 * (sessionStorage rehydrate, conditions, dismiss / link clear-up).
 *
 * Inline-flow (not position:fixed). The Header itself is sticky; this
 * banner sits in normal document flow directly underneath it so it
 * scrolls away naturally if the user is reading further down. It
 * comes back the moment the operator triggers another share (the
 * sessionStorage flag is rewritten by the share handler).
 */
export default function SharePromptBanner({ onPick, onCreateNew, onDismiss }: Props) {
  return (
    <div
      role="region"
      aria-label="Save the client after sharing"
      className="w-full border-b border-accent/30 bg-accent/10"
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground/90 mb-2">
              Just shared this trip — save the client so it doesn&apos;t get lost.
            </p>
            <SmartClientPicker
              autoFocus
              placeholder="Search by name, phone, email…"
              onPick={onPick}
              onCreateNew={onCreateNew}
            />
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss for this session"
            className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
