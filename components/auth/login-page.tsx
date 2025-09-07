// components/auth/ProfessionalLoginForm.tsx
"use client"

import React, { useCallback, useState, useTransition, useId, useEffect, useRef } from "react"
import { LockKeyhole, AtSign, LogIn, Eye, EyeOff, AlertCircle, Loader2, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useGlobalOverlay } from "@/components/providers"

// Definición del tipo de respuesta para que el componente sea autónomo
interface LoginResponse {
  ok: boolean
  redirectTo: string
  message: string
  code?: string
  retryAfter?: number
}

// --- Constantes de Diseño y Configuración ---

const REDIRECT_DELAY = 250
const TOAST_DURATION = 4000

// Paleta de colores y clases de Tailwind CSS para un look profesional "verde oscuro"
const CLASSES = {
  input: {
    base: "w-full pl-10 pr-4 py-3 bg-gray-900/70 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500 shadow-sm",
    error: "border-red-500/50 focus:ring-red-500/30 focus:border-red-500",
    withIcon: "pr-12"
  },
  button: {
    base: "w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-300 ease-in-out flex items-center justify-center gap-2.5 shadow-lg",
    active: "bg-green-600 hover:bg-green-700 shadow-green-500/20 hover:shadow-green-500/30 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 focus:ring-green-500 transform hover:-translate-y-0.5",
    disabled: "bg-gray-800 cursor-not-allowed opacity-60"
  },
  error: "p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 flex items-start gap-2.5",
  label: "block text-sm font-medium text-gray-400 mb-2"
} as const

// --- Props del Componente ---

interface ProfessionalLoginFormProps {
  nextPath?: string
  initialErrorCode?: string
  loginAction: (formData: FormData) => Promise<LoginResponse>
}

// --- Logo SVG ---

const ClinicLogo = () => (
  <svg width="48" height="48" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" className="text-green-500">
    <path fill="currentColor" d="M56.684,10.052 55,10.612 55,1 53,1 53,13.388 57.316,11.948z M53,17.279V61h-4V24h-5.595c-2.429,0-4.795,0.856-6.661,2.411C34.365,28.395,33,31.308,33,34.405V36h-7v2h7v6h-6v2h6v3.168c0,0.941-0.122,1.853-0.331,2.731c-0.211-0.199-0.42-0.399-0.632-0.609c-1.27-1.261-2.709-2.69-5.852-3.244c-3.142-0.557-4.985,0.295-6.609,1.046c-1.555,0.718-2.898,1.336-5.422,0.893c-2.523-0.446-3.572-1.488-4.786-2.695c-0.319-0.317-0.659-0.639-1.018-0.957C8.639,45.153,9.104,44.03,9.735,43H16v-2h-4.716c0.362-0.377,0.742-0.739,1.157-1.071L13.601,39H20v-2h-3.899l17.141-13.713C35.892,21.167,39.22,20,42.612,20H49V1h-2v17h-4.388c-3.845,0-7.617,1.323-10.62,3.725L11.191,38.366C7.892,41.005,6,44.942,6,49.168C6,56.795,12.205,63,19.833,63h1.335C28.795,63,35,56.795,35,49.168V34.405c0-2.502,1.103-4.855,3.024-6.457C39.532,26.691,41.443,26,43.405,26H47v37h8V18.721l2.316-0.772l-0.633-1.896L53,17.279z M21.167,61h-1.335C13.308,61,8,55.692,8,49.168c0-0.134,0.018-0.264,0.022-0.397c1.254,1.245,2.695,2.637,5.784,3.182c3.144,0.558,4.984-0.295,6.608-1.046c1.555-0.718,2.897-1.336,5.423-0.893c2.526,0.446,3.575,1.488,4.79,2.694c0.419,0.417,0.852,0.842,1.35,1.249C30.134,58.101,25.986,61,21.167,61z" />
  </svg>
)

// --- Componente Principal ---

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

  // Efecto para manejar el código de error inicial
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

  // Efecto para manejar el cooldown de rate limiting
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

  // Manejador del envío del formulario
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")
    
    if (isRateLimited || cooldownMs > 0) {
      setError(`Demasiados intentos. Espera ${Math.ceil(cooldownMs / 1000)}s.`)
      return
    }
    
    show("Verificando credenciales...")
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    
    if (!email || !password) {
      setError("Por favor, completa todos los campos.")
      hide()
      return
    }

    startTransition(async () => {
      if (nextPath) formData.set("next", nextPath)
      try {
        const result: LoginResponse = await loginAction(formData)
        
        if (result.ok) {
          setIsRateLimited(false)
          try { localStorage.removeItem("loginCooldownUntil") } catch {}
          router.prefetch(result.redirectTo)
          
          setTimeout(() => {
            router.push(result.redirectTo)
          }, REDIRECT_DELAY)

        } else {
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
          
          setTimeout(() => setError(""), TOAST_DURATION)
        }
      } catch (_err) {
        setError("Ocurrió un error inesperado. Intenta nuevamente.")
      } finally {
        hide()
      }
    })
  }, [nextPath, router, loginAction, hide, show, isRateLimited, cooldownMs])

  // Limpieza del overlay al desmontar
  useEffect(() => () => hide(), [hide])

  // Foco en el error para accesibilidad
  useEffect(() => {
    if (error) {
      errorRef.current?.focus()
    }
  }, [error])

  const togglePassword = useCallback(() => setShowPassword(prev => !prev), [])

  return (
    <>
      {/* Estilos globales y la fuente 'Inter' */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .bg-grid-pattern {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 30px 30px;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes border-spin {
            100% {
                transform: rotate(-360deg);
            }
        }
        .gradient-border-container::before {
            content: '';
            position: absolute;
            top: 0; right: 0; bottom: 0; left: 0;
            z-index: -1;
            margin: -1px;
            border-radius: inherit;
            background: conic-gradient(from 180deg at 50% 50%, #2dc876, #1ca9e0, #2dc876);
            animation: border-spin 3s linear infinite;
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950 text-gray-200 bg-grid-pattern">
        <main className="w-full max-w-md relative">
          {/* Contenedor principal con borde gradiente animado */}
          <div className="relative gradient-border-container rounded-3xl">
            <div className="bg-gray-900/80 backdrop-blur-sm border border-transparent rounded-3xl p-10 shadow-2xl">
              <header className="text-center mb-8">
                <div className="inline-block mb-4 animate-float">
                  <ClinicLogo />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">Clínica de Hernia y Vesícula</h1>
                <p className="text-gray-400 mt-2">Portal de Acceso</p>
              </header>

              <form 
                id={formId}
                onSubmit={handleSubmit} 
                className="space-y-6" 
                noValidate
                aria-busy={isPending}
              >
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />

                {/* Campo de Email */}
                <div>
                  <label htmlFor={`${formId}-email`} className={CLASSES.label}>
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id={`${formId}-email`} name="email" type="email"
                      className={CLASSES.input.base} placeholder="usuario@clinica.com"
                      required autoComplete="email" autoFocus disabled={isPending || isRateLimited}
                      inputMode="email" autoCapitalize="none" spellCheck={false}
                      aria-describedby={error ? errorId : undefined}
                    />
                  </div>
                </div>

                {/* Campo de Contraseña */}
                <div>
                  <label htmlFor={`${formId}-password`} className={CLASSES.label}>
                    Contraseña
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      id={`${formId}-password`} name="password" type={showPassword ? "text" : "password"}
                      className={`${CLASSES.input.base} ${CLASSES.input.withIcon}`}
                      placeholder="••••••••" required minLength={8} autoComplete="current-password"
                      disabled={isPending || isRateLimited} aria-invalid={!!error}
                      aria-describedby={error ? errorId : undefined}
                      onKeyDown={(e) => setCapsOn((e as React.KeyboardEvent<HTMLInputElement>).getModifierState('CapsLock'))}
                      onKeyUp={(e) => setCapsOn((e as React.KeyboardEvent<HTMLInputElement>).getModifierState('CapsLock'))}
                    />
                    <button
                      type="button"
                      onClick={togglePassword}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-200 transition-colors rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {capsOn && (
                    <p className="mt-2 text-xs text-amber-400">Bloq Mayús activado</p>
                  )}
                </div>

                {/* Opciones Adicionales */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox" name="rememberMe"
                      className="w-4 h-4 text-green-600 bg-gray-800 border-gray-600 rounded focus:ring-2 focus:ring-offset-gray-900 focus:ring-green-500"
                      disabled={isPending || isRateLimited}
                    />
                    <span className="text-gray-400 group-hover:text-gray-200 transition-colors">Recordar sesión</span>
                  </label>
                  <a 
                    href="/reset-password" 
                    className="text-gray-400 hover:text-green-500 underline-offset-4 hover:underline"
                    aria-disabled={isPending || isRateLimited}
                    tabIndex={(isPending || isRateLimited) ? -1 : 0}
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                {/* Mensaje de Error */}
                {error && (
                  <div id={errorId} ref={errorRef} className={CLASSES.error} role="alert" tabIndex={-1} aria-live="assertive">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Botón de Envío */}
                <div className="pt-2">
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
                </div>
              </form>

              <footer className="mt-10 pt-6 border-t border-gray-800 text-center">
                <p className="text-xs text-gray-600">
                  © {new Date().getFullYear()} Clínica de Hernia y Vesícula. Todos los derechos reservados.
                </p>
              </footer>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

