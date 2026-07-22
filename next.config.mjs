/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // konva's Node build optionally requires the native `canvas` package, which we
      // don't install (the deck editor is client-only, loaded via dynamic ssr:false).
      // Without this, webpack's server-side compile pass fails to resolve it.
      config.externals = [...(config.externals ?? []), "canvas"];
    }
    return config;
  },
};

export default nextConfig;
