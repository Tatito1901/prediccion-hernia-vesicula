// app/auth/actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { cookies, headers } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { z } from "zod"
import crypto from "node:crypto"
import { AuthApiError } from "@supabase/supabase-js"

// ===== Debug toggle =====
const DEBUG_AUTH =
  process.env.DEBUG_AUTH === "true" ||
  process.env.DEBUG_AUTH === "1" ||
  process.env.NEXT_PUBLIC_DEBUG_AUTH === "true"

function dlog(event: string, payload?: Record<string, unknown>) {
  if (DEBUG_AUTH) {
    try {
      console.info("[AUTH_LOGIN]", event, payload ?? {})
    } catch {}
  }
}

// ===== Tipos de retorno =====
export type LoginResponse =
  | { ok: true; redirectTo: string }
  | {
      ok: false
      code: "VALIDATION" | "RATE_LIMIT" | "INVALID" | "UNCONFIRMED" | "FORBIDDEN" | "UNKNOWN"
      message: string
      retryAfter?: number
    }

// ===== Esquema Zod =====
const LoginSchema = z
  .object({
    email: z.string().email({ message: "Por favor, ingrese un correo electrónico válido." }).trim().toLowerCase(),
    password: z.string().min(8, { message: "La contraseña debe tener al menos 8 caracteres." }).max(128, {
      message: "La contraseña es demasiado larga.",
    }),
    rememberMe: z.union([z.literal("on"), z.literal("")]).optional(),
    company: z.string().max(0).optional(), // honeypot
    next: z.string().optional(),
  })
  .strict()

// ===== Rate limit in-memory (migrar a Redis/Upstash en multi-instancia) =====
type RL = { count: number; firstAt: number; blockedUntil?: number }
const GLOBAL: any = globalThis as any
if (!GLOBAL.__loginRL__) GLOBAL.__loginRL__ = new Map<string, RL>()
const loginRL: Map<string, RL> = GLOBAL.__loginRL__

const MAX_ATTEMPTS = 5
const WINDOW_MS = 2 * 60 * 1000 // 2 min
const BLOCK_MS = 10 * 60 * 1000 // 10 min

function rlKey(ip: string, email: string) {
  const h = crypto.createHash("sha256").update(`${ip}|${email}`).digest("hex")
  return h
}

async function getIP() {
  const h = await headers()
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "0.0.0.0"
  return ip
}

function checkRateLimit(ip: string, email: string): { ok: true } | { ok: false; retryAfter: number } {
  const key = rlKey(ip, email)
  const now = Date.now()
  const entry = loginRL.get(key) || { count: 0, firstAt: now, blockedUntil: undefined }

  if (entry.blockedUntil && entry.blockedUntil > now) {
    return { ok: false, retryAfter: entry.blockedUntil - now }
  }

  if (now - entry.firstAt > WINDOW_MS) {
    entry.count = 0
    entry.firstAt = now
    entry.blockedUntil = undefined
  }

  loginRL.set(key, entry)
  return { ok: true }
}

function registerFail(ip: string, email: string) {
  const key = rlKey(ip, email)
  const now = Date.now()
  const entry = loginRL.get(key) || { count: 0, firstAt: now, blockedUntil: undefined }

  entry.count += 1
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS
    entry.count = 0
    entry.firstAt = now
  }
  loginRL.set(key, entry)
}

function registerSuccess(ip: string, email: string) {
  const key = rlKey(ip, email)
  loginRL.delete(key)
}

// ===== Helpers de seguridad =====
function isValidEmailDomain(email: string): boolean {
  const allowed = process.env.ALLOWED_EMAIL_DOMAINS?.split(",") || []
  if (allowed.length === 0) return true
  return allowed.some((domain) => {
    const d = domain.trim()
    return d.startsWith("@") ? email.endsWith(d) : email.endsWith(`@${d}`)
  })
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@")
  if (!localPart || !domain) return "***@***"
  const maskedLocal =
    localPart.length > 2 ? localPart[0] + "*".repeat(localPart.length - 2) + localPart[localPart.length - 1] : "*".repeat(localPart.length)
  return `${maskedLocal}@${domain}`
}

function isInternalPath(p?: string | null): boolean {
  if (!p) return false
  // Validación más estricta para evitar open redirects
  if (!p.startsWith("/")) return false
  if (p.startsWith("//")) return false
  if (p.includes("://")) return false
  if (p.includes("@")) return false
  if (p.includes("\\")) return false
  // Evitar redirección a la misma página de login
  if (p === "/login" || p.startsWith("/login?")) return false
  return true
}

// Cache de roles en memoria con TTL
const roleCache = new Map<string, { role: string | null; expiry: number }>()
const ROLE_CACHE_TTL = 5 * 60 * 1000 // 5 minutos

async function getUserRole(userId: string): Promise<string | null> {
  try {
    // Verificar cache primero
    const cached = roleCache.get(userId)
    if (cached && cached.expiry > Date.now()) {
      return cached.role
    }

    const supabase = await createClient()
    
    // Usar .maybeSingle() en lugar de .single() para manejar 0 o 1 fila
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
    
    if (error) {
      console.error("Error fetching role:", error)
      return null
    }
    
    // Si no hay data, significa que no existe el perfil
    if (!data) {
      console.warn(`No profile found for user ${userId}`)
      return null
    }
    
    const role = (data?.role as string | null) ?? null
    
    // Guardar en cache solo si hay un rol válido
    if (role) {
      roleCache.set(userId, {
        role,
        expiry: Date.now() + ROLE_CACHE_TTL
      })
    }
    
    return role
  } catch (error) {
    console.error("Unexpected error fetching role:", error)
    return null
  }
}

// Función auxiliar para crear perfil si no existe
async function ensureUserProfile(userId: string, email: string, userData?: any): Promise<string | null> {
  try {
    const supabase = await createClient()
    
    // Primero intentar obtener el perfil existente
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
    
    if (existingProfile?.role) {
      return existingProfile.role as string
    }
    
    // Si no existe, crear uno con rol por defecto según el email
    const defaultRole = determineDefaultRole(email)
    const fullName = userData?.user_metadata?.full_name || 
                    userData?.user_metadata?.name || 
                    email.split('@')[0]
    
    const { data: newProfile, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        full_name: fullName,
        nombre_completo: fullName,
        role: defaultRole,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select("role")
      .single()
    
    if (error) {
      // Si el error es porque ya existe (race condition), intentar obtenerlo
      if (error.code === '23505') { // Unique violation
        const { data: retryProfile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle()
        
        if (retryProfile?.role) {
          return retryProfile.role as string
        }
      }
      
      console.error("Error creating user profile:", error)
      return null
    }
    
    return newProfile?.role as string || null
  } catch (error) {
    console.error("Error ensuring user profile:", error)
    return null
  }
}

// Determinar rol por defecto basado en el dominio del email u otra lógica
function determineDefaultRole(email: string): string {
  // Personaliza esta lógica según tus necesidades
  const adminDomains = process.env.ADMIN_EMAIL_DOMAINS?.split(",") || []
  const doctorDomains = process.env.DOCTOR_EMAIL_DOMAINS?.split(",") || []
  
  const emailDomain = email.split("@")[1]
  
  if (adminDomains.some(d => emailDomain === d.trim())) {
    return "admin"
  }
  
  if (doctorDomains.some(d => emailDomain === d.trim())) {
    return "doctor"
  }
  
  // Rol por defecto
  return "asistente"
}

function isAllowedRole(role: string): boolean {
  const allowed = process.env.ALLOWED_ROLES?.split(",") || ["admin", "doctor", "asistente"]
  return allowed.map((r) => r.trim().toLowerCase()).includes(role.trim().toLowerCase())
}

// Extrae el tipo de código de error del branch { ok: false } de LoginResponse
type LoginErrorCode = Extract<LoginResponse, { ok: false }>["code"]

function mapAuthError(err: unknown): { code: LoginErrorCode; message: string } {
  if (err instanceof AuthApiError) {
    if (err.status === 401) return { code: "INVALID", message: "Credenciales inválidas." }
    if (err.status === 400 && /email not confirmed/i.test(err.message)) {
      return { code: "UNCONFIRMED", message: "Por favor, confirma tu correo electrónico." }
    }
    if (err.status === 429) return { code: "RATE_LIMIT", message: "Demasiados intentos. Vuelve a intentarlo más tarde." }
  }
  return { code: "INVALID", message: "Credenciales inválidas." }
}

// ===== Server Action =====
export async function login(formData: FormData): Promise<LoginResponse> {
  const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  
  try {
    const raw = {
      email: formData.get("email")?.toString().trim().toLowerCase() || "",
      password: formData.get("password")?.toString() || "",
      rememberMe: (formData.get("rememberMe")?.toString() || "") as "on" | "",
      company: formData.get("company")?.toString() || "", // honeypot
      next: formData.get("next")?.toString() || "",
    }
    
    dlog("start", { requestId, email: maskEmail(raw.email), remember: raw.rememberMe === "on" })
    
    const parsed = LoginSchema.safeParse(raw)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Datos inválidos."
      dlog("validation_fail", { requestId, firstError })
      return { ok: false, code: "VALIDATION", message: firstError }
    }

    const { email, password, rememberMe } = parsed.data

    // Honeypot detectado
    if (raw.company && raw.company.length > 0) {
      await new Promise((r) => setTimeout(r, 800))
      dlog("honeypot_triggered", { requestId })
      return { ok: false, code: "INVALID", message: "No pudimos iniciar sesión. Verifica tus datos." }
    }

    // Dominio permitido
    if (!isValidEmailDomain(email)) {
      dlog("forbidden_domain", { requestId, email: maskEmail(email) })
      return { ok: false, code: "FORBIDDEN", message: "Dominio de correo no permitido." }
    }

    // Rate limit server-side
    const ip = await getIP()
    const rl = checkRateLimit(ip, email)
    if (!rl.ok) {
      dlog("rate_limited", { requestId, retryAfter: rl.retryAfter })
      return { ok: false, code: "RATE_LIMIT", message: "Demasiados intentos. Vuelve a intentarlo más tarde.", retryAfter: rl.retryAfter }
    }

    const supabase = await createClient()

    // Pequeña demora aleatoria para dificultar enumeración sistemática
    await new Promise((r) => setTimeout(r, 200 + Math.floor(Math.random() * 300)))

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error("Autenticación fallida:", {
        email: maskEmail(email),
        error: error.message,
        ip,
        timestamp: new Date().toISOString(),
      })
      registerFail(ip, email)
      const safe = mapAuthError(error)
      dlog("auth_error", { requestId, code: safe.code })
      return { ok: false, code: safe.code, message: safe.message }
    }

    // Confirmación de email (defensivo)
    if (!data.user?.email_confirmed_at) {
      registerFail(ip, email)
      // Cerrar sesión inmediatamente para evitar sesión activa sin permisos y posibles bucles
      try {
        await supabase.auth.signOut()
      } catch {}
      dlog("unconfirmed_email", { requestId, userId: data.user?.id })
      return { ok: false, code: "UNCONFIRMED", message: "Por favor, confirma tu correo electrónico." }
    }

    // Roles: preferir metadatos del token; fallback a DB. Si no hay rol o no está permitido => FORBIDDEN
    let role = (((data.user as any)?.user_metadata?.role) || ((data.user as any)?.app_metadata?.role) || null) as string | null
    
    if (!role) {
      // Primero intentar obtener el rol de la DB
      role = await getUserRole(data.user.id)
      dlog("role_source", { requestId, source: "db", role })
      
      // Si no existe el perfil, intentar crearlo
      if (!role) {
        dlog("profile_missing", { requestId, userId: data.user.id })
        role = await ensureUserProfile(data.user.id, email, data.user)
        if (role) {
          dlog("profile_created", { requestId, role })
        } else {
          dlog("profile_creation_failed", { requestId })
        }
      }
    } else {
      dlog("role_source", { requestId, source: "metadata", role })
    }
    
    if (!role || !isAllowedRole(role)) {
      registerFail(ip, email)
      // Cerrar sesión para evitar que el middleware detecte un usuario autenticado sin rol permitido
      try {
        await supabase.auth.signOut()
      } catch {}
      dlog("forbidden_role", { requestId, role })
      return { ok: false, code: "FORBIDDEN", message: "No tienes permisos para acceder a esta aplicación." }
    }
    
    // Cachear el rol en user_metadata para evitar consultas futuras en middleware
    try {
      await supabase.auth.updateUser({ data: { role } })
      dlog("role_cached", { requestId })
    } catch (updateError) {
      console.error("Error updating user metadata:", updateError)
    }

    // "Recordar sesión": cookie auxiliar de UX con flags de seguridad mejorados
    const cookieStore = await cookies()
    const isProduction = process.env.NODE_ENV === "production"
    
    if (rememberMe === "on") {
      cookieStore.set("rememberMe", "1", { 
        path: "/", 
        maxAge: 60 * 60 * 24 * 365, 
        sameSite: "lax",
        httpOnly: true,
        secure: isProduction
      })
      dlog("remember_cookie", { requestId, remember: true })
    } else {
      cookieStore.delete("rememberMe")
      dlog("remember_cookie", { requestId, remember: false })
    }

    // Éxito: preparar redirección
    registerSuccess(ip, email)
    
    // Revalidar las rutas necesarias
    revalidatePath("/", "layout")
    revalidatePath("/dashboard", "page")

    const nextRaw = parsed.data.next || ""
    const nextIsInternal = isInternalPath(nextRaw)
    const target = nextIsInternal ? nextRaw : "/dashboard"

    dlog("success", { requestId, redirectTo: target })
    
    // Retornar la respuesta de éxito - el cliente manejará la redirección
    return { ok: true, redirectTo: target }
    
  } catch (err) {
    console.error("Error inesperado en login:", err)
    dlog("unexpected_error", { error: (err as any)?.message || "Unknown error" })
    return { ok: false, code: "UNKNOWN", message: "Ocurrió un error inesperado. Inténtalo más tarde." }
  }
}

// Reenviar verificación para el CTA del formulario
export async function resendConfirmation(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.resend({ type: "signup", email })
    if (error) {
      console.error("Error resending confirmation:", error)
      return { ok: false, message: "No se pudo reenviar el correo." }
    }
    return { ok: true }
  } catch (error) {
    console.error("Unexpected error in resendConfirmation:", error)
    return { ok: false, message: "Ocurrió un error inesperado." }
  }
}

// Logout mejorado
export async function logout(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error al cerrar sesión:", error.message)
      return { ok: false, message: "Error al cerrar sesión. Por favor, inténtelo nuevamente." }
    }
    
    // Limpiar cookies relacionadas
    const cookieStore = await cookies()
    cookieStore.delete("rememberMe")
    
    // Limpiar cache de roles
    roleCache.clear()
    
    revalidatePath("/", "layout")
    revalidatePath("/login", "page")
    
    return { ok: true }
  } catch (error) {
    console.error("Error inesperado en logout:", error)
    return { ok: false, message: "Ocurrió un error inesperado." }
  }
}