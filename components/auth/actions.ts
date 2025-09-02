// app/auth/actions.ts
"use server"

import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { z } from "zod"
import { AuthApiError } from "@supabase/supabase-js"
import { unstable_cache } from "next/cache"

// ===== Tipos =====
export type LoginResponse =
  | { ok: true; redirectTo: string }
  | {
      ok: false
      code: "VALIDATION" | "RATE_LIMIT" | "INVALID" | "UNCONFIRMED" | "FORBIDDEN" | "UNKNOWN"
      message: string
      retryAfter?: number
    }

// ===== Esquema de validación =====
const LoginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
  rememberMe: z.enum(["on", ""]).optional(),
  website: z.string().max(0).optional(), // honeypot mejorado
  next: z.string().optional(),
})

// ===== Rate Limiting con Map (mejorado) =====
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = { maxAttempts: 5, windowMs: 2 * 60 * 1000, blockMs: 5 * 60 * 1000 }

function checkRateLimit(key: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  
  // Limpiar entradas antiguas periódicamente
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) rateLimitStore.delete(k)
    }
  }
  
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs })
    return { ok: true }
  }
  
  if (entry.count >= RATE_LIMIT.maxAttempts) {
    const retryAfter = entry.resetAt - now
    return { ok: false, retryAfter }
  }
  
  entry.count++
  return { ok: true }
}

// ===== Cache de roles optimizado =====
const getUserRole = unstable_cache(
  async (userId: string) => {
    const supabase = await createClient()
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()
    
    return data?.role as string | null
  },
  ["user-role"],
  { revalidate: 300, tags: ["user-role"] } // Cache por 5 minutos
)

// ===== Helpers =====
function sanitizePath(path?: string): string | null {
  if (!path || !path.startsWith("/") || path.includes("//") || path.includes("@")) {
    return null
  }
  return path
}

function mapAuthError(error: unknown): { code: Extract<LoginResponse, { ok: false }>["code"]; message: string } {
  if (error instanceof AuthApiError) {
    switch (error.status) {
      case 401:
        return { code: "INVALID", message: "Credenciales incorrectas." }
      case 400:
        if (error.message.includes("not confirmed")) {
          return { code: "UNCONFIRMED", message: "Confirma tu correo electrónico." }
        }
        break
      case 429:
        return { code: "RATE_LIMIT", message: "Demasiados intentos." }
    }
  }
  return { code: "INVALID", message: "Error de autenticación." }
}

// ===== Action principal =====
export async function login(formData: FormData): Promise<LoginResponse> {
  try {
    // Parseo y validación
    const parsed = LoginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      rememberMe: formData.get("rememberMe") || "",
      website: formData.get("website") || "",
      next: formData.get("next") || "",
    })
    
    if (!parsed.success) {
      return { 
        ok: false, 
        code: "VALIDATION", 
        message: "Datos inválidos." 
      }
    }
    
    const { email, password, rememberMe, website, next } = parsed.data
    
    // Honeypot check
    if (website) {
      await new Promise(r => setTimeout(r, 500)) // Delay para confundir bots
      return { ok: false, code: "INVALID", message: "Error de validación." }
    }
    
    // Rate limiting
    const rlKey = `login:${email}`
    const rlCheck = checkRateLimit(rlKey)
    if (!rlCheck.ok) {
      return { 
        ok: false, 
        code: "RATE_LIMIT", 
        message: "Demasiados intentos.", 
        retryAfter: rlCheck.retryAfter 
      }
    }
    
    // Autenticación
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    })
    
    if (error) {
      const mapped = mapAuthError(error)
      return { ok: false, ...mapped }
    }
    
    if (!data.user) {
      return { 
        ok: false, 
        code: "INVALID", 
        message: "Error de autenticación." 
      }
    }
    
    // Verificar confirmación de email
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut()
      return { 
        ok: false, 
        code: "UNCONFIRMED", 
        message: "Confirma tu correo electrónico." 
      }
    }
    
    // Verificar rol (con cache)
    const role = data.user.user_metadata?.role || 
                 await getUserRole(data.user.id)
    
    if (!role || !["admin", "doctor", "asistente"].includes(role)) {
      await supabase.auth.signOut()
      return { 
        ok: false, 
        code: "FORBIDDEN", 
        message: "Sin permisos de acceso." 
      }
    }
    
    // Configurar cookies si Remember Me
    if (rememberMe === "on") {
      const cookieStore = await cookies()
      cookieStore.set("rememberMe", "1", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 días
        path: "/"
      })
    }
    
    // Limpiar rate limit en login exitoso
    rateLimitStore.delete(rlKey)
    
    // Determinar redirección
    const safePath = sanitizePath(next)
    const redirectTo = safePath || "/dashboard"
    
    return { ok: true, redirectTo }
    
  } catch (error) {
    console.error("Login error:", error)
    return { 
      ok: false, 
      code: "UNKNOWN", 
      message: "Error inesperado." 
    }
  }
}

// ===== Logout optimizado =====
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  const cookieStore = await cookies()
  cookieStore.delete("rememberMe")
  
  return { ok: true }
}