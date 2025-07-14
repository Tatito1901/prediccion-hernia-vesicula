// components/auth/OptimizedLoginForm.tsx
"use client"

import { useSearchParams } from "next/navigation"
import { useState, type FC } from "react"
// useFormStatus es un hook de React para obtener el estado de envío de un formulario padre.
// Es la forma moderna de manejar estados de carga con Server Actions.
import { useFormStatus } from "react-dom"

// Importamos la Server Action que creamos previamente.
import { login } from "@/components/auth/actions"

// --- Iconos y Estilos (Sin cambios, se mantienen para preservar el diseño) ---

const LockKeyhole = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="m7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const AtSign = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <circle cx="12" cy="12" r="4" />
    <path d="M16 12v1a4 4 0 0 0-8 0v-1a4 4 0 0 0 8 0Z" />
    <path d="M16 8v4" />
  </svg>
)
const LogIn = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <polyline points="10 17 15 12 10 7" />
    <line x1="15" x2="3" y1="12" y2="12" />
  </svg>
)
const Eye = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const EyeOff = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <path d="m9.9 9.9 11.2 11.2" />
    <path d="M10.7 10.7C10.2 11.1 10 11.5 10 12c0 1.1.9 2 2 2 .5 0 1-.2 1.3-.7l.7.7" />
    <path d="M2 12s3-7 10-7 10 7 10 7-1.2 2.1-3.1 4.1" />
    <path d="M7.7 7.7C6.1 8.8 4.2 10.3 2 12" />
  </svg>
)
const AlertCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
)

const customStyles = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%, 100% { opacity: 0.15; } 50% { opacity: 0.25; } }
  @keyframes shine { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
  @keyframes spin { to { transform: rotate(360deg); } }
  .animate-fadeIn { animation: fadeIn 0.6s ease-out; }
  .gradient-pulse { animation: pulse 4s ease-in-out infinite; }
  .btn-shine { position: relative; overflow: hidden; }
  .btn-shine::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent); transition: left 0.5s; }
  .btn-shine:hover::before { animation: shine 0.5s ease-out; }
  .spinner { animation: spin 1s linear infinite; }
  .custom-checkbox { appearance: none; width: 18px; height: 18px; border: 2px solid #475569; border-radius: 4px; background: rgba(30, 41, 59, 0.5); cursor: pointer; transition: all 0.2s; position: relative; }
  .custom-checkbox:checked { background: #6366f1; border-color: #6366f1; }
  .custom-checkbox:checked::after { content: ''; position: absolute; left: 5px; top: 1px; width: 4px; height: 8px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
  .custom-checkbox:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
`

/**
 * Componente del botón de login.
 * Utiliza el hook `useFormStatus` para reaccionar al estado de envío del formulario.
 * Esto permite mostrar un estado de carga y deshabilitar el botón automáticamente
 * mientras la Server Action `login` se está ejecutando.
 */
function LoginButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full py-3.5 px-6 rounded-lg font-medium text-white transition-all duration-200 btn-shine ${pending
          ? 'bg-slate-700 cursor-wait opacity-60'
          : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl hover:shadow-indigo-500/25 hover:-translate-y-0.5'
        }`}
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" />
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


const OptimizedLoginForm: FC = () => {
  // El estado ahora es mucho más simple. Solo manejamos la UI que es puramente del cliente.
  const [showPassword, setShowPassword] = useState(false)
  const [activeField, setActiveField] = useState<string | null>(null)

  // Leemos el mensaje de error de la URL si la Server Action nos redirige aquí.
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get('message')

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />

      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full rounded-full bg-indigo-600/10 blur-3xl gradient-pulse" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full bg-purple-600/10 blur-3xl gradient-pulse" />
        </div>

        <div className="w-full max-w-md relative z-10 animate-fadeIn">
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl opacity-75 blur-sm" />

            {/* El formulario ahora apunta directamente a la Server Action `login` */}
            <form action={login} className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg">
                  <span className="text-2xl font-bold text-white">CHV</span>
                </div>
                <h1 className="text-xl font-semibold text-slate-100">Clínica de Hernia y Vesícula</h1>
                <p className="text-xs text-slate-400 mt-1">Sistema de Gestión Médica del Dr. Medina Andrade</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <AtSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${errorMessage ? 'text-red-400' : activeField === 'email' ? 'text-indigo-400' : 'text-slate-500'
                      }`} />
                    <input
                      name="email" // El `name` es crucial para que la Server Action lo reciba.
                      type="email"
                      onFocus={() => setActiveField('email')}
                      onBlur={() => setActiveField(null)}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-800/50 border rounded-lg text-slate-100 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${errorMessage
                          ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500'
                          : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/30'
                        }`}
                      placeholder="nombre@clinica.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <LockKeyhole className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-200 ${errorMessage ? 'text-red-400' : activeField === 'password' ? 'text-indigo-400' : 'text-slate-500'
                      }`} />
                    <input
                      name="password" // El `name` es crucial.
                      type={showPassword ? "text" : "password"}
                      onFocus={() => setActiveField('password')}
                      onBlur={() => setActiveField(null)}
                      className={`w-full pl-10 pr-12 py-3 bg-slate-800/50 border rounded-lg text-slate-100 placeholder-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${errorMessage
                          ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500'
                          : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/30'
                        }`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 transition-colors duration-200"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Mostramos el error general que viene de la URL. */}
                {errorMessage && (
                  <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg text-sm text-red-400 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {errorMessage.replace('Error: ', '')}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="rememberMe" // Opcional, si quieres manejarlo en el servidor.
                      className="custom-checkbox"
                    />
                    <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
                      Recordar sesión
                    </span>
                  </label>
                  <a
                    href="#"
                    className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors duration-200 hover:underline"
                  >
                    ¿Olvidó su contraseña?
                  </a>
                </div>

                {/* El botón ahora es un componente separado para manejar su propio estado de carga. */}
                <LoginButton />
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-500">
                  © {new Date().getFullYear()} Clínica de Hernia y Vesícula. Todos los derechos reservados.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

export default OptimizedLoginForm
