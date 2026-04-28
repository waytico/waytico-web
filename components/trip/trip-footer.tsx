import Link from 'next/link'
import Footer from '@/components/footer'
import type { OwnerBrand, OperatorContact } from './trip-types'

type Props = {
  owner: OwnerBrand
  operatorContact: OperatorContact
  /** Owner mode = render the full site Footer (product + company +
   *  legal + contact columns) so the operator has navigation back to
   *  the dashboard / profile / etc. Traveller mode = render a minimal
   *  one-line strip — operator brand and channels are already covered
   *  by the Contacts section above. */
  editable: boolean
}

export function TripFooter({ owner, operatorContact, editable }: Props) {
  if (editable) {
    // Owner mode: the standard site footer. Wraps it in a div with
    // id=site-footer so the floating TripCommandBar's
    // IntersectionObserver still finds the page bottom and fades out.
    return (
      <div id="site-footer">
        <Footer />
      </div>
    )
  }

  // Public mode: copyright on operator's name + a small Powered by
  // Waytico link. Nothing else — Contacts above covers reachability.
  const name = pick(operatorContact?.name, owner?.brand_name) || 'Operator'
  const year = new Date().getFullYear()

  return (
    <footer
      id="site-footer"
      className="w-full border-t border-border/50 bg-secondary"
    >
      <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center md:justify-between gap-2 text-xs text-muted-foreground">
        <span>
          © {year} {name}
        </span>
        <Link
          href="/"
          className="hover:text-foreground transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <span className="font-serif font-semibold text-foreground/70">
            Waytico
          </span>
        </Link>
      </div>
    </footer>
  )
}

function pick(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  if (typeof a === 'string' && a.trim().length > 0) return a
  if (typeof b === 'string' && b.trim().length > 0) return b
  return null
}
