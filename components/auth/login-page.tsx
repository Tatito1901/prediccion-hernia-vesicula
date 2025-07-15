// components/auth/ProfessionalLoginForm.tsx
"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect, useRef, memo, type FC } from "react"
import { useFormStatus } from "react-dom"
import { login } from "@/components/auth/actions"
import { 
  LockKeyhole, 
  AtSign, 
  LogIn, 
  Eye, 
  EyeOff, 
  AlertCircle 
} from "lucide-react"

// --- Paleta de Colores (sin cambios) ---
const brandColors = {
  primary: {
    solidBg: 'bg-teal-600',
    hoverSolidBg: 'hover:bg-teal-700',
    focusRing: 'focus:ring-teal-500/30',
    focusBorder: 'focus:border-teal-500',
    text: 'text-teal-400',
    hoverText: 'hover:text-teal-300',
    checkbox: 'text-teal-600',
    shadow: 'hover:shadow-teal-500/25',
  },
  background: {
    circle1: 'bg-blue-600/10',
    circle2: 'bg-teal-600/10',
  }
};

// --- Componente Principal del Formulario ---
const ProfessionalLoginForm: FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get('message')

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-slate-900 to-slate-800 font-sans">
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-1/2 -right-1/2 w-full h-full rounded-full ${brandColors.background.circle1} blur-3xl`} />
        <div className={`absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full ${brandColors.background.circle2} blur-3xl`} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl ${brandColors.primary.solidBg} mb-4 shadow-lg`}>
              <span className="text-2xl font-bold text-white">CHV</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-100">
              Clínica de Hernia y Vesícula
            </h1>
            <p className="text-sm sm:text-base text-slate-400 mt-2">
              Sistema de Gestión Médica
            </p>
          </div>

          <form action={login} className="space-y-6">
            {/* Campo Email */}
            <div className="relative group">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5 sr-only">
                Correo Electrónico
              </label>
              <AtSign 
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-colors duration-200 group-focus-within:text-teal-400 ${errorMessage && 'text-red-400'}`} 
              />
              <input
                id="email"
                name="email"
                type="email"
                ref={emailRef}
                className={`w-full pl-10 pr-4 py-3 bg-slate-800/50 border rounded-lg text-slate-100 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  errorMessage
                    ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500'
                    : `border-slate-700 ${brandColors.primary.focusBorder} ${brandColors.primary.focusRing}`
                }`}
                placeholder="Correo Electrónico"
                required
                aria-required="true"
                aria-invalid={!!errorMessage}
              />
            </div>

            {/* Campo Contraseña */}
            <div className="relative group">
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5 sr-only">
                Contraseña
              </label>
              <LockKeyhole 
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 transition-colors duration-200 group-focus-within:text-teal-400 ${errorMessage && 'text-red-400'}`} 
              />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className={`w-full pl-10 pr-12 py-3 bg-slate-800/50 border rounded-lg text-slate-100 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                  errorMessage
                    ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500'
                    : `border-slate-700 ${brandColors.primary.focusBorder} ${brandColors.primary.focusRing}`
                }`}
                placeholder="Contraseña"
                required
                aria-required="true"
                aria-invalid={!!errorMessage}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 ${brandColors.primary.hoverText} transition-colors duration-200 focus:outline-none focus:ring-2 ${brandColors.primary.focusRing} rounded-full p-1`}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg text-sm text-red-400 flex items-center gap-2" role="alert" aria-live="assertive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage.replace('Error: ', '')}</span>
              </div>
            )}

            {/* Opciones adicionales: Se eliminó "¿Olvidó su contraseña?" */}
            <div className="flex items-center justify-start">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  name="rememberMe"
                  className={`w-4 h-4 ${brandColors.primary.checkbox} bg-slate-800 border-slate-700 rounded focus:ring-teal-500 focus:ring-2`}
                />
                <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
                  Recordar sesión
                </span>
              </label>
            </div>

            <LoginButton />
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} Clínica de Hernia y Vesícula. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Componente del Botón de Login (sin cambios) ---
function LoginButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`w-full py-3.5 px-6 rounded-lg font-semibold text-white transition-all duration-300 ease-in-out transform hover:scale-105 ${
        pending
          ? 'bg-slate-700 cursor-wait'
          : `${brandColors.primary.solidBg} ${brandColors.primary.hoverSolidBg} shadow-lg hover:shadow-xl ${brandColors.primary.shadow} active:translate-y-0.5`
      }`}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Autenticando...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <LogIn className="w-5 h-5" />
          Iniciar Sesión
        </span>
      )}
    </button>
  )
}

export default memo(ProfessionalLoginForm)
