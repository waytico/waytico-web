# Expedition theme

Cinematic dark cultural-safari. Bold uppercase Archivo display + Inter
body + JetBrains Mono labels. Ochre #d48a3f accent on a deep
near-black ground; cream text. Section markers as `§ NN — TITLE`.

## Block order (matches `trip-page-client.tsx` switch)

1. `nav.tsx` — sticky dark bar with `0N / SECTION` items, ochre on
   first; desktop only
2. `hero.tsx` — full-bleed dark photo with bottom-up gradient,
   ochre ticker, big DISPLAY title, lede + 4 stat columns,
   coords/region eyebrow, Activate (quoted only)
3. `overview.tsx` — § 01 BRIEFING, stacked headline finished with
   outline-stroke word, prose right + EXPEDITION LEAD credits card
4. `itinerary.tsx` — § 02 DAY LOG, full-bleed photo strip with huge
   DAY + outline-stroke day number on the left, title + summary on
   the right, segment table below as LOG ENTRIES
5. `included.tsx` — § 03 KIT LIST, two outlined panels (panel-grey
   include vs plain exclude), e-mono numbering on each line
6. `map.tsx` — § 04 CARTOGRAPHY, dark panel with topo-grid SVG +
   ochre concentric contour ellipses + ochre route between hollow
   ochre waypoint circles + WP.NN cards below
7. `gallery.tsx` — § 05 FIELD DOCUMENTS, cinematic feature plate +
   12-col PLATE.NN grid with film-look filter (saturate 0.9 +
   contrast 1.05)
8. `price.tsx` — § 06 COMMISSION, dark deep-bg + giant ochre
   display price + Activate (quoted only)
9. `ratings.tsx` — § 07 CONDITIONS / FIELD RATINGS, outlined panel
   cards each with a 5-SVG-star row (NOT progress bars; this is the
   only theme that uses stars)
10. `host.tsx` — pull-quote bio (only when both `host.name` and
    `host.bio` present; canvas embeds host into overview + operator)
11. `operator.tsx` — § 08 YOUR HOST, split portrait / dark right
    column with uppercase display name + bio + 4-up uppercase
    contact rows separated by thin rules
12. `cta.tsx` — § 09 NEXT MOVE, centered, "READY TO / MOVE OUT?"
    with outline-stroke second line, primary + ghost buttons,
    bordered share-proposal strip
13. `terms.tsx` — § 10 ARTICLES, desktop 1/3+2/3 with ART.NN labels;
    mobile +/− accordion; footer colophon
14. `sticky-cta.tsx` — mobile bottom bar, status='quoted' only,
    dark deep-bg + ochre price + ochre Activate

## Visibility rules

| Block       | Hidden when                                                   |
| ----------- | ------------------------------------------------------------- |
| Map         | no locations with valid coords                                |
| Gallery     | photos=0 for clients (owner sees empty state)                 |
| Ratings     | `ratings` is null or all 4 metrics null                       |
| Host        | `host.name` empty, OR `host.bio` empty (Atelier-style rule)   |
| Operator    | resolver produces no contact at all                           |
| Sticky CTA  | `status !== 'quoted'`                                         |

## How Expedition differs structurally from Journal/Atelier

- **All-uppercase typography** for headings, labels, and stats —
  this is the most visually distinctive trait.
- **Outline-stroke type** (`.e-day-outline` with
  `-webkit-text-stroke`) is reused across hero/overview/included/CTA
  for emphasis instead of italic accents.
- **Stars** for ratings instead of progress strips. Inline SVG, no
  external icon library.
- **Cinematic film filter** (`saturate(0.9) contrast(1.05)`) on
  gallery photos and on the day-strip background images.
- **Dark theme implications**: no Tailwind background-on-white
  shortcuts inside Expedition components — every panel uses
  `var(--e-panel)` or `var(--e-bg-deep)` directly. PhotoLightbox
  remains theme-independent (its own black overlay).

## Hero coords formatting

`formatCoords(lat, lng)` returns `48°51′N · 02°20′E` style strings.
Returns `''` when either value is null/undefined/non-finite, or when
both absolute values are below 0.01 (placeholder zero coords). The
hero hides the coord eyebrow gracefully in that case.

## TODOs (handled by later steps, not Expedition-specific)

- Scroll-spy on nav (step 7).
- Theme switcher control (step 7) — until then, `?theme=expedition`
  query param on `/t/[slug]` overrides the DB `design_theme`.
