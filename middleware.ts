import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Public routes - accessible without auth
const isPublicRoute = createRouteMatcher([
  '/',
  '/about',
  '/trip(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/chat',
  '/api/plan-info',
  '/api/webhooks(.*)',
  '/api/coverage',
  '/robots.txt',
  '/sitemap.xml',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
