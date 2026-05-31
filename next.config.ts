import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.80"],
  // Ensure the daily-images folder is bundled with server functions so the
  // dashboard can read its contents at runtime on Vercel.
  outputFileTracingIncludes: {
    "/*": ["./public/daily-images/**"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.fifa.com",
      },
      {
        protocol: "https",
        hostname: "digitalhub.fifa.com",
      },
    ],
  },
};

export default nextConfig;
