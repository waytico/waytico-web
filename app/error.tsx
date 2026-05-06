"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Footer from "@/components/footer";
import Header from "@/components/header";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Forward to Sentry so we get a notification email.
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl text-center space-y-6">
          <p className="text-sm uppercase tracking-[0.2em] text-foreground/50">
            Something went wrong
          </p>
          <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight leading-[1.1] text-balance">
            We&apos;ve been notified
          </h1>
          <p className="text-base text-foreground/70 leading-relaxed max-w-md mx-auto">
            An unexpected error occurred. Our team has been alerted automatically and
            will look into it. You can try again or head back home.
          </p>
          {error.digest && (
            <p className="text-xs text-foreground/40 font-mono">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-md bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-foreground/20 text-foreground px-5 py-2.5 text-sm font-medium hover:bg-foreground/5 transition-colors"
            >
              Back to home
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
