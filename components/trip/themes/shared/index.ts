// Shared trip-page blocks — the non-theme-specific parts of a proposal.
//
// Each of these is rendered identically across Journal / Expedition / Atelier;
// the visual differentiation lives in `--theme-*` tokens scoped by ThemeRoot.
//
// Owner-only surfaces (eye-toggles, delete buttons, drop-zones, upload
// triggers) use `--owner-chrome-*` tokens so they stay legible on any theme,
// including Expedition's dark background.
//
// Per-theme blocks (hero, days, price, ratings, host, operator, cta, nav)
// live in `../{theme}/*.tsx` and compose these shared blocks in the same
// order across every theme.

export { OverviewBlock } from './overview'
export { IncludedExcludedBlock } from './included-excluded'
export { LocationsBlock } from './locations'
export { PhotosGalleryBlock } from './photos'
export { TasksBlock } from './tasks'
export { DocumentsBlock } from './documents'
export { TermsBlock } from './terms'
export { WhatToBringBlock } from './what-to-bring'
