'use client'

import PhotosBlock from '@/components/photos-block'
import type { MediaRecord } from '@/lib/upload-photo'

type PhotosGalleryBlockProps = {
  /**
   * All project media. The component filters out `hero` and non-photo items
   * internally so callers can just pass `media` straight from their state.
   */
  media: MediaRecord[]
  owner: boolean
  uploading: number
  onUpload: (files: File[], dayId: string | null) => void
  onDelete: (mediaId: string) => void
  onOpen: (media: MediaRecord) => void
}

/**
 * Block #6 — Photos gallery (trip-level).
 *
 * Per TZ-5 scope decision: this gallery shows ALL project photos, including
 * ones that are also placed under specific days. The per-day thumbnails stay
 * inside the itinerary block (rendered per-theme); this block is the
 * "portfolio / dispatches from the field" spread between map and price.
 *
 * Owner uploads here land as `day_id=null` (trip-level bucket) — consistent
 * with the current PhotosBlock behavior when dayId is null.
 */
export function PhotosGalleryBlock({
  media,
  owner,
  uploading,
  onUpload,
  onDelete,
  onOpen,
}: PhotosGalleryBlockProps) {
  // "Gallery = all photos of the trip, including ones attached to days."
  // Only hero and non-photo media (documents) are excluded.
  const galleryMedia = (media || []).filter(
    (m) => m.placement !== 'hero' && (m.type === 'photo' || !m.type),
  )

  if (!owner && galleryMedia.length === 0) return null

  return (
    <section>
      <h2 className="text-2xl font-serif font-bold mb-4 text-theme-fg">Photos</h2>
      {/*
        PhotosBlock is used as-is for step 3b (per TZ-5 decision). If it
        doesn't read cleanly on Expedition's dark background, we theme it
        inside step 5 (Expedition theme), not here.
      */}
      <PhotosBlock
        dayId={null}
        media={galleryMedia}
        owner={owner}
        uploading={uploading}
        onUpload={onUpload}
        onDelete={onDelete}
        onOpen={onOpen}
        emptyHint="Add photos that represent the whole trip"
      />
    </section>
  )
}
