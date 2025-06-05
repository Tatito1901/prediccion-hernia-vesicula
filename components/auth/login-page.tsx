"use client"

import { useState, useRef, type FC } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LockKeyhole, AtSign, LogIn, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

// Estado unificado del formulario
interface FormState {
  email: string
  password: string
  rememberMe: boolean
  isLoading: boolean
  loginSuccess: boolean
  showPassword: boolean
  activeField: string | null
  errors: {
    email?: string
    password?: string
    general?: string
  }
}

const PremiumLoginForm: FC = () => {
  const router = useRouter()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  
  const [state, setState] = useState<FormState>({
    email: "",
    password: "",
    rememberMe: false,
    isLoading: false,
    loginSuccess: false,
    showPassword: false,
    activeField: null,
    errors: {}
  })

  // Validación simplificada
  const validate = () => {
    const errors: FormState['errors'] = {}
    
    if (!state.email.trim()) {
      errors.email = "El correo es requerido"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
      errors.email = "Formato de correo inválido"
    }
    
    if (!state.password) {
      errors.password = "La contraseña es requerida"
    } else if (state.password.length < 6) {
      errors.password = "Mínimo 6 caracteres"
    }
    
    setState(prev => ({ ...prev, errors }))
    return Object.keys(errors).length === 0
  }

  // Manejo de envío simplificado
  const handleSubmit = async () => {
    if (!validate() || state.isLoading) return
    
    setState(prev => ({ ...prev, isLoading: true, errors: {} }))
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      setState(prev => ({ ...prev, isLoading: false, loginSuccess: true }))
      
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        errors: { general: "Error de conexión. Intente nuevamente." }
      }))
    }
  }

  // Actualización de campo unificada
  const updateField = (field: keyof FormState, value: any) => {
    setState(prev => ({
      ...prev,
      [field]: value,
      errors: { ...prev.errors, [field]: undefined, general: undefined }
    }))
  }

  // Manejo de tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !state.isLoading) {
      handleSubmit()
    }
  }

  return (
    <>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.25; }
        }
        
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }
        
        .gradient-pulse {
          animation: pulse 4s ease-in-out infinite;
        }
        
        .btn-shine {
          position: relative;
          overflow: hidden;
        }
        
        .btn-shine::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          transition: left 0.5s;
        }
        
        .btn-shine:hover::before {
          animation: slideIn 0.5s ease-out;
        }
        
        /* Checkbox optimizado */
        input[type="checkbox"] {
          appearance: none;
          width: 18px;
          height: 18px;
          border: 2px solid #475569;
          border-radius: 4px;
          background: rgba(30, 41, 59, 0.5);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }
        
        input[type="checkbox"]:checked {
          background: #6366f1;
          border-color: #6366f1;
        }
        
        input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 1px;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        
        input[type="checkbox"]:focus-visible {
          outline: 2px solid #6366f1;
          outline-offset: 2px;
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Fondos simplificados */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full rounded-full bg-indigo-600/10 blur-3xl gradient-pulse" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full rounded-full bg-purple-600/10 blur-3xl gradient-pulse" />
        </div>

        <motion.div 
          className="w-full max-w-md relative z-10 animate-fadeIn"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative">
            {/* Borde con gradiente sutil */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl opacity-75 blur" />
            
            <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <AnimatePresence mode="wait">
                {state.loginSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40">
                      <CheckCircle className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-100 mb-2">¡Bienvenido!</h2>
                    <p className="text-slate-400">Redirigiendo al panel...</p>
                  </motion.div>
                ) : (
                  <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {/* Logo simplificado */}
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
                        <span className="text-2xl font-bold text-white">CHV</span>
                      </div>
                      <h1 className="text-xl font-semibold text-slate-100">Clínica de Hernia y Vesícula</h1>
                      <p className="text-xs text-slate-400 mt-1">Sistema de Gestión Médica</p>
                    </div>

                    <div className="space-y-5">
                      {/* Campo Email */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Correo Electrónico
                        </label>
                        <div className="relative">
                          <AtSign className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                            state.errors.email ? 'text-red-400' : state.activeField === 'email' ? 'text-indigo-400' : 'text-slate-500'
                          }`} />
                          <input
                            ref={emailRef}
                            type="email"
                            value={state.email}
                            onChange={(e) => updateField('email', e.target.value)}
                            onFocus={() => setState(prev => ({ ...prev, activeField: 'email' }))}
                            onBlur={() => setState(prev => ({ ...prev, activeField: null }))}
                            onKeyPress={handleKeyPress}
                            className={`w-full pl-10 pr-4 py-3 bg-slate-800/50 border rounded-lg text-slate-100 placeholder-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                              state.errors.email 
                                ? 'border-red-500/50 focus:ring-red-500/30' 
                                : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/30'
                            }`}
                            placeholder="nombre@clinica.com"
                            disabled={state.isLoading}
                          />
                        </div>
                        {state.errors.email && (
                          <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {state.errors.email}
                          </p>
                        )}
                      </div>

                      {/* Campo Contraseña */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Contraseña
                        </label>
                        <div className="relative">
                          <LockKeyhole className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                            state.errors.password ? 'text-red-400' : state.activeField === 'password' ? 'text-indigo-400' : 'text-slate-500'
                          }`} />
                          <input
                            ref={passwordRef}
                            type={state.showPassword ? "text" : "password"}
                            value={state.password}
                            onChange={(e) => updateField('password', e.target.value)}
                            onFocus={() => setState(prev => ({ ...prev, activeField: 'password' }))}
                            onBlur={() => setState(prev => ({ ...prev, activeField: null }))}
                            onKeyPress={handleKeyPress}
                            className={`w-full pl-10 pr-12 py-3 bg-slate-800/50 border rounded-lg text-slate-100 placeholder-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                              state.errors.password 
                                ? 'border-red-500/50 focus:ring-red-500/30' 
                                : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/30'
                            }`}
                            placeholder="••••••••"
                            disabled={state.isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => updateField('showPassword', !state.showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-400 transition-colors"
                            tabIndex={-1}
                          >
                            {state.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {state.errors.password && (
                          <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {state.errors.password}
                          </p>
                        )}
                      </div>

                      {/* Error general */}
                      {state.errors.general && (
                        <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg text-sm text-red-400">
                          {state.errors.general}
                        </div>
                      )}

                      {/* Recordar y olvidé contraseña */}
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.rememberMe}
                            onChange={(e) => updateField('rememberMe', e.target.checked)}
                            disabled={state.isLoading}
                          />
                          <span className="text-sm text-slate-300">Recordar sesión</span>
                        </label>
                        <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                          ¿Olvidó su contraseña?
                        </a>
                      </div>

                      {/* Botón de envío */}
                      <button
                        onClick={handleSubmit}
                        disabled={state.isLoading || !state.email || !state.password}
                        className={`w-full py-3.5 px-6 rounded-lg font-medium text-white transition-all btn-shine ${
                          state.isLoading || !state.email || !state.password
                            ? 'bg-slate-700 cursor-not-allowed opacity-60'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                        }`}
                      >
                        {state.isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Autenticando...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <LogIn className="w-5 h-5" />
                            Iniciar Sesión
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                      <p className="text-xs text-slate-500">
                        © {new Date().getFullYear()} Clínica de Hernia y Vesícula. Todos los derechos reservados.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

export default PremiumLoginForm