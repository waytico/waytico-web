"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// global-error.tsx replaces the root layout entirely when the root itself
// fails, so it must render <html> and <body> on its own.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#fafaf9",
          color: "#1a1a1a",
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: "32rem",
            textAlign: "center",
            padding: "2rem",
          }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(26,26,26,0.5)",
              marginBottom: "1.5rem",
            }}
          >
            Something went wrong
          </p>
          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: 700,
              lineHeight: 1.1,
              margin: "0 0 1rem",
            }}
          >
            We&apos;ve been notified
          </h1>
          <p
            style={{
              color: "rgba(26,26,26,0.7)",
              marginBottom: "1.5rem",
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred. Our team has been alerted automatically.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: "0.75rem",
                color: "rgba(26,26,26,0.4)",
                fontFamily: "ui-monospace, monospace",
                marginBottom: "1.5rem",
              }}
            >
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              backgroundColor: "#1a1a1a",
              color: "#fafaf9",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
