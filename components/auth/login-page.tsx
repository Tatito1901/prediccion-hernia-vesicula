// components/auth/ProfessionalLoginForm.tsx
"use client"

import { useCallback, useState, useTransition, useId, useEffect, useRef } from "react"
import { LockKeyhole, AtSign, LogIn, Eye, EyeOff, AlertCircle, Loader2, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import type { LoginResponse } from "./actions"
import { useGlobalOverlay } from "@/components/providers"

// Constantes optimizadas
const REDIRECT_DELAY = 300 // Reducido para UX más rápida
const TOAST_DURATION = 3000

// CSS classes constantes para evitar re-computación
const CLASSES = {
  input: {
    base: "w-full pl-10 pr-4 py-3 bg-brand-navy-600/40 border border-brand-navy-600/60 rounded-lg text-slate-100 placeholder-slate-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
    error: "border-red-500/50 focus:ring-red-500/30 focus:border-red-500",
    withIcon: "pr-12"
  },
  button: {
    base: "w-full py-3.5 px-6 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2",
    active: "bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-[0.98]",
    disabled: "bg-brand-navy-600/50 cursor-not-allowed opacity-70"
  },
  error: "p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-sm text-red-300 flex items-start gap-2.5",
  label: "block text-sm font-medium text-slate-300 mb-1.5"
} as const

interface ProfessionalLoginFormProps {
  nextPath?: string
  initialErrorCode?: string
  loginAction: (formData: FormData) => Promise<LoginResponse>
}

export default function ProfessionalLoginForm({ nextPath, initialErrorCode, loginAction }: ProfessionalLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const formId = useId()
  const errorId = useId()
  const { show, hide } = useGlobalOverlay()
  const [capsOn, setCapsOn] = useState(false)
  const errorRef = useRef<HTMLDivElement | null>(null)
  const [cooldownMs, setCooldownMs] = useState(0)
  const [isRateLimited, setIsRateLimited] = useState(false)

  // Mostrar error inicial si viene por querystring
  useEffect(() => {
    if (!initialErrorCode) return
    const errorMessages: Record<string, string> = {
      session_expired: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
      unauthorized: "Debes iniciar sesión para continuar.",
      access_denied: "No tienes permisos para acceder.",
      forbidden: "No tienes permisos para acceder."
    }
    setError(errorMessages[initialErrorCode] || "Por favor, inicia sesión para continuar.")
  }, [initialErrorCode])

  // Rate limit cooldown ticker (localStorage-backed)
  useEffect(() => {
    const key = "loginCooldownUntil"
    const check = () => {
      try {
        const raw = localStorage.getItem(key)
        if (!raw) {
          setIsRateLimited(false)
          setCooldownMs(0)
          return
        }
        const until = parseInt(raw, 10)
        const now = Date.now()
        if (Number.isFinite(until) && until > now) {
          setIsRateLimited(true)
          setCooldownMs(until - now)
        } else {
          setIsRateLimited(false)
          setCooldownMs(0)
          localStorage.removeItem(key)
        }
      } catch {}
    }
    check()
    const id = setInterval(check, 1000)
    return () => clearInterval(id)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    // Mostrar overlay global y bloquear la UI durante el proceso
    show("Verificando credenciales...")
    // Bloqueo mientras el cooldown esté activo
    if (isRateLimited || cooldownMs > 0) {
      setError(`Demasiados intentos. Espera ${Math.ceil(cooldownMs / 1000)}s.`)
      hide()
      return
    }

    const form = e.currentTarget
    const formData = new FormData(form)
    
    // Validación básica del lado del cliente (HTML5 se encarga del resto)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    
    if (!email || !password) {
      setError("Por favor, completa todos los campos.")
      // Aseguramos ocultar el overlay si la validación falla
      hide()
      return
    }

    startTransition(async () => {
      // Agregar nextPath si existe
      if (nextPath) formData.set("next", nextPath)
      try {
        const result: LoginResponse = await loginAction(formData)
        
        if (result.ok) {
          setIsRateLimited(false)
          try { localStorage.removeItem("loginCooldownUntil") } catch {}
          // Pre-fetch dashboard para carga más rápida
          router.prefetch(result.redirectTo)
          
          // Opcional: ocultar overlay antes de navegar para evitar overlay persistente
          // La limpieza final también lo garantiza
          
          // Redirección rápida
          setTimeout(() => {
            router.push(result.redirectTo)
          }, REDIRECT_DELAY)
        } else {
          // Manejo de errores y cooldown
          if (result.code === "RATE_LIMIT" && result.retryAfter) {
            const until = Date.now() + result.retryAfter
            setIsRateLimited(true)
            setCooldownMs(result.retryAfter)
            try { localStorage.setItem("loginCooldownUntil", String(until)) } catch {}
          }
          const errorMsg = result.code === "RATE_LIMIT" && result.retryAfter
            ? `Demasiados intentos. Espera ${Math.ceil(result.retryAfter / 1000)}s.`
            : result.message
          setError(errorMsg)
          
          // Auto-limpiar error después de un tiempo
          setTimeout(() => setError(""), TOAST_DURATION * 2)
        }
      } catch (_err) {
        setError("Ocurrió un error inesperado. Intenta nuevamente.")
      } finally {
        // Failsafe: siempre ocultar el overlay al finalizar
        hide()
      }
    })
  }, [nextPath, router, loginAction, hide, show, isRateLimited, cooldownMs])

  // Limpieza al desmontar: asegurar que el overlay no quede visible tras navegación o errores
  useEffect(() => {
    return () => {
      hide()
    }
  }, [hide])

  // Accesibilidad: enfocar contenedor de error cuando aparece
  useEffect(() => {
    if (error) {
      errorRef.current?.focus()
    }
  }, [error])

  const togglePassword = useCallback(() => setShowPassword(prev => !prev), [])

  return (
    <>
      

      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-navy-800 to-brand-navy-600">

        <main className="w-full max-w-md relative">
          <div className="bg-brand-navy-800/80 border border-brand-navy-600 rounded-2xl p-8 shadow-xl">
            {/* Header simplificado */}
            <header className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary mb-4">
                <span className="text-2xl font-bold text-white">CHV</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-50">Clínica de Hernia y Vesícula</h1>
              <p className="text-slate-400 mt-2">Sistema de Gestión Médica</p>
            </header>

            <form 
              id={formId}
              onSubmit={handleSubmit} 
              className="space-y-5" 
              noValidate
              aria-busy={isPending}
            >
              {/* Honeypot mejorado */}
              <input 
                type="text" 
                name="website" 
                tabIndex={-1} 
                autoComplete="off" 
                className="sr-only" 
                aria-hidden="true"
              />

              {/* Email field */}
              <div>
                <label htmlFor={`${formId}-email`} className={CLASSES.label}>
                  Correo electrónico
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    id={`${formId}-email`}
                    name="email"
                    type="email"
                    className={CLASSES.input.base}
                    placeholder="usuario@clinica.com"
                    required
                    autoComplete="email"
                    autoFocus
                    disabled={isPending || isRateLimited}
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-describedby={error ? errorId : undefined}
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label htmlFor={`${formId}-password`} className={CLASSES.label}>
                  Contraseña
                </label>
                <div className="relative">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    id={`${formId}-password`}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className={`${CLASSES.input.base} ${CLASSES.input.withIcon}`}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    autoComplete="current-password"
                    disabled={isPending || isRateLimited}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    onKeyDown={(e) => setCapsOn((e as React.KeyboardEvent<HTMLInputElement>).getModifierState('CapsLock'))}
                    onKeyUp={(e) => setCapsOn((e as React.KeyboardEvent<HTMLInputElement>).getModifierState('CapsLock'))}
                  />
                  <button
                    type="button"
                    onClick={togglePassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {capsOn && (
                  <p className="mt-1.5 text-xs text-amber-300">Bloq Mayús activado</p>
                )}
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    className="w-4 h-4 text-primary bg-brand-navy-600/40 border-brand-navy-600/60 rounded focus:ring-2 focus:ring-primary/30"
                    disabled={isPending || isRateLimited}
                  />
                  <span className="text-sm text-slate-300">Recordar sesión</span>
                </label>
                <a 
                  href="/reset-password" 
                  className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
                  aria-disabled={isPending || isRateLimited}
                  tabIndex={(isPending || isRateLimited) ? -1 : 0}
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Error message */}
              {error && (
                <div id={errorId} ref={errorRef} className={CLASSES.error} role="alert" tabIndex={-1} aria-live="assertive">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isPending || isRateLimited}
                className={`${CLASSES.button.base} ${(isPending || isRateLimited) ? CLASSES.button.disabled : CLASSES.button.active}`}
                aria-disabled={isPending || isRateLimited}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : isRateLimited ? (
                  <>
                    <Clock className="w-5 h-5" />
                    <span>Reintentar en {Math.ceil(cooldownMs / 1000)}s</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Iniciar sesión</span>
                  </>
                )}
              </button>
            </form>

            <footer className="mt-8 pt-6 border-t border-brand-navy-600 text-center">
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