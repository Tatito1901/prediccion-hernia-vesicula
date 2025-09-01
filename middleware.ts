import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/utils/supabase/middleware'

// Supabase SSR-aware middleware
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  const { supabase, response } = createMiddlewareClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPage = pathname === '/login'
  const protectedPrefixes = [
    '/admision',
    '/dashboard',
    '/estadisticas',
    '/pacientes',
    '/perfil',
    '/survey',
    '/encuesta',
  ]
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))

  // Authorization: only allow specific roles
  const allowedRoles = (process.env.ALLOWED_ROLES?.split(',').map(r => r.trim().toLowerCase()) ?? ['admin', 'doctor', 'asistente'])

  if (isProtected && !user) {
    const next = encodeURIComponent(request.nextUrl.pathname + (request.nextUrl.search || ''))
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url))
  }

  // If authenticated but not authorized by role, block access
  if (isProtected && user) {
    // Preferir rol desde metadatos del token (si existe) para evitar consulta
    const roleFromMetadata = ((user as any)?.user_metadata?.role || (user as any)?.app_metadata?.role) as string | undefined
    const normalizedMetaRole = (roleFromMetadata || '').toString().toLowerCase()
    if (normalizedMetaRole) {
      const isAllowedMeta = allowedRoles.includes(normalizedMetaRole)
      if (!isAllowedMeta) {
        const next = encodeURIComponent(request.nextUrl.pathname + (request.nextUrl.search || ''))
        return NextResponse.redirect(new URL(`/login?error=forbidden&next=${next}`, request.url))
      }
      // Rol permitido por metadatos → no hace falta consultar DB
    } else {
      // Fallback a DB si no hay rol en metadatos
      const { data: profileRow, error: roleError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = ((profileRow?.role as string | null) || '').toString().toLowerCase()
      const isAllowed = role && allowedRoles.includes(role)

      if (roleError || !isAllowed) {
        const next = encodeURIComponent(request.nextUrl.pathname + (request.nextUrl.search || ''))
        return NextResponse.redirect(new URL(`/login?error=forbidden&next=${next}`, request.url))
      }
    }
  }

  if (isAuthPage && user && !['forbidden', 'access_denied'].includes((searchParams.get('error') || '').toLowerCase())) {
    const rawNext = searchParams.get('next') || '/dashboard'
    const isInternal = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('://')
    const next = isInternal ? rawNext : '/dashboard'
    return NextResponse.redirect(new URL(next, request.url))
  }

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
}

// Run middleware only for protected pages and login
export const config = {
  matcher: [
    '/login',
    '/admision/:path*',
    '/dashboard/:path*',
    '/estadisticas/:path*',
    '/pacientes/:path*',
    '/perfil/:path*',
    '/survey/:path*',
    '/encuesta/:path*',
  ],
}

