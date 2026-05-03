'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { uploadPhoto, deletePhoto, replacePhoto, type MediaRecord } from '@/lib/upload-photo'

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
  /**
   * Showcase / demo — never POST to S3. Instead, we mint a `blob:` URL from
   * the local File so the operator sees their photo appear immediately. F5
   * disposes the blob (intentional — the showcase is a shared demo and
   * uploads must never persist to the system showcase user).
   */
  isShowcase?: boolean
  /**
   * Anonymous trip creator (created the quote without signing up). They
   * see the full owner UI — including drag-and-drop zones and "Add
   * photo" buttons — but every actual upload attempt is short-circuited
   * with the same "Sign up to edit" toast every other anon edit gets.
   * Consistent UX: any edit attempt → same nudge → same path to sign up.
   */
  isAnon?: boolean
}

export function usePhotoUpload({ projectId, media, setMedia, isShowcase, isAnon }: Options) {
  const { getToken } = useAuth()
  const [uploadingByDay, setUploadingByDay] = useState<Record<string, number>>({})

  const bumpUploading = useCallback((key: string, delta: number) => {
    setUploadingByDay((prev) => {
      const next = { ...prev, [key]: Math.max(0, (prev[key] || 0) + delta) }
      if (next[key] === 0) delete next[key]
      return next
    })
  }, [])

  const fakePhotoRecord = useCallback(
    (file: File, dayId: string | null, placement: 'hero' | null = null): MediaRecord => {
      const id = 'showcase-photo-' + Math.random().toString(36).slice(2, 10)
      return {
        id,
        project_id: projectId || '',
        user_id: '',
        type: 'photo',
        url: URL.createObjectURL(file),
        day_id: dayId,
        placement,
        sort_order: 0,
        visible_to_client: true,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      } as any
    },
    [projectId],
  )

  const handleUpload = useCallback(
    async (files: File[], dayId: string | null) => {
      if (!projectId) return
      if (isAnon) {
        toast.error('Sign up to edit')
        return
      }
      if (isShowcase) {
        for (const f of files) {
          setMedia((prev) => [...prev, fakePhotoRecord(f, dayId)])
        }
        return
      }
      const key = dayId || 'tour'
      const token = await getToken()
      if (!token) {
        toast.error('Sign up to edit')
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
    [projectId, getToken, setMedia, bumpUploading, isShowcase, isAnon, fakePhotoRecord],
  )

  const handleDelete = useCallback(
    async (mediaId: string) => {
      if (isAnon) {
        toast.error('Sign up to edit')
        return
      }
      const snapshot = media
      setMedia((cur) => cur.filter((m) => m.id !== mediaId))
      if (isShowcase) return
      try {
        const token = await getToken()
        if (!token) throw new Error('No token')
        await deletePhoto(mediaId, token)
      } catch (e: any) {
        setMedia(snapshot)
        toast.error(e?.message || 'Could not delete photo')
      }
    },
    [media, getToken, setMedia, isShowcase, isAnon],
  )

  // Hero upload: always placement='hero', single photo. If a hero already exists,
  // it's replaced — old record deleted after the new one lands.
  const handleHeroUpload = useCallback(
    async (files: File[]) => {
      if (!projectId || files.length === 0) return
      if (isAnon) {
        toast.error('Sign up to edit')
        return
      }
      const file = files[0]
      if (files.length > 1) {
        toast.message('Hero uses the first photo — drop more in the gallery below')
      }
      if (isShowcase) {
        const prevHero = media.find((m) => m.placement === 'hero')
        const rec = fakePhotoRecord(file, null, 'hero')
        setMedia((prev) => [rec, ...prev.filter((m) => m.id !== prevHero?.id)])
        return
      }
      const token = await getToken()
      if (!token) {
        toast.error('Sign up to edit')
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
    [projectId, media, getToken, setMedia, bumpUploading, isShowcase, isAnon, fakePhotoRecord],
  )

  // Day-photo replace: in-place swap of an existing per-day photo's
  // file, keeping the same media.id, day_id and sort_order. Used by the
  // Magazine theme, where each day surfaces a single primary photo —
  // appending another row would leave the old photo as primary until the
  // delete lands (because getMagazineDayPhoto sorts by sort_order, so
  // prepend-into-array doesn't help). replacePhoto goes through PATCH
  // /api/media/:id which is bound to the existing record, so there is
  // no race between upload and delete; the server best-effort cleans up
  // the old S3 object.
  const handleDayPhotoReplace = useCallback(
    async (file: File, dayId: string, prevPhotoId: string) => {
      if (!projectId) return
      if (isAnon) {
        toast.error('Sign up to edit')
        return
      }
      if (isShowcase) {
        // Showcase keeps the existing media.id, day_id and sort_order
        // and just swaps the url to a fresh blob URL — F5 disposes it
        // along with the rest of the showcase state.
        setMedia((prev) =>
          prev.map((m) =>
            m.id === prevPhotoId
              ? ({
                  ...m,
                  url: URL.createObjectURL(file),
                  file_name: file.name,
                  file_size: file.size,
                  mime_type: file.type,
                } as MediaRecord)
              : m,
          ),
        )
        return
      }
      const token = await getToken()
      if (!token) {
        toast.error('Sign up to edit')
        return
      }
      bumpUploading(dayId, 1)
      try {
        const updated = await replacePhoto(projectId, prevPhotoId, file, file.name, token)
        setMedia((prev) => prev.map((m) => (m.id === prevPhotoId ? updated : m)))
      } catch (e: any) {
        toast.error(e?.message || 'Could not replace photo')
      } finally {
        bumpUploading(dayId, -1)
      }
    },
    [projectId, getToken, setMedia, bumpUploading, isShowcase, isAnon],
  )

  return {
    uploadingByDay,
    handleUpload,
    handleDelete,
    handleHeroUpload,
    handleDayPhotoReplace,
  }
}

