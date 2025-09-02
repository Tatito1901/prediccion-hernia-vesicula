// components/auth/ProfessionalLoginForm.tsx
"use client"

import { useCallback, useState, useTransition, useId } from "react"
import { LockKeyhole, AtSign, LogIn, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { login, type LoginResponse } from "./actions"

// Constantes optimizadas
const REDIRECT_DELAY = 300 // Reducido para UX más rápida
const TOAST_DURATION = 3000

// CSS classes constantes para evitar re-computación
const CLASSES = {
  input: {
    base: "w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500",
    error: "border-red-500/50 focus:ring-red-500/30 focus:border-red-500",
    withIcon: "pr-12"
  },
  button: {
    base: "w-full py-3.5 px-6 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2",
    active: "bg-teal-600 hover:bg-teal-700 shadow-lg hover:shadow-xl active:scale-[0.98]",
    disabled: "bg-slate-700 cursor-not-allowed opacity-70"
  },
  error: "p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-sm text-red-300 flex items-start gap-2.5",
  label: "block text-sm font-medium text-slate-300 mb-1.5"
} as const

interface ProfessionalLoginFormProps {
  nextPath?: string
  initialErrorCode?: string
}

export default function ProfessionalLoginForm({ nextPath, initialErrorCode }: ProfessionalLoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const formId = useId()

  // Pre-compute error message una sola vez
  useState(() => {
    if (!initialErrorCode) return
    const errorMessages: Record<string, string> = {
      session_expired: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
      unauthorized: "Debes iniciar sesión para continuar.",
      access_denied: "No tienes permisos para acceder.",
      forbidden: "No tienes permisos para acceder."
    }
    setError(errorMessages[initialErrorCode] || "Por favor, inicia sesión para continuar.")
  })

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    
    const form = e.currentTarget
    const formData = new FormData(form)
    
    // Validación básica del lado del cliente (HTML5 se encarga del resto)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    
    if (!email || !password) {
      setError("Por favor, completa todos los campos.")
      return
    }

    startTransition(async () => {
      // Agregar nextPath si existe
      if (nextPath) formData.set("next", nextPath)
      
      const result: LoginResponse = await login(formData)
      
      if (result.ok) {
        // Pre-fetch dashboard para carga más rápida
        router.prefetch(result.redirectTo)
        
        // Redirección rápida
        setTimeout(() => {
          router.push(result.redirectTo)
        }, REDIRECT_DELAY)
      } else {
        // Manejo de errores simplificado
        const errorMsg = result.code === "RATE_LIMIT" && result.retryAfter
          ? `Demasiados intentos. Espera ${Math.ceil(result.retryAfter / 1000)}s.`
          : result.message
        setError(errorMsg)
        
        // Auto-limpiar error después de un tiempo
        setTimeout(() => setError(""), TOAST_DURATION * 2)
      }
    })
  }, [nextPath, router])

  const togglePassword = useCallback(() => setShowPassword(prev => !prev), [])

  return (
    <>
      {/* Loading overlay optimizado */}
      {isPending && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex h-full items-center justify-center">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-teal-500" />
              <p className="mt-3 text-slate-200 font-medium">Verificando credenciales...</p>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-800">
        {/* Gradientes simplificados con CSS */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-600/10 rounded-full blur-3xl" />
        </div>

        <main className="w-full max-w-md relative">
          <div className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-8 shadow-2xl">
            {/* Header simplificado */}
            <header className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-teal-600 mb-4">
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
                    disabled={isPending}
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
                    disabled={isPending}
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
              </div>

              {/* Remember me + Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    className="w-4 h-4 text-teal-600 bg-slate-800 border-slate-700 rounded focus:ring-2 focus:ring-teal-500/30"
                    disabled={isPending}
                  />
                  <span className="text-sm text-slate-300">Recordar sesión</span>
                </label>
                <a 
                  href="/reset-password" 
                  className="text-sm text-slate-300 hover:text-white underline underline-offset-4"
                  tabIndex={isPending ? -1 : 0}
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Error message */}
              {error && (
                <div className={CLASSES.error} role="alert">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isPending}
                className={`${CLASSES.button.base} ${isPending ? CLASSES.button.disabled : CLASSES.button.active}`}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Iniciar sesión</span>
                  </>
                )}
              </button>
            </form>

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