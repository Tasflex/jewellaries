/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || "http://127.0.0.1:8300";

const nextConfig = {
  // Stamped at build time: the sitemap uses it as an honest "last modified" date.
  env: { BUILD_DATE: new Date().toISOString() },
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1200],
  },
  async rewrites() {
    // The browser talks to /api/*; Next forwards it to the Rust API on the same host.
    return [{ source: "/api/:path*", destination: `${API_URL}/v1/:path*` }];
  },
  async redirects() {
    // renamed products keep their search ranking and any shared links
    return [{ source: "/product/rosso-signet-ring", destination: "/product/scarlet-signet-ring", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
