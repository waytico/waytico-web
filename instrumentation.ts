// Next.js instrumentation hook (App Router).
// Loads the correct Sentry config for the active runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Optional: forwards request errors caught by Next.js to Sentry.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
