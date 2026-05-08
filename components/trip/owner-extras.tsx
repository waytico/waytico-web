'use client'

import { useRef } from 'react'
import { ImagePlus, LayoutGrid, Loader2, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Owner-only chrome painted on top of the Hero. Lives outside ThemeRoot's
 * design tokens — uses shadcn semantic classes so it stays neutral
 * regardless of which trip theme is active.
 *
 * The hero-photo controls collapse into a single top-right zone with three
 * mutually-exclusive states:
 *   - empty + idle → "Drag or add photo" pill (clickable)
 *   - uploading    → "Uploading…" pill with a spinner (passive)
 *   - photo set    → "Drag or change photo" pill + trash button
 * All three states sit at top-20 right-4, the same coordinate the trash
 * button used to occupy alone — operators learn one location, not three.
 */
export function HeroOwnerOverlay({
  hasBg,
  uploadingHero,
  heroPhotoId,
  onDelete,
  onPickFile,
  onPickFromBank,
  dragOver,
  emptyState,
}: {
  hasBg: boolean
  uploadingHero: number
  heroPhotoId: string | null
  onDelete: () => void
  onPickFile: () => void
  /** Stage 10 Block C — opens the Photo Bank picker modal. Optional;
   *  caller passes when the trip page wires the picker (free + paid). */
  onPickFromBank?: () => void
  dragOver: boolean
  emptyState: boolean
}) {
  const isUploading = uploadingHero > 0
  // Pill styling shared by every state — high-contrast dark fill so it
  // reads on both the empty-hero placeholder (dark slab) and on top of
  // an actual photo background.
  const pillCls =
    'inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white transition-colors'
  const pillClickable = `${pillCls} hover:bg-black/80`

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

      <div className="absolute top-32 sm:top-20 right-4 z-10 flex items-center gap-2 pointer-events-auto">
        {/* Uploading — passive pill with spinner. Wins over both empty
            and photo-set states because it can fire from either. */}
        {isUploading && (
          <span className={pillCls}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Uploading…
          </span>
        )}

        {/* Photo set + idle — change pill plus standalone trash. */}
        {!isUploading && hasBg && heroPhotoId && (
          <>
            <button
              type="button"
              onClick={onPickFile}
              className={pillClickable}
              aria-label="Change hero photo"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Drag or change photo
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="rounded-full bg-black/60 p-2 text-white transition-colors hover:bg-black/80"
              aria-label="Delete hero photo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {onPickFromBank && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onPickFromBank()
                }}
                className={pillClickable}
                aria-label="Choose hero photo from Photo Bank"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Choose from bank
              </button>
            )}
          </>
        )}
      </div>

      {/* Empty + idle — own centered slot so the invitation reads as the
          primary action on a brand-new hero (oversized pill, dead-center).
          Uploading and filled states stay in the top-right cluster above. */}
      {!isUploading && emptyState && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <button
            type="button"
            onClick={onPickFile}
            className="pointer-events-auto inline-flex items-center gap-2.5 rounded-full bg-black/60 px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-black/80"
            aria-label="Add hero photo"
          >
            <ImagePlus className="h-5 w-5" />
            Drag or add photo
          </button>
          {onPickFromBank && (
            <button
              type="button"
              onClick={onPickFromBank}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/65"
              aria-label="Choose hero photo from Photo Bank"
            >
              <LayoutGrid className="h-4 w-4" />
              Choose from bank
            </button>
          )}
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
