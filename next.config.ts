import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
