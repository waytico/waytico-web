import Link from 'next/link'

export default function Header() {
  return (
    <header className="w-full border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold font-serif tracking-tight hover:opacity-80 transition-opacity">
          Waytico
        </Link>
        <button className="text-foreground/70 hover:text-foreground transition-colors font-medium">
          Log in
        </button>
      </div>
    </header>
  )
}
