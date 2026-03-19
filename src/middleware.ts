import type { NextRequest } from 'next/server'
import { proxy, config as proxyConfig } from './proxy'

export default function middleware(request: NextRequest) {
  return proxy(request)
}

export const config = proxyConfig

