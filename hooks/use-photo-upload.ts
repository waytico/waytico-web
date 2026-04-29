'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { uploadPhoto, deletePhoto, type MediaRecord } from '@/lib/upload-photo'

export type { MediaRecord }

/**
 * usePhotoUpload
 *
 * All photo S3 upload / delete logic for the trip page:
 *   - handleUpload:     bulk upload to a specific day (or null for tour-level)
 *   - handleDelete:     remove a photo (optimistic + rollback on error)
 *   - handleHeroUpload: single-photo replace for placement='hero'
 *   - uploadingByDay:   counter of in-flight uploads per day/key, for spinners
 *
 * State (media) is owned by the caller; we only mutate via setMedia.
 */

type Options = {
  projectId: string | undefined
  media: MediaRecord[]
  setMedia: React.Dispatch<React.SetStateAction<MediaRecord[]>>
}

export function usePhotoUpload({ projectId, media, setMedia }: Options) {
  const { getToken } = useAuth()
  const [uploadingByDay, setUploadingByDay] = useState<Record<string, number>>({})

  const bumpUploading = useCallback((key: string, delta: number) => {
    setUploadingByDay((prev) => {
      const next = { ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }
      if (next[key] === 0) delete next[key]
      return next
    })
  }, [])

  const handleUpload = useCallback(
    async (files: File[], dayId: string | null) => {
      if (!projectId) return
      const key = dayId || 'tour'
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again')
        return
      }
      bumpUploading(key, files.length)
      await Promise.all(
        files.map(async (file) => {
          try {
            const rec = await uploadPhoto(projectId, file, dayId, token)
            setMedia((prev) => [...prev, rec])
          } catch (e: any) {
            toast.error(e?.message || 'Upload failed')
          } finally {
            bumpUploading(key, -1)
          }
        }),
      )
    },
    [projectId, getToken, setMedia, bumpUploading],
  )

  const handleDelete = useCallback(
    async (mediaId: string) => {
      const snapshot = media
      setMedia((cur) => cur.filter((m) => m.id !== mediaId))
      try {
        const token = await getToken()
        if (!token) throw new Error('No token')
        await deletePhoto(mediaId, token)
      } catch (e: any) {
        setMedia(snapshot)
        toast.error(e?.message || 'Could not delete photo')
      }
    },
    [media, getToken, setMedia],
  )

  // Hero upload: always placement='hero', single photo. If a hero already exists,
  // it's replaced — old record deleted after the new one lands.
  const handleHeroUpload = useCallback(
    async (files: File[]) => {
      if (!projectId || files.length === 0) return
      const file = files[0]
      if (files.length > 1) {
        toast.message('Hero uses the first photo — drop more in the gallery below')
      }
      const token = await getToken()
      if (!token) {
        toast.error('Please sign in again')
        return
      }
      const prevHero = media.find((m) => m.placement === 'hero')
      bumpUploading('hero', 1)
      try {
        const rec = await uploadPhoto(projectId, file, null, token, 'hero')
        // Prepend so .find() picks the new hero even if the old one sticks around on failure.
        setMedia((prev) => [rec, ...prev])
        if (prevHero) {
          setMedia((prev) => prev.filter((m) => m.id !== prevHero.id))
          try {
            await deletePhoto(prevHero.id, token)
          } catch {
            setMedia((prev) =>
              prev.some((m) => m.id === prevHero.id) ? prev : [...prev, prevHero],
            )
          }
        }
      } catch (e: any) {
        toast.error(e?.message || 'Upload failed')
      } finally {
        bumpUploading('hero', -1)
      }
    },
    [projectId, media, getToken, setMedia, bumpUploading],
  )

  return {
    uploadingByDay,
    handleUpload,
    handleDelete,
    handleHeroUpload,
  }
}
