# Journal theme

Per-theme blocks for the **Journal** trip page layout. Composed by
`trip-page-client.tsx` (integration in TZ-5 step 3c.2) around shared blocks
from `../shared/`.

## Block order

1. `nav.tsx` — sticky section nav (desktop only)
2. `hero.tsx` — full-bleed hero, brand strip, editable stats, Activate CTA
3. `overview.tsx` — Chapter I · two-column with dropcap
4. `itinerary.tsx` — Chapter II · alternating flip days, per-day photos
5. `included.tsx` — Chapter III · numbered include/exclude rules
6. `map.tsx` — Chapter IV · hand-sketch SVG map with real coords
7. `gallery.tsx` — Chapter V · asymmetric 12-col magazine grid
8. `price.tsx` — Chapter VI · dark bg, big number, Activate CTA
9. `ratings.tsx` — Chapter VII · 4 horizontal bars (hidden if all null)
10. `host.tsx` — Chapter VIII · portrait + name + bio (hidden if no name)
11. `operator.tsx` — contact grid + brand block (hidden if no contact)
12. `cta.tsx` — Chapter IX · "Your move" + Share row
13. `terms.tsx` — Colophon · numbered terms on dark bg
14. `sticky-cta.tsx` — mobile bottom bar (status='quoted' only)

Shared blocks used from `../shared/` on active trips: `tasks`, `documents`.

## Visibility rules (per TZ-5)

| Block     | Hidden when…                                                  |
| --------- | ------------------------------------------------------------- |
| Map       | `locations` filtered to valid coords is empty                 |
| Gallery   | `photos=0` for clients; shows owner empty-state otherwise     |
| Ratings   | all 4 metrics are null                                        |
| Host      | `host.name` is empty/null                                     |
| Operator  | `hasAnyContact(resolved)` is false (even `owner.email` empty) |
| Sticky CTA| `status !== 'quoted'`                                         |

## Editable surfaces

All editable fields use `EditableField` from `components/editable/`. Title
in hero is a single plain string per TZ-5 note (b) — we intentionally don't
auto-split on " in " for the `<em>` decoration.

## Owner chrome

Drag-drop zones, delete buttons, and upload triggers use the
`--owner-chrome-*` token group, not `--j-*`. That keeps them readable when
rendered over Journal's dark sections (price, terms).

## TODOs for later steps

- **Scroll-spy on nav** — step 7 polish. Currently just anchor jumps.
- **Alt sticky bar on `active`** — show "Message operator" when contact is
  present and trip is active. Intentionally deferred to step 7.
- **Number-to-words price heading** — canvas has "three thousand four hundred
  fifty" as the Investment h2. We replaced with "All told." Full spelling
  across currencies / magnitudes is its own feature; if the literary touch
  is missed, implement `priceInWords(n)` in `lib/trip-format.ts`.
- **Compass "20 KM" scale** — SVG scale bar is decorative (shows "~" as
  we can't compute a real kilometer scale from the bounding box without
  additional geodesy). Replace if real distances become important.
