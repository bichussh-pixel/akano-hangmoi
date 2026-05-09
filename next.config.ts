import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'kalodata.com' },
      { protocol: 'https', hostname: 'cf.shopee.vn' },
      { protocol: 'https', hostname: 'down-vn.img.susercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
