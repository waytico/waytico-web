import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Admin routes require an authenticated session. The is_admin allowlist
// check runs deeper (backend requireAdmin and the admin layout's
// server-side gate) — this matcher only needs to block anonymous
// access at the edge so the shell HTML is never delivered to a
// signed-out visitor. Stage 11 Block A.
const isAdminRoute = createRouteMatcher(['/admin', '/admin/(.*)'])

// Pass-through Clerk middleware: injects session into requests so
// useAuth/auth() work in pages and API routes. Authentication
// enforcement layers, top to bottom:
//
//   - /admin/* — this middleware redirects anonymous visitors to
//     /sign-in (manual NextResponse.redirect, NOT auth.protect();
//     auth.protect() triggers a Clerk dev-mode "protect-rewrite"
//     handshake loop visible to Render as HTTP 508 when running
//     with test keys pk_test_* / sk_test_*). The admin layout then
//     additionally enforces the ADMIN_EMAILS allowlist.
//
//   - /dashboard — client guard (useAuth in the page) routes
//     anonymous visitors to /sign-in.
//
//   - /api/projects/* and other backend routes — requireAuth
//     middleware on the backend.
//
// Other paths fall through to Next's own 404 handler. The matcher
// at the bottom skips static assets and _next.
export default clerkMiddleware((auth, req) => {
  if (isAdminRoute(req)) {
    const { userId } = auth()
    if (!userId) {
      const url = new URL('/sign-in', req.url)
      url.searchParams.set('redirect_url', req.nextUrl.pathname)
      return NextResponse.redirect(url)
    }
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
