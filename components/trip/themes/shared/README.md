# Shared trip-page blocks

Three blocks live here, used identically across all themes:

| Block            | File              | Where rendered                                  |
| ---------------- | ----------------- | ----------------------------------------------- |
| Tasks            | `tasks.tsx`       | tpc, active-status preamble (between CTA/Terms) |
| Documents        | `documents.tsx`   | tpc, active-status preamble                     |
| What to bring    | `what-to-bring.tsx` | tpc, active-status preamble                   |

## Why so few?

An earlier experiment (step 3b) had eight shared blocks. The other five —
overview, included-excluded, locations, photos-gallery, terms — were
cut in step 3c.1 because per-theme rendering was structurally too
different across Journal / Atelier / Expedition for shared CSS-vars-only
templating to look right. Each theme owns those blocks now under
`../{theme}/*.tsx`. The dead files were removed in cleanup step 7.5.

## Color policy

- **Content surfaces** (headings, body copy, rules, links to Google
  Maps or downloads, card borders): `--theme-*` Tailwind tokens. Change
  per theme.
- **Owner chrome** (eye-toggles, delete buttons, drop-zones, "Add
  document" trigger): `--owner-chrome-*`. Theme-independent — must
  stay legible on Journal cream, Atelier paper, and Expedition's dark
  background.
- **Semantic globals** (`success`, `destructive`): left as global
  tokens. A check is green and a delete is red regardless of theme.

## Scope notes

- `PhotosBlock` / `PhotoTile` / `PhotoLightbox` from `components/` are
  reused inside the per-theme gallery blocks; they aren't shared here
  because each theme wraps them differently.
