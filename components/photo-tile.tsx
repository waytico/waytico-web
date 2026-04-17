'use client'

import { Trash2 } from 'lucide-react'
import type { MediaRecord } from '@/lib/upload-photo'

type Props = {
  media: MediaRecord
  owner: boolean
  onOpen: () => void
  onDelete?: () => void
  onDragStart?: (e: React.DragEvent) => void
}

export default function PhotoTile({ media, owner, onOpen, onDelete, onDragStart }: Props) {
  return (
    <div
      className="group relative aspect-square overflow-hidden rounded-lg bg-secondary cursor-pointer"
      draggable={owner}
      onDragStart={(e) => {
        if (!owner) return
        e.dataTransfer.setData('text/media-id', media.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart?.(e)
      }}
      onClick={onOpen}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.url}
        alt={media.caption || media.file_name || 'Trip photo'}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        draggable={false}
      />
      {owner && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
          aria-label="Delete photo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
