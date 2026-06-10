import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // Allow dev access from devices on the local network (e.g., phone on same WiFi)
  // allowedDevOrigins: ['192.168.1.11', 'localhost'],

  devIndicators: false,

  // Hides "X-Powered-By: Next.js" from response headers
  poweredByHeader: false,

  // Disables source maps in production build
  // (source maps expose your full source code in DevTools)
  productionBrowserSourceMaps: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevents clickjacking attacks
          { key: "X-Frame-Options", value: "DENY" },

          // Stops browser from guessing file types (MIME sniffing)
          { key: "X-Content-Type-Options", value: "nosniff" },

          // Forces HTTPS for 1 year, includes subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },

          // Controls what browser features this site can use
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },

          // Content Security Policy — controls allowed resource origins
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              isDev
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com"
                : "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://accounts.google.com",
              "img-src 'self' data: blob: https://lh3.googleusercontent.com",
              "connect-src 'self' https://accounts.google.com https://apis.google.com",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-src 'self' https://accounts.google.com",
            ].join("; "),
          },

          // Prevents the browser from sending the full referrer to external sites
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  // Lock down remote image domains — no wildcards allowed
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
