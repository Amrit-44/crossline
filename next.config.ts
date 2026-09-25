import type { NextConfig } from "next";

/**
 * No rewrites needed: the browser talks to the realtime Worker directly.
 * Locally that's http://127.0.0.1:8787 (see `realtimeBaseUrl()`); in
 * production it's NEXT_PUBLIC_REALTIME_URL. The Worker answers CORS itself.
 */
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Don't let the game be framed by hostile sites (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Block MIME sniffing; assets declare their own types.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Minimal referrer; room URLs never leak to third parties.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Lock down powerful browser features the game never uses.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
