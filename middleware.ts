import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// All routes are public at the middleware level.
// Authentication is enforced:
//  - on the client (useAuth guard in /dashboard, router.replace to /sign-in)
//  - on the backend (requireAuth middleware on /api/projects)
// This avoids Clerk dev-mode "protect-rewrite" handshake loops (HTTP 508 on Render)
// when running with test keys (pk_test_*, sk_test_*).
const isPublicRoute = createRouteMatcher([
  '/',
  '/t/(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/dashboard(.*)',
  '/api(.*)',
])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
