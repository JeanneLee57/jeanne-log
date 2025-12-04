import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.jeannelee.me',
      },
    ],
  },
};

export default nextConfig;
