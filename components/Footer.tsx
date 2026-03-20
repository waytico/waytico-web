import Link from "next/link"

export function Footer() {
  return (
    <footer className="w-full bg-gray-900 text-gray-400">
      <div className="max-w-[900px] mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <p className="text-white font-bold text-lg mb-2">BiteScout</p>
            <p className="text-sm leading-relaxed">
              AI-powered trophy fishing trip planner. Find, compare, and book verified operators worldwide.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-white text-sm font-semibold mb-3">Product</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Search
                </Link>
              </li>
              <li>
                <Link href="/upgrade" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-white text-sm font-semibold mb-3">Company</p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <a href="mailto:gofishing@bitescout.com" className="hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <p className="text-white text-sm font-semibold mb-3">Connect</p>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="mailto:gofishing@bitescout.com" className="hover:text-white transition-colors">
                  gofishing@bitescout.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-6 text-center text-xs">
          <p>&copy; 2026 BiteScout. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
