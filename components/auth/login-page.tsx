"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  LockKeyhole,
  AtSign,
  LogIn,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Shield,
  ArrowRight,
} from "lucide-react"

// Tipos optimizados
interface FormData {
  email: string
  password: string
  rememberMe: boolean
}

interface FormErrors {
  email?: string
  password?: string
  general?: string
}

interface FormState {
  isLoading: boolean
  loginSuccess: boolean
  activeInput: string | null
  showPassword: boolean
}

interface InputFieldProps {
  id: keyof FormData
  type?: 'email' | 'text' | 'password'
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFocus: () => void
  onBlur: () => void
  error?: string
  isActive: boolean
  icon: React.ComponentType<{ className?: string }>
  disabled?: boolean
  showPasswordToggle?: boolean
  showPassword?: boolean
  onTogglePassword?: () => void
}

// Tema con variables CSS mínimas
const themeVars = {
  '--brand-primary': '#3b82f6',
  '--brand-primary-light': '#60a5fa',
  '--status-success': '#10b981',
  '--status-error': '#ef4444',
  '--glow-primary': 'rgba(59, 130, 246, 0.4)',
  '--glow-success': 'rgba(16, 185, 129, 0.4)',
  '--glow-error': 'rgba(239, 68, 68, 0.4)',
} as React.CSSProperties

// Validadores
const validateEmail = (email: string): string | null => {
  if (!email.trim()) return "El correo electrónico es requerido"
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) ? null : "Formato de correo inválido"
}

const validatePassword = (password: string): string | null => {
  if (!password) return "La contraseña es requerida"
  return password.length >= 6 ? null : "Mínimo 6 caracteres"
}

// Componente de fondo con animaciones CSS
const BackgroundPattern: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Orb 1 */}
    <div 
      className="absolute -top-20 -left-10 w-96 h-96 rounded-full opacity-40 blur-3xl animate-pulse"
      style={{ 
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
        animation: 'float1 20s ease-in-out infinite'
      }}
    />
    
    {/* Orb 2 */}
    <div 
      className="absolute -bottom-20 -right-10 w-80 h-80 rounded-full opacity-30 blur-3xl"
      style={{ 
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
        animation: 'float2 25s ease-in-out infinite'
      }}
    />
    
    {/* Orb 3 */}
    <div 
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-20 blur-3xl"
      style={{ 
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
        animation: 'float3 30s ease-in-out infinite'
      }}
    />

    <style jsx>{`
      @keyframes float1 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(30px, -20px) scale(1.1); }
      }
      @keyframes float2 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(-20px, 30px) scale(0.9); }
      }
      @keyframes float3 {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-45%, -55%) scale(1.05); }
      }
      @media (prefers-reduced-motion: reduce) {
        div { animation: none !important; }
      }
    `}</style>
  </div>
)

// Campo de entrada optimizado con Tailwind
const InputField: React.FC<InputFieldProps> = ({
  id,
  type = "text",
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  isActive,
  icon: Icon,
  disabled = false,
  showPasswordToggle = false,
  showPassword = false,
  onTogglePassword,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (isActive && !disabled && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isActive, disabled])

  const inputType = showPasswordToggle ? (showPassword ? "text" : "password") : type

  return (
    <div className="space-y-2">
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-slate-200"
      >
        {label}
      </label>
      
      <motion.div
        className={`
          relative transition-all duration-300
          ${isActive ? 'transform -translate-y-0.5' : ''}
        `}
        whileHover={!disabled && !error && !isActive && !prefersReducedMotion ? { scale: 1.002 } : {}}
      >
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
          <Icon 
            className={`
              h-5 w-5 transition-colors duration-300
              ${error ? 'text-red-500' : isActive ? 'text-blue-400' : 'text-slate-400'}
            `} 
          />
        </div>
        
        <input
          ref={inputRef}
          id={id}
          name={id}
          type={inputType}
          autoComplete={id === "email" ? "email" : "current-password"}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          className={`
            w-full pl-11 pr-4 py-3.5 
            bg-slate-800/75 backdrop-blur-sm
            border rounded-lg 
            text-slate-100 placeholder-slate-400
            transition-all duration-300 
            focus:outline-none focus:ring-0
            disabled:opacity-60 disabled:cursor-not-allowed
            ${showPasswordToggle ? 'pr-12' : 'pr-4'}
            ${error 
              ? 'border-red-500/50 shadow-[0_0_0_1px_rgba(239,68,68,0.3),0_0_15px_rgba(239,68,68,0.4)]' 
              : isActive 
                ? 'border-blue-500/75 shadow-[0_0_0_1px_rgba(59,130,246,0.3),0_0_20px_rgba(59,130,246,0.4)]'
                : 'border-slate-600/40 hover:border-slate-500/60'
            }
          `}
          placeholder={label}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
        />

        {showPasswordToggle && onTogglePassword && (
          <motion.button
            type="button"
            onClick={onTogglePassword}
            disabled={disabled}
            className={`
              absolute inset-y-0 right-0 pr-3.5 flex items-center
              transition-all duration-300 focus:outline-none 
              focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 
              focus-visible:ring-offset-slate-800 rounded-md
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'text-red-500' : 'text-slate-400 hover:text-blue-400'}
            `}
            whileHover={!disabled && !prefersReducedMotion ? { scale: 1.1 } : {}}
            whileTap={!disabled && !prefersReducedMotion ? { scale: 0.95 } : {}}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? 
              <EyeOff className="w-5 h-5" /> : 
              <Eye className="w-5 h-5" />
            }
          </motion.button>
        )}

        {/* Focus indicator line */}
        {isActive && !error && !disabled && (
          <motion.div
            className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ transformOrigin: "left" }}
          />
        )}
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            className="flex items-center space-x-2 text-sm text-red-400"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            role="alert"
            aria-live="polite"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// Componente de éxito con Tailwind
const LoginSuccess: React.FC<{ userName: string }> = ({ userName }) => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className="text-center space-y-6"
      initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.div
        className="relative inline-flex items-center justify-center w-20 h-20 mx-auto"
        initial={{ scale: prefersReducedMotion ? 1 : 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
      >
        {/* Glow effect */}
        {!prefersReducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border-2 border-emerald-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
      </motion.div>

      <motion.div
        className="space-y-3"
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-emerald-400 bg-clip-text text-transparent">
          ¡Bienvenido!
        </h2>
        <p className="text-xl font-semibold text-slate-100">{userName}</p>
        <p className="text-slate-300">Acceso autorizado correctamente</p>
      </motion.div>

      <motion.div
        className="flex items-center justify-center space-x-2 text-sm text-slate-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <span>Redirigiendo al panel</span>
        <motion.div
          animate={!prefersReducedMotion ? { x: [0, 4, 0] } : {}}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowRight className="w-4 h-4" />
        </motion.div>
      </motion.div>

      {/* Progress dots */}
      {!prefersReducedMotion && (
        <motion.div 
          className="flex justify-center space-x-2 pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-blue-500"
              animate={{ 
                scale: [1, 1.4, 1], 
                opacity: [0.6, 1, 0.6] 
              }}
              transition={{ 
                duration: 1.6, 
                repeat: Infinity, 
                delay: i * 0.2, 
                ease: "easeInOut" 
              }}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

// Componente principal
export default function OptimizedLoginPage() {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    rememberMe: false,
  })

  const [formState, setFormState] = useState<FormState>({
    isLoading: false,
    loginSuccess: false,
    activeInput: null,
    showPassword: false,
  })

  const [errors, setErrors] = useState<FormErrors>({})

  const userName = formData.email ? 
    formData.email.split("@")[0].charAt(0).toUpperCase() + formData.email.split("@")[0].slice(1) || "Usuario" 
    : "Usuario"

  const handleInputChange = useCallback((field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Limpiar errores relevantes
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    if (field !== 'rememberMe' && errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }))
    }
  }, [errors])

  const handleFocus = useCallback((field: string) => () => {
    setFormState(prev => ({ ...prev, activeInput: field }))
  }, [])

  const handleBlur = useCallback(() => {
    setFormState(prev => ({ ...prev, activeInput: null }))
  }, [])

  const togglePassword = useCallback(() => {
    setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }))
  }, [])

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    
    const emailError = validateEmail(formData.email)
    if (emailError) newErrors.email = emailError

    const passwordError = validatePassword(formData.password)
    if (passwordError) newErrors.password = passwordError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleLogin = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    if (formState.isLoading || !validateForm()) return

    setFormState(prev => ({ ...prev, isLoading: true }))
    setErrors({})

    try {
      // Simular autenticación
      await new Promise(resolve => setTimeout(resolve, 1500))
      setFormState(prev => ({ ...prev, isLoading: false, loginSuccess: true }))
      
      setTimeout(() => {
        router.push("/dashboard")
      }, prefersReducedMotion ? 500 : 2500)
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : "Error de conexión. Intente más tarde.",
      })
      setFormState(prev => ({ ...prev, isLoading: false }))
    }
  }, [validateForm, router, formState.isLoading, prefersReducedMotion])

  // Aplicar variables CSS del tema
  useEffect(() => {
    const root = document.documentElement
    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
  }, [])

  return (
    <div 
      className="min-h-screen min-h-dvh flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden"
      style={themeVars}
    >
      <BackgroundPattern />
      
      <motion.main
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.div
          className="relative group"
          whileHover={!prefersReducedMotion ? { 
            filter: 'drop-shadow(0 0 40px rgba(59, 130, 246, 0.3))' 
          } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Card glow border */}
          <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 rounded-xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-xl p-8 shadow-2xl">
            <AnimatePresence mode="wait">
              {formState.loginSuccess ? (
                <LoginSuccess key="success" userName={userName} />
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Header */}
                  <header className="text-center space-y-4">
                    <motion.div
                      className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                      whileHover={!prefersReducedMotion ? { scale: 1.05, rotate: 5 } : {}}
                      transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    >
                      <Shield className="w-8 h-8 text-blue-400" />
                    </motion.div>
                    
                    <div className="space-y-2">
                      <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-100 via-blue-100 to-slate-100 bg-clip-text text-transparent">
                        hernia prediction
                      </h1>
                      <p className="text-slate-300 text-lg">Clínica de Hernia y Vesícula</p>
                    </div>
                    
                    <motion.div
                      className="inline-flex items-center space-x-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Conexión Verificada</span>
                    </motion.div>
                  </header>

                  {/* Form */}
                  <form className="space-y-6" onSubmit={handleLogin} noValidate>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <InputField
                        id="email"
                        type="email"
                        label="Correo Electrónico"
                        value={formData.email}
                        onChange={handleInputChange("email")}
                        onFocus={handleFocus("email")}
                        onBlur={handleBlur}
                        icon={AtSign}
                        isActive={formState.activeInput === "email"}
                        error={errors.email}
                        disabled={formState.isLoading}
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <InputField
                        id="password"
                        label="Contraseña"
                        value={formData.password}
                        onChange={handleInputChange("password")}
                        onFocus={handleFocus("password")}
                        onBlur={handleBlur}
                        icon={LockKeyhole}
                        isActive={formState.activeInput === "password"}
                        error={errors.password}
                        disabled={formState.isLoading}
                        showPasswordToggle
                        showPassword={formState.showPassword}
                        onTogglePassword={togglePassword}
                      />
                    </motion.div>

                    {/* General Error */}
                    <AnimatePresence>
                      {errors.general && (
                        <motion.div
                          className="flex items-center space-x-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          role="alert"
                        >
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm">{errors.general}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Form Options */}
                    <motion.div
                      className="flex items-center justify-between flex-wrap gap-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={formData.rememberMe}
                          onChange={handleInputChange("rememberMe")}
                          disabled={formState.isLoading}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800 disabled:opacity-50"
                        />
                        <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
                          Recordar sesión
                        </span>
                      </label>

                      <a 
                        href="#" 
                        className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors relative group"
                        onClick={(e) => { if (formState.isLoading) e.preventDefault() }}
                      >
                        ¿Olvidó su contraseña?
                        <span className="absolute -bottom-1 left-0 w-0 h-px bg-blue-400 transition-all duration-300 group-hover:w-full" />
                      </a>
                    </motion.div>

                    {/* Submit Button */}
                    <motion.button
                      type="submit"
                      disabled={formState.isLoading}
                      className={`
                        w-full relative py-4 px-6 
                        bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
                        text-white font-semibold rounded-lg 
                        transform transition-all duration-300 
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
                        disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
                        shadow-lg shadow-blue-500/25
                        ${!formState.isLoading ? 'hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-1' : ''}
                      `}
                      whileHover={!formState.isLoading && !prefersReducedMotion ? { y: -2 } : {}}
                      whileTap={!formState.isLoading && !prefersReducedMotion ? { y: 0 } : {}}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <span className="flex items-center justify-center space-x-2">
                        {formState.isLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Autenticando...</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-5 h-5" />
                            <span>Acceder al Sistema</span>
                          </>
                        )}
                      </span>
                    </motion.button>
                  </form>

                  {/* Footer */}
                  <motion.footer
                    className="text-center pt-6 border-t border-slate-700/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <p className="text-xs text-slate-400">
                      &copy; {new Date().getFullYear()} Clínica de Hernia y Vesícula. Todos los derechos reservados.
                    </p>
                  </motion.footer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.main>
    </div>
  )
}