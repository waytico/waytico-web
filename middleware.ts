import { NextResponse, type NextRequest } from 'next/server'
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/t/(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/dashboard(.*)',
  '/api(.*)',
  '/about',
  '/help(.*)',
  '/how-it-works',
  '/pricing',
  '/privacy',
  '/terms',
  '/personal-information',
  '/cookies',
])

// Stage 5.5 routing change: the old /v2/t/<slug> route was retired together
// with components/trip/* and styles/themes.css. Anyone landing on that URL
// (a stale share-link, a bookmark from the parallel-fork era) gets a clean
// 308 to /t/<slug> with the same slug + querystring preserved.
const V2_TRIP = /^\/v2\/t\/([^/]+)(\/.*)?$/

export default clerkMiddleware((auth, request: NextRequest) => {
  const m = request.nextUrl.pathname.match(V2_TRIP)
  if (m) {
    const url = request.nextUrl.clone()
    url.pathname = `/t/${m[1]}${m[2] ?? ''}`
    return NextResponse.redirect(url, 308)
  }
  if (!isPublicRoute(request)) {
    auth().protect()
  }
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
