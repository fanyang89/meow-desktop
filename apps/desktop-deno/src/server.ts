import type { App } from 'h3'
import { extname, isAbsolute, relative, resolve } from 'node:path'
import { toWebHandler } from 'h3'

const MIME: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: http: https:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' http: https: ws: wss:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join('; ')

export interface DesktopServerOptions {
  uiDir: string
  agentRouter: App
  controlToken: string
  clashUrl: string
  clashSecret: string
  platform: string
}

function bridgeScript(options: DesktopServerOptions): string {
  const state = JSON.stringify({
    controlToken: options.controlToken,
    endpoint: { url: options.clashUrl, secret: options.clashSecret },
    platform: options.platform,
  })
  return `(() => {
  const state = ${state};
  window.__METACUBEXD_CONFIG__ = {
    defaultBackendURL: state.endpoint.url,
    controlToken: state.controlToken,
  };
  window.metacubexd = {
    isDesktop: true,
    nativeFrame: true,
    platform: state.platform,
    control: { base: window.location.origin + '/api/control', token: state.controlToken },
    endpoint: state.endpoint,
    onBackendInvalidate(callback) {
      const listener = (event) => callback(event.detail || {});
      window.addEventListener('meow:backend-invalidate', listener);
      return () => window.removeEventListener('meow:backend-invalidate', listener);
    },
  };
})();\n`
}

async function staticResponse(
  request: Request,
  uiDir: string,
): Promise<Response> {
  const url = new URL(request.url)
  let pathname: string
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const root = resolve(uiDir)
  const requested =
    pathname === '/' || pathname.endsWith('/')
      ? 'index.html'
      : pathname.slice(1)
  let candidate = resolve(root, requested)
  const fromRoot = relative(root, candidate)
  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
    return new Response('Not Found', { status: 404 })
  }

  let bytes: Uint8Array
  try {
    const stat = await Deno.stat(candidate)
    if (!stat.isFile) throw new Deno.errors.NotFound()
    bytes = await Deno.readFile(candidate)
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error
    candidate = resolve(root, 'index.html')
    bytes = await Deno.readFile(candidate)
  }

  const headers = new Headers({
    'content-type':
      MIME[extname(candidate).toLowerCase()] ?? 'application/octet-stream',
    'x-content-type-options': 'nosniff',
  })
  if (extname(candidate).toLowerCase() === '.html') {
    headers.set('content-security-policy', CSP)
  }
  const body = request.method === 'HEAD' ? null : Uint8Array.from(bytes).buffer
  return new Response(body, { headers })
}

export function createDesktopHandler(options: DesktopServerOptions) {
  const agentHandler = toWebHandler(options.agentRouter)
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/control')) {
      return await agentHandler(request)
    }
    if (url.pathname === '/config.js') {
      return new Response(bridgeScript(options), {
        headers: {
          'cache-control': 'no-store',
          'content-type': 'text/javascript; charset=utf-8',
          'x-content-type-options': 'nosniff',
        },
      })
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 })
    }
    return await staticResponse(request, options.uiDir)
  }
}
