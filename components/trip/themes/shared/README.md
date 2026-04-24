# Shared trip-page blocks

These blocks render identically across all themes (Journal / Expedition /
Atelier). Theme differentiation lives entirely in the `--theme-*` CSS
variables declared by `ThemeRoot`; the components here just reference those
via Tailwind utilities (`text-theme-fg`, `bg-theme-paper`, `border-theme-rule`,
etc.).

## Block inventory

| # (TZ-5) | Block             | File                        | Source            |
| -------- | ----------------- | --------------------------- | ----------------- |
| 2        | Overview          | `overview.tsx`              | tpc 781–794       |
| 4        | Included/Excluded | `included-excluded.tsx`     | tpc 982–1036      |
| 5        | Locations         | `locations.tsx`             | **new**           |
| 6        | Photos gallery    | `photos.tsx`                | tpc 796–815 (+all) |
| —        | Tasks             | `tasks.tsx`                 | tpc 1113–1203     |
| —        | Documents         | `documents.tsx`             | tpc 1205–1348     |
| —        | Terms             | `terms.tsx`                 | tpc 1038–1051     |

(tpc = `app/t/[slug]/trip-page-client.tsx`)

## Color policy

- **Content surfaces** (headings, body copy, rules, links to Google Maps or
  downloads, card borders): `--theme-*`. They change per theme.
- **Owner chrome** (eye-toggles, delete buttons, drop-zones, "Add document"
  trigger): `--owner-chrome-*`. Theme-independent, must stay legible on
  Journal cream, Atelier paper **and** Expedition's dark background.
- **Semantic global colours** (`success`, `destructive`): left as
  global tokens. A check is green and a delete is red regardless of theme.

## Scope boundaries for step 3b

- `PhotosBlock` / `PhotoTile` / `PhotoLightbox` are used **as-is** in
  `photos.tsx`. If they don't read well on Expedition's dark background,
  the fix happens inside step 5 (Expedition theme), not here.
- No SVG maps in `locations.tsx`. Hand-sketch / topo / route designs are
  art direction and belong in per-theme components. This block is the
  shared fallback.

## TODO — step 7

**`what_to_bring` is not yet extracted.** It still lives in
`trip-page-client.tsx` (lines 1053–1110 as of this commit). When we refactor
`trip-page-client.tsx` to use `ThemeRoot` in step 7, `what_to_bring` should
become the 12th shared block (`what-to-bring.tsx`), rendered on `active`
status alongside tasks and documents. It's a useful pre-trip section for
clients — do **not** drop it.

Suggested signature (for step 7):

```ts
type WhatToBringBlockProps = {
  categories: Array<{ category: string; items: string[] }>
  owner: boolean
  onSave: (next: Array<{ category: string; items: string[] }>) => Promise<boolean>
}
```
