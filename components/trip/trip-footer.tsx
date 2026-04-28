import Link from 'next/link'
import Footer from '@/components/footer'

type Props = {
  /** Owner mode = render the full site Footer (product + company +
   *  legal + contact columns) so the operator has navigation back to
   *  the dashboard / profile / etc. Traveller mode = render a minimal
   *  one-line strip — operator brand and channels are already covered
   *  by the Contacts section above, and an operator-name copyright
   *  inside a tiny grey strip would just feel like noise. */
  editable: boolean
}

export function TripFooter({ editable }: Props) {
  if (editable) {
    // Owner mode: the standard site footer. Wrapped in a div with
    // id=site-footer so the floating TripCommandBar's
    // IntersectionObserver still finds the page bottom and fades out.
    return (
      <div id="site-footer">
        <Footer />
      </div>
    )
  }

  // Public mode: just © year · Powered by Waytico, centred. Nothing
  // else — Contacts above covers reachability and brand attribution.
  const year = new Date().getFullYear()

  return (
    <footer
      id="site-footer"
      className="w-full border-t border-border/50 bg-secondary"
    >
      <div className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
        © {year} · Powered by{' '}
        <Link
          href="/"
          className="font-serif font-semibold text-foreground/70 hover:text-foreground transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Waytico
        </Link>
      </div>
    </footer>
  )
}
