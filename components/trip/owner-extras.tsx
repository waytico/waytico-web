'use client'

import { useRef } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Owner-only chrome painted on top of the Hero. Lives outside ThemeRoot's
 * design tokens — uses shadcn semantic classes so it stays neutral
 * regardless of which trip theme is active.
 */
export function HeroOwnerOverlay({
  hasBg,
  uploadingHero,
  heroPhotoId,
  onDelete,
  onPickFile,
  dragOver,
  emptyState,
}: {
  hasBg: boolean
  uploadingHero: number
  heroPhotoId: string | null
  onDelete: () => void
  onPickFile: () => void
  dragOver: boolean
  emptyState: boolean
}) {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-0">
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40">
            <div className="rounded-full bg-white/95 px-5 py-2 text-sm font-medium text-foreground shadow-lg">
              Drop photo to set as hero
            </div>
          </div>
        )}
      </div>
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
        {hasBg && heroPhotoId && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="rounded-full bg-black/60 p-2 text-white transition-opacity hover:bg-black/80"
            aria-label="Delete hero photo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {emptyState && (
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 pointer-events-auto">
          <button
            type="button"
            onClick={onPickFile}
            disabled={uploadingHero > 0}
            className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-border bg-background/80 px-5 py-2.5 text-sm font-medium text-muted-foreground backdrop-blur transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
          >
            <ImagePlus className="h-4 w-4" />
            {uploadingHero > 0 ? 'Uploading…' : 'Add hero photo'}
          </button>
        </div>
      )}
      {hasBg && uploadingHero > 0 && (
        <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
          <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white">Uploading…</span>
        </div>
      )}
    </>
  )
}

/**
 * Drag-drop zone wrapper around the Hero. Provides drag handlers and forwards
 * dropped files to `onDrop`. Uses an absolutely-positioned ring overlay during
 * drag-over to stay on top of the themed hero background without disturbing
 * its layout.
 */
export function HeroDropZone({
  enabled,
  onDrop,
  onDragOver,
  onDragLeave,
  interceptDrop,
  children,
}: {
  enabled: boolean
  onDrop: (files: File[]) => void
  onDragOver: () => void
  onDragLeave: () => void
  /**
   * If provided, the zone still preventsDefault on drag-over (so the
   * browser doesn't try to navigate to a dropped file) but no drag
   * highlight is shown and any drop calls interceptDrop instead of
   * onDrop. Used for the anon-creator state — we want drag/drop to
   * surface "Sign up to edit" rather than trying to upload.
   */
  interceptDrop?: () => void
  children: ReactNode
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  if (!enabled) return <div className="relative">{children}</div>
  return (
    <div
      ref={innerRef}
      className="relative"
      onDragEnter={(e) => {
        e.preventDefault()
        if (interceptDrop) return
        if (e.dataTransfer?.types?.includes('Files')) onDragOver()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        if (interceptDrop) return
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) onDragLeave()
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDragLeave()
        if (interceptDrop) {
          interceptDrop()
          return
        }
        const files = e.dataTransfer?.files
        if (files && files.length > 0) {
          const list = Array.from(files).filter(
            (f) =>
              ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) &&
              f.size <= 15 * 1024 * 1024,
          )
          if (list.length) onDrop(list)
        }
      }}
    >
      {children}
    </div>
  )
}
