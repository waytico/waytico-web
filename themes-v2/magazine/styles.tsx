/**
 * Magazine theme — typography helpers shim.
 *
 * Per MAGAZINE-SPEC §R.3, all sizing, positioning and z-indexing live
 * in CSS classes (themes-v2/magazine/layout.css). The legacy
 * `eyebrow` / `display` / `body` inline-style objects and the `TWEAKS`
 * constants object that used to live here have been removed — they
 * encoded hardcoded numerics that R.3 forbids.
 *
 * What's left:
 *   - `Hairline` — a thin 1px rule, exposed as a component because
 *     section files import it as JSX (occasional className override
 *     for spacing variants). A pure CSS rule would force a wrapping
 *     div per use; the component is cleaner.
 *
 * The on-photo color literals (CREAM #F5F0E6 / BLACK #1A1817) used to
 * be exported from this file. They now live as CSS variables
 * `--mag-on-photo-fg` and `--ink` in tokens.css / layout.css. Section
 * components reference them through classes, not literal hex.
 */

export function Hairline({ className }: { className?: string }) {
  return <div className={['mag-hairline', className].filter(Boolean).join(' ')} />
}
