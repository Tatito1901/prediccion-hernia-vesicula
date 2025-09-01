import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

// Devuelve el cliente de Supabase para middleware y la respuesta con cookies aplicadas
export const createMiddlewareClient = (request: NextRequest) => {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    },
  )

  return { supabase, response }
}

// Compat (si algún código antiguo importa createClient)
export const createClient = (request: NextRequest) => {
  const { response } = createMiddlewareClient(request)
  return response
}

