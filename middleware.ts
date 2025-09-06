// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// === Config básica ===
const IS_DEV = process.env.NODE_ENV !== 'production'

// Rutas públicas (sin auth). En dev, dejamos /admision y /survey abiertos.
const PUBLIC_ROUTES = IS_DEV
  ? ['/', '/login', '/reset-password', '/auth/callback', '/auth/confirm', '/admision', '/survey', '/encuesta']
  : ['/', '/login', '/reset-password', '/auth/callback', '/auth/confirm', '/encuesta']

// Rutas que NO deben pasar por lógica de auth/redirecciones
const SKIP_ROUTES_PREFIX = ['/api/', '/_next/', '/_actions', '/favicon.ico', '/manifest.json']

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true
  return PUBLIC_ROUTES.some((route) => {
    if (route === '/') return false
    return pathname === route || pathname.startsWith(`${route}/`)
  })
}

function isValidRedirect(path: string): boolean {
  try {
    if (!path.startsWith('/') || path.startsWith('//')) return false
    if (path.includes('://')) return false
    if (path.includes('@')) return false
    if (path.includes('\\')) return false
    return true
  } catch {
    return false
  }
}

// Cache liviano en edge (compartido por instancia). TTL corto.
const sessionCache = new Map<string, { expires: number; hasSession: boolean }>()
const SESSION_CACHE_TTL = 30 * 1000 // 30s

// Obtiene una IP del request sin depender de propiedades no tipadas
function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip')
  return real || ''
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // 0) Saltar APIs/estáticos cuanto antes
  if (SKIP_ROUTES_PREFIX.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const isPublic = isPublicRoute(pathname)

  // 1) Crea una única respuesta "forward" y clona headers (importante en middleware)
  let response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  })

  // 2) Short-circuit: si la ruta es pública y NO es ('/' o '/login'),
  // no necesitamos sesión para nada — devolvemos de inmediato.
  if (isPublic && pathname !== '/' && pathname !== '/login') {
    return response
  }

  // 3) Prepara Supabase SSR. ¡Nunca mutar request.cookies aquí!
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        // Escribe SOLO en response (no toques request.cookies)
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  // 4) Cache de sesión para reducir llamadas
  const accessToken = request.cookies.get('sb-access-token')?.value
  const cacheKey = accessToken ? `atk:${accessToken.slice(0, 24)}` : `anon:${getClientIp(request) || '0'}`
  const cached = sessionCache.get(cacheKey)

  let hasValidSession = false
  if (cached && cached.expires > Date.now()) {
    hasValidSession = cached.hasSession
  } else {
    const { data: { user }, error } = await supabase.auth.getUser()
    hasValidSession = !error && !!user
    sessionCache.set(cacheKey, {
      expires: Date.now() + SESSION_CACHE_TTL,
      hasSession: hasValidSession,
    })
    // Limpieza simple
    if (sessionCache.size > 200) {
      const now = Date.now()
      for (const [k, v] of sessionCache.entries()) {
        if (v.expires < now) sessionCache.delete(k)
      }
    }
  }

  // 5) Lógica de públicas ('/' y '/login' pueden redirigir si ya hay sesión)
  if (isPublic) {
    if (hasValidSession && (pathname === '/' || pathname === '/login')) {
      const nextParam = searchParams.get('next')
      if (nextParam && isValidRedirect(nextParam)) {
        return NextResponse.redirect(new URL(nextParam, request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return response
  }

  // 6) Rutas protegidas
  if (!hasValidSession) {
    const loginUrl = new URL('/', request.url)
    if (pathname !== '/' && pathname !== '/dashboard') {
      loginUrl.searchParams.set('next', pathname)
    }
    loginUrl.searchParams.set('error', 'session_expired')
    return NextResponse.redirect(loginUrl)
  }

  // 7) Usuario autenticado: headers de seguridad + preload (seguro)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (pathname === '/dashboard') {
    // Hint de preload; apunta a una ruta que el matcher no intercepte.
    response.headers.set('Link', '</api/dashboard/metrics>; rel=preload; as=fetch')
  }

  return response
}

// 8) Matcher más estricto: excluye API desde aquí para no entrar al middleware.
export const config = {
  matcher: [
    // Excluye API, estáticos e imágenes comunes; evita que middleware intercepte recursos innecesarios
    '/((?!api|_next/static|_next/image|_actions|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
}
