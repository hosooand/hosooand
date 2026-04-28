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
      // HTML 페이지에만 no-cache 적용 (즐겨찾기 진입 시 stale chunk 참조 방지)
      // _next/static, 이미지·폰트 등 content-hashed 정적 자산은 제외 → 캐시 유지
      source: '/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|icons/|manifest\\.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css|woff|woff2|ttf|ico|json)$).*)',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
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