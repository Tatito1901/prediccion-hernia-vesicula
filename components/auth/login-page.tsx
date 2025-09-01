// components/auth/ProfessionalLoginForm.tsx
"use client"

import React, { useState, useEffect, useRef, memo, useCallback, forwardRef } from "react"
import {
  LockKeyhole,
  AtSign,
  LogIn,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  MailCheck,
  type LucideIcon,
} from "lucide-react"
import { Toaster, toast } from "sonner"
import { useRouter } from "next/navigation"
import { login, resendConfirmation, logout, type LoginResponse } from "./actions"

// --- Utilidades ---
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ")
}

// --- Constantes y Tipos ---
const BRAND_COLORS = {
  primary: {
    solidBg: "bg-teal-600",
    hoverSolidBg: "hover:bg-teal-700",
    focusRing: "focus:ring-teal-500/30",
    focusBorder: "focus:border-teal-500",
    text: "text-teal-400",
    hoverText: "hover:text-teal-300",
    checkbox: "text-teal-600",
    shadow: "hover:shadow-teal-500/25",
  },
  background: {
    circle1: "bg-blue-600/10",
    circle2: "bg-teal-600/10",
  },
  error: {
    text: "text-red-400",
    border: "border-red-500/50",
    focusRing: "focus:ring-red-500/30",
    focusBorder: "focus:border-red-500",
    icon: "text-red-400",
  },
  base: {
    border: "border-slate-700",
    icon: "text-slate-500",
  },
} as const

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8
const CLIENT_RATE_LIMIT_DELAY = 1000 // 1s

// Sanitiza rutas de redirección para evitar open-redirects
function sanitizeNextPath(p?: string): string | undefined {
  if (!p) return undefined
  if (p.startsWith('/') && !p.startsWith('//') && !p.includes('://')) return p
  return undefined
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

// --- Botón (sin useFormStatus, controlado por prop) ---
const LoginButton = memo(({ pending }: { pending: boolean }) => (
  <button
    type="submit"
    disabled={pending}
    aria-disabled={pending}
    className={cn(
      "w-full py-3.5 px-6 rounded-lg font-semibold text-white transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center gap-2",
      pending
        ? "bg-slate-700 cursor-wait"
        : `${BRAND_COLORS.primary.solidBg} ${BRAND_COLORS.primary.hoverSolidBg} shadow-lg hover:shadow-xl ${BRAND_COLORS.primary.shadow} active:translate-y-0.5`
    )}
  >
    {pending ? (
      <>
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <span>Verificando...</span>
      </>
    ) : (
      <>
        <LogIn className="w-5 h-5" />
        <span>Iniciar sesión</span>
      </>
    )}
  </button>
))
LoginButton.displayName = "LoginButton"

// --- Input reutilizable ---
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  name: string
  label: string
  error?: string
  icon: LucideIcon
  children?: React.ReactNode
}

const InputField = memo(
  forwardRef<HTMLInputElement, InputFieldProps>(({ id, name, label, error, icon: Icon, children, ...props }, ref) => {
    const hasError = !!error
    return (
      <div className="relative group">
        <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">
          {label}
        </label>
        <div className="relative">
          <Icon
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200",
              hasError ? BRAND_COLORS.error.icon : `${BRAND_COLORS.base.icon} group-focus-within:${BRAND_COLORS.primary.text}`
            )}
            aria-hidden="true"
          />
          <input
            id={id}
            name={name}
            ref={ref}
            className={cn(
              "w-full pl-10 pr-4 py-3 bg-slate-800/50 border rounded-lg text-slate-100 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
              hasError
                ? `${BRAND_COLORS.error.border} ${BRAND_COLORS.error.focusRing} ${BRAND_COLORS.error.focusBorder}`
                : `${BRAND_COLORS.base.border} ${BRAND_COLORS.primary.focusBorder} ${BRAND_COLORS.primary.focusRing}`,
              children ? "pr-12" : ""
            )}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${id}-error` : undefined}
            {...props}
          />
          {children}
        </div>
        {hasError && (
          <p id={`${id}-error`} className={cn("text-xs mt-1.5 flex items-center gap-1.5", BRAND_COLORS.error.text)} role="alert">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </p>
        )}
      </div>
    )
  })
)
InputField.displayName = "InputField"

// --- Componente Principal ---
interface ProfessionalLoginFormProps {
  nextPath?: string
  initialErrorCode?: string
}

const ProfessionalLoginForm = ({ nextPath, initialErrorCode }: ProfessionalLoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0)
  const [successMessage, setSuccessMessage] = useState<string>("")
  const [isCapsLockOn, setIsCapsLockOn] = useState<boolean>(false)
  const [pending, setPending] = useState<boolean>(false)
  const [entering, setEntering] = useState<boolean>(false)
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string>("")

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const validationTimers = useRef<Record<string, number>>({})
  const router = useRouter()

  // Mensaje inicial según errorCode
  useEffect(() => {
    if (!initialErrorCode) return
    const map: Record<string, string> = {
      session_expired: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
      unauthorized: "Debes iniciar sesión para continuar.",
      access_denied: "No tienes permisos para acceder. Inicia sesión con otra cuenta.",
      forbidden: "No tienes permisos para acceder. Inicia sesión con otra cuenta.",
    }
    const msg = map[initialErrorCode] || "Por favor, inicia sesión para continuar."
    setErrors((prev) => ({ ...prev, general: msg }))
  }, [initialErrorCode])

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  useEffect(() => {
    const timers = validationTimers.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [])

  const validateField = useCallback((name: string, value: string): string => {
    if (!value.trim()) return "Este campo es requerido."
    switch (name) {
      case "email":
        return EMAIL_REGEX.test(value) ? "" : "Ingresa un formato de email válido."
      case "password":
        return value.length >= PASSWORD_MIN_LENGTH ? "" : `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
      default:
        return ""
    }
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target
      setErrors((prev) => ({ ...prev, [name]: undefined, general: undefined }))

      if (validationTimers.current[name]) clearTimeout(validationTimers.current[name])
      validationTimers.current[name] = window.setTimeout(() => {
        const errorMsg = validateField(name, value)
        setErrors((prev) => ({ ...prev, [name]: errorMsg || undefined }))
      }, 350)
    },
    [validateField]
  )

  const handlePasswordKeyEvent = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") setIsCapsLockOn(e.getModifierState("CapsLock"))
  }, [])

  const focusFirstError = (emailError?: string, passwordError?: string) => {
    if (emailError) emailRef.current?.focus()
    else if (passwordError) passwordRef.current?.focus()
  }

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      const now = Date.now()
      if (now - lastSubmitTime < CLIENT_RATE_LIMIT_DELAY) {
        const msg = "Demasiados intentos. Por favor, espera un momento."
        setErrors({ general: msg })
        toast.warning(msg)
        return
      }
      setLastSubmitTime(now)

      const email = String(formData.get("email") || "")
      const password = String(formData.get("password") || "")

      const emailError = validateField("email", email)
      const passwordError = validateField("password", password)

      if (emailError || passwordError) {
        setErrors({ email: emailError, password: passwordError })
        focusFirstError(emailError, passwordError)
        toast.error("Por favor, corrige los errores en el formulario.")
        return
      }

      setErrors({})
      setPending(true)
      toast.loading("Procesando tu ingreso…")

      const payload = new FormData()
      payload.set("email", email)
      payload.set("password", password)
      if (formData.get("rememberMe")) payload.set("rememberMe", "on")
      if (formData.get("company")) payload.set("company", String(formData.get("company")))
      if (nextPath) payload.set("next", nextPath)

      const result: LoginResponse = await login(payload)
      toast.dismiss()

      if (result.ok) {
        setSuccessMessage("¡Bienvenido! Redirigiendo a tu panel…")
        setEntering(true)
        toast.success("Ingreso exitoso", { description: "Preparando tu sesión." })
        
        // Usar router.push para la redirección ya que el server action retorna sin hacer redirect()
        setTimeout(() => {
          const safe = sanitizeNextPath(nextPath)
          router.push(safe || result.redirectTo || "/dashboard")
        }, 700)
        return
      }

      setPending(false)

      if (result.code === "RATE_LIMIT") {
        const secs = result.retryAfter ? Math.ceil(result.retryAfter / 1000) : undefined
        const desc = secs ? `Inténtalo nuevamente en ~${secs}s.` : "Inténtalo nuevamente en breve."
        setErrors({ general: `Demasiados intentos. ${desc}` })
        toast.warning("Demasiados intentos", { description: desc })
        return
      }

      if (result.code === "UNCONFIRMED") {
        setUnconfirmedEmail(email)
        setErrors({ general: "Tu correo no está confirmado. Revisa tu bandeja o reenvía el correo." })
        toast.error("Correo no confirmado", { description: "Reenvía el correo de verificación." })
        return
      }

      const errorMessage = result.message || "Credenciales incorrectas. Verifica tus datos."
      setErrors({ general: errorMessage })
      toast.error("Error al iniciar sesión", { description: "Revisa tu correo y contraseña." })
    },
    [lastSubmitTime, validateField, router, nextPath]
  )

  const onResend = async () => {
    if (!unconfirmedEmail) return
    toast.loading("Reenviando correo de confirmación…")
    const res = await resendConfirmation(unconfirmedEmail)
    toast.dismiss()
    if (res.ok) toast.success("Correo enviado", { description: "Revisa tu bandeja y spam." })
    else toast.error("No se pudo reenviar", { description: "Inténtalo más tarde." })
  }

  const handleLogout = async () => {
    const result = await logout()
    if (result.ok) {
      router.push('/login')
    } else {
      toast.error("Error al cerrar sesión", { description: result.message })
    }
  }

  return (
    <>
      <Toaster position="top-center" richColors closeButton theme="dark" />
      {entering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl text-center">
            <div className="mx-auto mb-3 h-10 w-10 rounded-full border-2 border-teal-500/30 border-t-teal-400 animate-spin" />
            <p className="text-slate-200 font-medium">Ingresando a la plataforma…</p>
            <p className="text-slate-400 text-sm mt-1">Preparando tu sesión</p>
          </div>
        </div>
      )}
      {/* Región aria-live accesible */}
      <div className="sr-only" aria-live="polite" role="status">
        {errors.general || successMessage}
      </div>

      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800 font-sans text-slate-100">
        <div className="absolute inset-0 overflow-hidden -z-0">
          <div className={`absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full ${BRAND_COLORS.background.circle1} blur-3xl opacity-50`} />
          <div className={`absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full ${BRAND_COLORS.background.circle2} blur-3xl opacity-50`} />
        </div>

        <main className="w-full max-w-md relative z-10">
          <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <header className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl ${BRAND_COLORS.primary.solidBg} mb-4 shadow-lg`}>
                <span className="text-2xl font-bold text-white">CHV</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-50">Clínica de Hernia y Vesícula</h1>
              <p className="text-sm sm:text-base text-slate-400 mt-2">Sistema de Gestión Médica</p>
            </header>

            <form action={handleSubmit} className="space-y-6" noValidate>
              {/* Honeypot anti-bots */}
              <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

              <InputField
                id="email"
                name="email"
                type="email"
                label="Correo electrónico"
                ref={emailRef}
                icon={AtSign}
                placeholder="usuario@clinica.com"
                required
                autoComplete="email"
                inputMode="email"
                onChange={handleInputChange}
                error={errors.email}
              />

              <InputField
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                label="Contraseña"
                ref={passwordRef}
                icon={LockKeyhole}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                onChange={handleInputChange}
                onKeyUp={handlePasswordKeyEvent}
                onKeyDown={handlePasswordKeyEvent}
                error={errors.password}
              >
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className={cn(
                    "absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2",
                    BRAND_COLORS.primary.hoverText,
                    BRAND_COLORS.primary.focusRing
                  )}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </InputField>

              {isCapsLockOn && (
                <p className="text-amber-400 text-xs -mt-3 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Bloq Mayús está activado.</span>
                </p>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    className={`w-4 h-4 ${BRAND_COLORS.primary.checkbox} bg-slate-800 border-slate-700 rounded focus:ring-2 ${BRAND_COLORS.primary.focusRing}`}
                  />
                  <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">Recordar sesión</span>
                </label>
                <a href="/reset-password" className="text-sm text-slate-300 hover:text-white underline underline-offset-4">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {errors.general && (
                <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-sm text-red-300 flex items-start gap-2.5" role="alert">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{errors.general}</span>
                </div>
              )}

              {unconfirmedEmail && (
                <div className="p-3 bg-amber-900/30 border border-amber-500/30 rounded-lg text-sm text-amber-200 flex items-start gap-2.5">
                  <MailCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p>Tu correo no está confirmado. Si no lo encuentras, puedes reenviar el correo de verificación.</p>
                    <button
                      type="button"
                      onClick={onResend}
                      className="text-left px-3 py-1.5 rounded-md bg-amber-700/40 hover:bg-amber-700/60 border border-amber-600/40"
                    >
                      Reenviar verificación
                    </button>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-sm text-green-300 flex items-start gap-2.5" role="status">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              <div className="[&_*]:motion-reduce:transition-none">
                <LoginButton pending={pending} />
              </div>
            </form>

            {/* CTA para cerrar sesión si el usuario llegó con error de permisos */}
            {initialErrorCode && ["forbidden", "access_denied"].includes(initialErrorCode.toLowerCase()) && (
              <div className="mt-4 p-3 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-300 flex items-center justify-between gap-3">
                <span>¿Quieres cambiar de cuenta?</span>
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 border border-slate-600"
                >
                  Cerrar sesión
                </button>
              </div>
            )}

            <footer className="mt-8 pt-6 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-500">
                © {new Date().getFullYear()} Clínica de Hernia y Vesícula. Todos los derechos reservados.
              </p>
            </footer>
          </div>
        </main>
      </div>
    </>
  )
}

export default memo(ProfessionalLoginForm)