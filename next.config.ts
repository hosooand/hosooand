import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options',  value: 'nosniff'        },
        { key: 'X-Frame-Options',         value: 'DENY'           },
        { key: 'X-XSS-Protection',        value: '1; mode=block'  },
        { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
      ],
    },
    {
      // 서비스 워커 캐시 방지
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
      ],
    },
  ],
}

export default nextConfig