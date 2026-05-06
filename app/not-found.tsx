import Link from "next/link";
import Footer from "@/components/footer";
import Header from "@/components/header";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl text-center space-y-6">
          <p className="text-sm uppercase tracking-[0.2em] text-foreground/50">404</p>
          <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight leading-[1.1] text-balance">
            Page not found
          </h1>
          <p className="text-base text-foreground/70 leading-relaxed max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
