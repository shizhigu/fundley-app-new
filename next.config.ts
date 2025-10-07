import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'img.clerk.com',
      },
    ],
  },
  // Disable all timeouts for streaming responses
  // This prevents "Body Timeout Error" during long AI responses
  serverRuntimeConfig: {
    // API routes timeout - set to 0 for unlimited
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    return config;
  },
};

export default nextConfig;
