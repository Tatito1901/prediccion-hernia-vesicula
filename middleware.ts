import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Supabase SSR-aware middleware
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

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
  ]
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))

  // Authorization: only allow specific roles
  const allowedRoles = (process.env.ALLOWED_ROLES?.split(',').map(r => r.trim().toLowerCase()) ?? ['admin', 'doctor', 'nurse'])

  if (isProtected && !user) {
    const next = encodeURIComponent(request.nextUrl.pathname + (request.nextUrl.search || ''))
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url))
  }

  // If authenticated but not authorized by role, block access
  if (isProtected && user) {
    const { data: roleRow, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = (roleRow?.role || '').toString().toLowerCase()
    const isAllowed = role && allowedRoles.includes(role)

    if (roleError || !isAllowed) {
      const next = encodeURIComponent(request.nextUrl.pathname + (request.nextUrl.search || ''))
      return NextResponse.redirect(new URL(`/login?error=forbidden&next=${next}`, request.url))
    }
  }

  if (isAuthPage && user) {
    const next = searchParams.get('next') || '/admision'
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
  ],
}

