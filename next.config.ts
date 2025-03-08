import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['ucarecdn.com'], // Para permitir imagens do Uploadcare
    unoptimized: true
  },
  typescript: {
    ignoreBuildErrors: false
  }
};

export default nextConfig;
