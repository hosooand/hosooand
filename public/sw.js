const CACHE_NAME = 's-body-v1'

// 오프라인에서도 보여줄 핵심 리소스
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/duck.png',
  '/logo.png',
]

// 설치: 핵심 리소스 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// 활성화: 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// fetch: Network First → Cache Fallback
self.addEventListener('fetch', (event) => {
  // API / Supabase 요청은 캐시하지 않음
  const url = new URL(event.request.url)
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('googleapis.com') ||
    event.request.method !== 'GET'
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // 성공 시 캐시 업데이트
        const clone = res.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return res
      })
      .catch(() =>
        // 네트워크 실패 시 캐시에서
        caches.match(event.request).then(
          (cached) => cached ?? caches.match('/offline')
        )
      )
  )
})