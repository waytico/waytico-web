/**
 * Trip page v2 — segment layout.
 *
 * Nested under app/layout.tsx — inherits ClerkProvider, fonts, Toaster
 * and all root chrome from the root. Sole purpose: scope-import the
 * v2 stylesheet so /v2/t/* routes get v2 theme tokens without leaking
 * them into the legacy /t/[slug] route.
 *
 * Returning a Fragment is fine: only the root layout is required to
 * emit <html>/<body>.
 */
import '@/styles/globals-v2.css'

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
