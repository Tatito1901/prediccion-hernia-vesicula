// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/reset-password', '/auth/callback', '/auth/confirm']
const API_ROUTES = ['/api/', '/_next/', '/favicon.ico']

// Cache de sesiones en edge runtime (con TTL corto)
const sessionCache = new Map<string, { expires: number; hasSession: boolean }>()
const SESSION_CACHE_TTL = 30 * 1000 // 30 segundos

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Skip API routes y archivos estáticos
  if (API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Crear response inicial
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Configurar cliente Supabase para edge runtime
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Check cache first
  const cacheKey = request.cookies.get('sb-access-token')?.value || 'anonymous'
  const cached = sessionCache.get(cacheKey)
  
  let hasValidSession = false
  
  if (cached && cached.expires > Date.now()) {
    hasValidSession = cached.hasSession
  } else {
    // Verificar sesión
    const { data: { user }, error } = await supabase.auth.getUser()
    hasValidSession = !error && !!user
    
    // Guardar en cache
    sessionCache.set(cacheKey, {
      expires: Date.now() + SESSION_CACHE_TTL,
      hasSession: hasValidSession
    })
    
    // Limpiar cache viejo periódicamente
    if (sessionCache.size > 100) {
      const now = Date.now()
      for (const [key, value] of sessionCache.entries()) {
        if (value.expires < now) {
          sessionCache.delete(key)
        }
      }
    }
  }

  // Rutas públicas
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    // Si hay sesión válida y está en login, redirigir a dashboard
    if (hasValidSession && pathname === '/login') {
      const dashboardUrl = new URL('/dashboard', request.url)
      
      // Preservar el next param si existe
      const next = searchParams.get('next')
      if (next && isValidRedirect(next)) {
        return NextResponse.redirect(new URL(next, request.url))
      }
      
      return NextResponse.redirect(dashboardUrl)
    }
    return response
  }

  // Rutas protegidas - requieren autenticación
  if (!hasValidSession) {
    const loginUrl = new URL('/login', request.url)
    
    // Guardar la ruta original para redirigir después del login
    if (pathname !== '/' && pathname !== '/dashboard') {
      loginUrl.searchParams.set('next', pathname)
    }
    
    // Añadir código de error si es apropiado
    loginUrl.searchParams.set('error', 'session_expired')
    
    return NextResponse.redirect(loginUrl)
  }

  // Usuario autenticado en ruta protegida
  // Añadir headers de seguridad
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Preload hints para recursos críticos del dashboard
  if (pathname === '/dashboard') {
    response.headers.set(
      'Link',
      '</api/dashboard/stats>; rel=preload; as=fetch, ' +
      '</api/dashboard/recent>; rel=preload; as=fetch'
    )
  }

  return response
}

// Validar redirecciones para evitar open redirects
function isValidRedirect(path: string): boolean {
  try {
    // Debe empezar con / y no ser //
    if (!path.startsWith('/') || path.startsWith('//')) return false
    
    // No debe contener ://
    if (path.includes('://')) return false
    
    // No debe contener @ (evita user@host)
    if (path.includes('@')) return false
    
    // No debe contener backslash
    if (path.includes('\\')) return false
    
    return true
  } catch {
    return false
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}