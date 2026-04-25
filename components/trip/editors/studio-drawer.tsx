'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { X, Loader2, ChevronDown } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { resolveTheme, type ThemeId } from '@/lib/themes'
import { ThemeSwitcher } from './theme-switcher'
import { RatingsEditor, type Ratings, type RatingsPatch } from './ratings-editor'
import { HostEditor, type Host, type HostPatch } from './host-editor'
import {
  OperatorContactEditor,
  type OperatorContact,
  type OperatorContactPatch,
} from './operator-contact-editor'
import { BrandLogoEditor, type Brand, type BrandPatch } from './brand-logo-editor'

type Props = {
  open: boolean
  onClose: () => void
  /** Project id — needed for /api/projects/:id PATCH */
  projectId: string
  /** Current design theme on the project */
  initialDesignTheme: string | null | undefined
  /** Current project trip-level fields */
  initialRatings: Ratings
  initialHost: Host
  initialOperatorContact: OperatorContact
  /** Current operator profile fields (user-level) */
  initialBrand: Brand
  /**
   * Called once after a successful Save — lets the parent re-fetch the
   * /full payload so all editors and themed renders see the new state.
   */
  onSaved: () => void
}

type Section = 'theme' | 'ratings' | 'host' | 'operator' | 'brand'

const SECTIONS: Array<{ key: Section; label: string; hint: string }> = [
  { key: 'theme', label: 'Theme', hint: 'Visual style of the trip page' },
  { key: 'ratings', label: 'Ratings', hint: 'Difficulty · comfort · pace · immersion' },
  { key: 'host', label: 'Host', hint: 'Name · title · bio · avatar' },
  { key: 'operator', label: 'Operator contact', hint: 'Per-trip override' },
  { key: 'brand', label: 'Studio brand', hint: 'Logo + tagline (your profile)' },
]

/**
 * Studio drawer.
 *
 * Right-side overlay with 4 collapsible sections. Local edits accumulate
 * in this component's state; one "Save" button at the bottom flushes
 * three PATCH requests in parallel:
 *   - PATCH /api/projects/:id  with { ratings, host, operatorContact }
 *     (only if any of those changed)
 *   - PATCH /api/users/me      with { brandLogoUrl, brandTagline }
 *     (only if either changed)
 *
 * On success the drawer closes and onSaved() runs so the trip page can
 * re-fetch /full and re-render with new state.
 *
 * Closing without saving discards local edits. Backdrop click closes
 * unless we're mid-save.
 */
export function StudioDrawer({
  open,
  onClose,
  projectId,
  initialDesignTheme,
  initialRatings,
  initialHost,
  initialOperatorContact,
  initialBrand,
  onSaved,
}: Props) {
  const { getToken } = useAuth()
  const [openSection, setOpenSection] = useState<Section | null>('theme')

  // Local working copies, reset whenever the drawer reopens
  const [theme, setTheme] = useState<ThemeId>(resolveTheme(initialDesignTheme))
  const [ratings, setRatings] = useState<RatingsPatch | null>(null)
  const [host, setHost] = useState<HostPatch | null>(null)
  const [opContact, setOpContact] = useState<OperatorContactPatch | null>(null)
  const [brand, setBrand] = useState<BrandPatch | null>(null)

  const [dirty, setDirty] = useState({
    theme: false,
    ratings: false,
    host: false,
    operator: false,
    brand: false,
  })
  const [saving, setSaving] = useState(false)

  // Reset state on open
  useEffect(() => {
    if (!open) return
    setTheme(resolveTheme(initialDesignTheme))
    setRatings(
      initialRatings
        ? {
            difficulty: initialRatings.difficulty ?? null,
            comfort: initialRatings.comfort ?? null,
            pace: initialRatings.pace ?? null,
            cultural_immersion: initialRatings.cultural_immersion ?? null,
          }
        : null,
    )
    setHost(
      initialHost
        ? {
            name: initialHost.name ?? null,
            title: initialHost.title ?? null,
            bio: initialHost.bio ?? null,
            avatarUrl: initialHost.avatarUrl ?? null,
          }
        : null,
    )
    setOpContact(
      initialOperatorContact
        ? {
            name: initialOperatorContact.name ?? null,
            email: initialOperatorContact.email ?? null,
            phone: initialOperatorContact.phone ?? null,
            whatsapp: initialOperatorContact.whatsapp ?? null,
            telegram: initialOperatorContact.telegram ?? null,
            website: initialOperatorContact.website ?? null,
          }
        : null,
    )
    setBrand({
      brandLogoUrl: initialBrand?.brand_logo_url ?? null,
      brandTagline: initialBrand?.brand_tagline ?? null,
    })
    setDirty({
      theme: false,
      ratings: false,
      host: false,
      operator: false,
      brand: false,
    })
  }, [open, initialDesignTheme, initialRatings, initialHost, initialOperatorContact, initialBrand])

  // Close on Escape (when not saving)
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, saving, onClose])

  if (!open) return null

  const isDirty =
    dirty.theme || dirty.ratings || dirty.host || dirty.operator || dirty.brand

  const save = async () => {
    if (saving || !isDirty) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) {
        toast.error('Sign in again to save')
        setSaving(false)
        return
      }

      const projectPatch: Record<string, unknown> = {}
      if (dirty.theme) projectPatch.designTheme = theme
      if (dirty.ratings) projectPatch.ratings = ratings
      if (dirty.host) projectPatch.host = host
      if (dirty.operator) projectPatch.operatorContact = opContact

      const ownerPatch: Record<string, unknown> = {}
      if (dirty.brand) {
        ownerPatch.brandLogoUrl = brand?.brandLogoUrl ?? ''
        ownerPatch.brandTagline = brand?.brandTagline ?? null
      }

      const requests: Promise<Response>[] = []
      if (Object.keys(projectPatch).length > 0) {
        requests.push(
          apiFetch(`/api/projects/${projectId}`, {
            method: 'PATCH',
            token,
            body: JSON.stringify(projectPatch),
          }),
        )
      }
      if (Object.keys(ownerPatch).length > 0) {
        requests.push(
          apiFetch('/api/users/me', {
            method: 'PATCH',
            token,
            body: JSON.stringify(ownerPatch),
          }),
        )
      }

      const responses = await Promise.all(requests)
      const failed = responses.find((r) => !r.ok)
      if (failed) {
        const err = await failed.json().catch(() => ({}))
        toast.error(err?.error || 'Save failed')
        return
      }

      toast.success('Saved')
      setDirty({
        theme: false,
        ratings: false,
        host: false,
        operator: false,
        brand: false,
      })
      onSaved()
      onClose()
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-label="Studio settings"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close studio"
        onClick={() => !saving && onClose()}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
      />

      {/* Drawer panel */}
      <aside
        className="absolute right-0 top-0 h-full w-full md:w-[480px] bg-background border-l border-border flex flex-col"
        style={{ boxShadow: '-12px 0 32px rgba(0,0,0,0.15)' }}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-foreground/50">
              Studio
            </div>
            <h2 className="text-lg font-serif text-foreground">
              Edit trip details
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            disabled={saving}
            aria-label="Close"
            className="rounded-full p-2 text-foreground/60 hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {SECTIONS.map((s) => {
            const isOpen = openSection === s.key
            return (
              <div key={s.key} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? null : s.key)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {s.label}
                      {dirty[s.key] && (
                        <span
                          className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-accent align-middle"
                          aria-label="Unsaved changes"
                        />
                      )}
                    </div>
                    <div className="text-xs text-foreground/50 mt-0.5">
                      {s.hint}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-foreground/50 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5">
                    {s.key === 'theme' && (
                      <ThemeSwitcher
                        value={theme}
                        onChange={(next) => {
                          setTheme(next)
                          setDirty((d) => ({ ...d, theme: true }))
                        }}
                      />
                    )}
                    {s.key === 'ratings' && (
                      <RatingsEditor
                        value={ratings}
                        onChange={(next) => {
                          setRatings(next)
                          setDirty((d) => ({ ...d, ratings: true }))
                        }}
                      />
                    )}
                    {s.key === 'host' && (
                      <HostEditor
                        value={host}
                        onChange={(next) => {
                          setHost(next)
                          setDirty((d) => ({ ...d, host: true }))
                        }}
                      />
                    )}
                    {s.key === 'operator' && (
                      <OperatorContactEditor
                        value={opContact}
                        onChange={(next) => {
                          setOpContact(next)
                          setDirty((d) => ({ ...d, operator: true }))
                        }}
                      />
                    )}
                    {s.key === 'brand' && (
                      <BrandLogoEditor
                        value={
                          brand
                            ? {
                                brand_logo_url: brand.brandLogoUrl,
                                brand_tagline: brand.brandTagline,
                              }
                            : null
                        }
                        onChange={(next) => {
                          setBrand(next)
                          setDirty((d) => ({ ...d, brand: true }))
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <footer className="px-5 py-4 border-t border-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => !saving && onClose()}
            disabled={saving}
            className="px-4 py-2 text-sm text-foreground/70 hover:text-foreground rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </aside>
    </div>
  )
}
