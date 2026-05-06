import { clerkMiddleware } from '@clerk/nextjs/server'

// Pass-through middleware: clerkMiddleware injects the session into requests
// (so useAuth/auth() work in pages and API routes) but does NOT gate any
// path. Authentication is enforced:
//  - on the client (useAuth guard in /dashboard, router.replace to /sign-in)
//  - on the backend (requireAuth middleware on /api/projects)
//
// This avoids two problems:
//  - Clerk dev-mode "protect-rewrite" handshake loop (HTTP 508 on Render)
//    when running with test keys (pk_test_*, sk_test_*).
//  - Unknown paths returning 508 instead of 404 because they didn't appear
//    in a whitelist — now anything not matched by a route falls through
//    to Next.js's own 404 handler (app/not-found.tsx).
export default clerkMiddleware()

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
