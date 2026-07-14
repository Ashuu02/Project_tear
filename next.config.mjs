/** @type {import('next').NextConfig} */
const nextConfig = {
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
