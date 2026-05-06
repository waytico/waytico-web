import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
}

// Sentry build-time wrapper. Source-map upload is disabled until a
// SENTRY_AUTH_TOKEN env var is provisioned — runtime error capture works
// either way; without source maps stack traces just stay minified.
export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
