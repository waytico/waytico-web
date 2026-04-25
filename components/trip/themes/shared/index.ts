// Shared trip-page blocks — the parts that aren't theme-styled.
//
// Per-theme blocks (hero, overview, itinerary, included-excluded, map,
// gallery, price, ratings, host, operator, cta, terms, nav, sticky-cta)
// live in `../{theme}/*.tsx`. Each theme renders those itself because
// the visual language differs enough that CSS-vars-only theming wasn't
// rich enough; an early experiment with shared overview/included/
// locations/photos/terms blocks was cut in step 3c.1 and removed here
// in step 7.5 cleanup.
//
// Owner-only surfaces (eye-toggles, delete buttons, drop-zones, upload
// triggers) inside the shared blocks below use `--owner-chrome-*` tokens
// so they stay legible on any theme, including Expedition's dark ground.

export { TasksBlock } from './tasks'
export { DocumentsBlock } from './documents'
export { WhatToBringBlock } from './what-to-bring'
