import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="w-full border-t border-border/50 bg-background py-6">
      <div className="max-w-4xl mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
        <Link href="/" className="font-serif font-semibold text-foreground/70 hover:text-foreground transition-colors">
          Waytico
        </Link>
        <span>© {new Date().getFullYear()} Waytico</span>
      </div>
    </footer>
  )
}
