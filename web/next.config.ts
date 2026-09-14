import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "**.private.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "**.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.private.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "no-referrer-when-downgrade",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.protect.clerk.com https://*.clerk.com https://clerk.com https://*.clerk.accounts.dev https://*.accounts.dev https://*.clerk.dev https://clerk.maitri.app https://*.hcaptcha.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
              "frame-src 'self' https://challenges.cloudflare.com https://*.protect.clerk.com https://*.clerk.com https://clerk.com https://*.clerk.accounts.dev https://*.accounts.dev https://clerk.maitri.app https://*.hcaptcha.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
              "worker-src 'self' blob:",
              "child-src 'self' blob: https://challenges.cloudflare.com https://*.protect.clerk.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://challenges.cloudflare.com",
              "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com https://*.clerk.accounts.dev https://challenges.cloudflare.com https://*.vercel-storage.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org http://tile.openstreetmap.org http://*.tile.openstreetmap.org https://*.openstreetmap.org http://*.openstreetmap.org https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com http://*.basemaps.cartocdn.com https://*.cartocdn.com https://unpkg.com https://cdnjs.cloudflare.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "connect-src 'self' https://challenges.cloudflare.com https://*.cloudflare.com https://*.protect.clerk.com:* https://*.clerk.com:* https://*.clerk.com https://clerk.com https://api.clerk.com https://*.clerk.accounts.dev https://*.accounts.dev https://*.clerk.dev https://clerk.maitri.app https://*.hcaptcha.com https://www.google.com/recaptcha/ https://*.vercel-storage.com https://tile.openstreetmap.org https://*.tile.openstreetmap.org http://tile.openstreetmap.org http://*.tile.openstreetmap.org https://*.openstreetmap.org http://*.openstreetmap.org https://*.basemaps.cartocdn.com https://basemaps.cartocdn.com https://*.cartocdn.com https://unpkg.com",
              "frame-ancestors 'none'",
              "form-action 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.accounts.dev https://clerk.maitri.app https://clerk.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

