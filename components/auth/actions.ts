// app/auth/actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { cookies, headers } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { z } from "zod"
import crypto from "node:crypto"
import { AuthApiError } from "@supabase/supabase-js"

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

async function getUserRole(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single()
    if (error) return null
    return (data?.role as string | null) ?? null
  } catch {
    return null
  }
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
  try {
    const raw = {
      email: formData.get("email")?.toString().trim().toLowerCase() || "",
      password: formData.get("password")?.toString() || "",
      rememberMe: (formData.get("rememberMe")?.toString() || "") as "on" | "",
      company: formData.get("company")?.toString() || "", // honeypot
    }

    const parsed = LoginSchema.safeParse(raw)
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Datos inválidos."
      return { ok: false, code: "VALIDATION", message: firstError }
    }

    const { email, password, rememberMe } = parsed.data

    // Honeypot detectado
    if (raw.company && raw.company.length > 0) {
      await new Promise((r) => setTimeout(r, 800))
      return { ok: false, code: "INVALID", message: "No pudimos iniciar sesión. Verifica tus datos." }
    }

    // Dominio permitido
    if (!isValidEmailDomain(email)) {
      return { ok: false, code: "FORBIDDEN", message: "Dominio de correo no permitido." }
    }

    // Rate limit server-side
    const ip = await getIP()
    const rl = checkRateLimit(ip, email)
    if (!rl.ok) {
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
      return { ok: false, code: safe.code, message: safe.message }
    }

    // Confirmación de email (defensivo)
    if (!data.user?.email_confirmed_at) {
      registerFail(ip, email)
      // Cerrar sesión inmediatamente para evitar sesión activa sin permisos y posibles bucles
      try {
        await supabase.auth.signOut()
      } catch {}
      return { ok: false, code: "UNCONFIRMED", message: "Por favor, confirma tu correo electrónico." }
    }

    // Roles: preferir metadatos del token; fallback a DB. Si no hay rol o no está permitido => FORBIDDEN
    let role = (((data.user as any)?.user_metadata?.role) || ((data.user as any)?.app_metadata?.role) || null) as string | null
    if (!role) {
      role = await getUserRole(data.user.id)
    }
    if (!role || !isAllowedRole(role)) {
      registerFail(ip, email)
      // Cerrar sesión para evitar que el middleware detecte un usuario autenticado sin rol permitido
      try {
        await supabase.auth.signOut()
      } catch {}
      return { ok: false, code: "FORBIDDEN", message: "No tienes permisos para acceder a esta aplicación." }
    }
    // Cachear el rol en user_metadata para evitar consultas futuras en middleware
    try {
      await supabase.auth.updateUser({ data: { role } })
    } catch {}

    // "Recordar sesión": cookie auxiliar de UX
    const cookieStore = await cookies()
    if (rememberMe === "on") {
      cookieStore.set("rememberMe", "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" })
    } else {
      cookieStore.set("rememberMe", "", { path: "/", maxAge: 0 })
    }

    // Éxito
    registerSuccess(ip, email)
    revalidatePath("/", "layout")
    revalidatePath("/dashboard", "page")

    return { ok: true, redirectTo: "/dashboard" }
  } catch (err) {
    console.error("Error inesperado en login:", err)
    return { ok: false, code: "UNKNOWN", message: "Ocurrió un error inesperado. Inténtalo más tarde." }
  }
}

// (Opcional) Reenviar verificación para el CTA del formulario
export async function resendConfirmation(email: string): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.resend({ type: "signup", email })
    if (error) return { ok: false, message: "No se pudo reenviar el correo." }
    return { ok: true }
  } catch {
    return { ok: false, message: "Ocurrió un error inesperado." }
  }
}

// (Opcional) logout
export async function logout(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error al cerrar sesión:", error.message)
      return { ok: false, message: "Error al cerrar sesión. Por favor, inténtelo nuevamente." }
    }
    revalidatePath("/", "layout")
    revalidatePath("/login", "page")
    return { ok: true }
  } catch (error) {
    console.error("Error inesperado en logout:", error)
    return { ok: false, message: "Ocurrió un error inesperado." }
  }
}
