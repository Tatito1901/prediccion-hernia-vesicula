import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Aplicar cache para todas las rutas de API de solo lectura (GET)
  if (request.nextUrl.pathname.startsWith('/api/') && request.method === 'GET') {
    // Configuración de caché para mejorar rendimiento
    response.headers.set('Cache-Control', 
      'public, max-age=60, s-maxage=60, stale-while-revalidate=300')
  }

  // Optimización de seguridad
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  return response
}

// Aplicar middleware solo a rutas específicas
export const config = {
  matcher: [
    // Rutas de API
    '/api/:path*',
  ],
}
