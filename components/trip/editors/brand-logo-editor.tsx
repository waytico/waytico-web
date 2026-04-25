'use client'

import { useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { ImagePlus, Trash2, Loader2 } from 'lucide-react'
import { uploadBrandLogo, BrandLogoUploadError } from '@/lib/upload-brand-logo'

export type Brand = {
  brand_logo_url?: string | null
  brand_tagline?: string | null
} | null | undefined

export type BrandPatch = {
  brandLogoUrl: string | null
  brandTagline: string | null
}

type Props = {
  value: Brand
  /**
   * Called whenever a field changes locally (logo URL or tagline). The
   * drawer batches the actual save to PATCH /api/users/me. Logo upload
   * happens immediately though — once the file is in S3, we surface the
   * cdnUrl via this callback so the drawer's "save" persists it.
   */
  onChange: (next: BrandPatch) => void
}

/**
 * Brand-logo + tagline editor.
 *
 * User-level (operator profile), not project-level — but lives in the
 * same Studio drawer for one-stop branding setup.
 *
 * Logo upload uses the new POST /api/users/me/brand-logo/presign flow:
 * present a file → upload to S3 → cdnUrl returned. We mark the cdnUrl
 * locally; the drawer's Save persists it via PATCH /api/users/me.
 *
 * Tagline is a simple short string used by Atelier (under host name)
 * and Expedition (uppercase under operator). Max 200 chars (matches
 * backend Zod schema).
 */
export function BrandLogoEditor({ value, onChange }: Props) {
  const { getToken } = useAuth()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  const current: BrandPatch = {
    brandLogoUrl: value?.brand_logo_url ?? null,
    brandTagline: value?.brand_tagline ?? null,
  }

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Sign in again to upload')
        return
      }
      const cdnUrl = await uploadBrandLogo(file, token)
      onChange({ ...current, brandLogoUrl: cdnUrl })
      toast.success('Logo uploaded — Save to apply')
    } catch (err) {
      if (err instanceof BrandLogoUploadError) {
        toast.error(err.message)
      } else {
        toast.error('Upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-foreground/60 leading-relaxed">
        Your brand logo and tagline appear on every trip page. JPEG, PNG, or
        WebP. Up to 15MB.
      </p>

      {/* Logo */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-2">
          Logo
        </label>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleFile(file)
          }}
        />

        {current.brandLogoUrl ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.brandLogoUrl}
              alt=""
              className="h-12 w-auto max-w-[160px] object-contain"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground/50 truncate">
                {current.brandLogoUrl.split('/').pop()}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  className="text-xs text-accent hover:underline disabled:opacity-60 inline-flex items-center gap-1"
                >
                  {uploading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : null}
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...current, brandLogoUrl: null })}
                  className="text-xs text-foreground/60 hover:text-foreground inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full py-8 rounded-md border-2 border-dashed border-border hover:border-accent flex flex-col items-center gap-2 text-foreground/60 hover:text-accent transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <ImagePlus className="w-6 h-6" />
            )}
            <span className="text-xs font-mono uppercase tracking-wider">
              {uploading ? 'Uploading…' : 'Click to upload logo'}
            </span>
          </button>
        )}
      </div>

      {/* Tagline */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/70 mb-1">
          Tagline
        </label>
        <input
          type="text"
          maxLength={200}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          value={current.brandTagline || ''}
          onChange={(e) =>
            onChange({
              ...current,
              brandTagline: e.target.value.trim() ? e.target.value : null,
            })
          }
          placeholder="Slow luxury since 2023"
        />
        <p className="text-xs text-foreground/50 mt-1">
          One short line — appears on the operator block. Up to 200 chars.
        </p>
      </div>
    </div>
  )
}
