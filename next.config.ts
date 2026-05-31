import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.80"],
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
