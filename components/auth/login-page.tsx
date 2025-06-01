"use client"

import type React from "react"
import { type FC, useState, useCallback, useRef, useEffect, memo, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { LockKeyhole, AtSign, LogIn, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation" // Importar useRouter

// ======================
// Tipos
// ======================
interface FormData {
  email: string
  password: string
  rememberMe: boolean
}

interface FormState {
  isLoading: boolean
  loginSuccess: boolean
  activeInput: keyof FormData | null
  showPassword: boolean
}

// ======================
// Premium Logo Component
// ======================
const PremiumLogo: FC<{ className?: string }> = memo(({ className = "" }) => (
  <motion.div
    className="relative"
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
  >
    {/* Glow optimizado con mejor rendimiento */}
    <div
      className="absolute inset-0 opacity-30 rounded-3xl"
      style={{
        background: "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.4) 0%, transparent 70%)",
        filter: "blur(24px)",
        willChange: "transform" // Ayuda al navegador a optimizar animaciones
      }}
    />

    {/* Glass container */}
    <div className="relative p-6 rounded-2xl bg-white/[0.02] backdrop-blur-md border border-white/10 shadow-2xl">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 625 179.4"
        preserveAspectRatio="xMidYMid meet"
        className={`${className} drop-shadow-lg`}
        role="img"
        aria-labelledby="logoTitle"
      >
        <title id="logoTitle">Logo de la Clínica de Hernia y Vesícula - CHV</title>

        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>

        {/* Contenido del SVG (sin cambios, asumimos que está optimizado) */}
        <g transform="translate(0, 228.3) scale(0.1, -0.1)" stroke="none">
          <g id="monograma-chv" fill="url(#logoGrad)">
            <path d="M2926 2283 c-20 -49 -36 -91 -36 -95 0 -5 28 -8 63 -8 l63 0 58 82 c32 45 60 88 63 95 4 10 -14 13 -85 13 l-89 0 -37 -87z" />
            <path d="M1750 2116 c-173 -48 -270 -191 -257 -379 9 -134 80 -241 195 -295 51 -24 68 -27 172 -27 110 0 118 1 182 33 59 29 148 108 148 132 0 4 -33 23 -72 43 l-73 35 -41 -39 c-43 -42 -86 -59 -147 -59 -42 0 -101 22 -131 48 -48 43 -70 157 -46 241 11 39 51 86 92 107 37 19 142 18 184 -2 19 -9 46 -30 60 -47 l25 -30 52 24 c84 38 98 49 88 68 -18 32 -87 93 -131 116 -87 44 -209 56 -300 31z" />
            <path d="M4552 2114 c-72 -19 -107 -39 -156 -88 -140 -140 -136 -391 9 -525 70 -64 123 -84 237 -89 135 -6 209 19 290 97 32 32 58 63 58 69 0 7 -33 27 -72 45 l-73 33 -31 -33 c-62 -66 -164 -83 -245 -40 -135 71 -130 316 8 373 39 17 130 18 170 3 15 -5 44 -26 64 -45 l35 -34 72 31 c40 18 72 38 72 45 0 23 -94 109 -143 132 -91 43 -199 52 -295 26z" />
            <path d="M2300 1770 l0 -350 225 0 225 0 0 75 0 74 -137 3 -138 3 -3 273 -2 272 -85 0 -85 0 0 -350z" />
            <path d="M2867 2113 c-4 -3 -7 -161 -7 -350 l0 -343 90 0 90 0 0 350 0 350 -83 0 c-46 0 -87 -3 -90 -7z" />
            <path d="M3190 1770 l0 -350 90 0 90 0 2 199 3 199 148 -199 149 -199 89 0 89 0 0 350 0 351 -87 -3 -88 -3 -5 -197 -5 -197 -149 200 -148 199 -89 0 -89 0 0 -350z" />
            <path d="M4007 2113 c-4 -3 -7 -161 -7 -350 l0 -343 90 0 90 0 0 350 0 350 -83 0 c-46 0 -87 -3 -90 -7z" />
            <path d="M5296 2112 c-3 -5 -62 -154 -131 -332 -70 -178 -131 -332 -136 -342 -10 -18 -5 -19 87 -16 l97 3 22 60 23 60 137 0 138 0 22 -60 23 -60 95 -3 96 -3 -25 63 c-14 35 -75 192 -137 350 l-112 288 -97 0 c-53 0 -99 -4 -102 -8z m138 -305 c20 -51 36 -96 36 -100 0 -4 -34 -7 -75 -7 -41 0 -75 2 -75 5 0 8 72 195 75 195 2 0 19 -42 39 -93z" />
            <path d="M1013 2059 c-18 -5 -48 -25 -67 -44 -57 -57 -61 -163 -9 -225 35 -42 73 -60 128 -60 153 0 227 183 115 284 -21 19 -56 39 -77 45 -44 12 -47 12 -90 0z" />
          </g>
          <g id="texto-clinica-hernia-vesicula" fill="url(#accentGrad)">
            <path d="M4467 1308 c-13 -31 -12 -33 6 -36 12 -2 29 7 43 25 31 37 30 43 -6 43 -24 0 -32 -6 -43 -32z" />
            <path d="M4223 1225 c-53 -23 -68 -74 -35 -115 10 -12 43 -32 73 -44 39 -16 54 -27 54 -42 0 -14 -8 -20 -35 -22 -20 -2 -38 2 -45 10 -5 7 -22 14 -37 16 -22 2 -28 -2 -28 -16 0 -31 24 -54 66 -61 82 -15 144 19 144 79 0 39 -27 66 -85 87 -37 14 -51 24 -53 41 -3 19 1 22 28 22 18 0 33 -6 36 -15 4 -9 19 -15 39 -15 31 0 33 2 26 28 -4 17 -20 33 -42 44 -41 21 -63 22 -106 3z" />
            <path d="M4655 1226 c-95 -42 -121 -167 -50 -236 56 -54 158 -59 211 -9 30 28 30 33 1 46 -18 8 -28 7 -46 -8 -58 -47 -141 -6 -141 69 0 59 30 92 84 92 30 0 48 -6 60 -19 15 -16 22 -18 42 -9 29 13 30 21 7 44 -41 41 -114 54 -168 30z" />
            <path d="M1480 1090 l0 -140 35 0 35 0 0 60 0 61 68 -3 67 -3 3 -57 c3 -57 4 -58 32 -58 l30 0 0 140 0 140 -29 0 c-29 0 -30 -2 -33 -52 l-3 -53 -67 -3 -68 -3 0 56 0 55 -35 0 -35 0 0 -140z" />
            <path d="M1820 1090 l0 -140 90 0 c89 0 90 0 90 25 0 22 -4 24 -57 27 -55 3 -58 4 -61 31 -3 27 -2 27 52 27 56 0 56 0 56 30 0 29 -1 30 -50 30 -27 0 -51 5 -51 10 -6 44 -5 45 54 48 53 3 57 5 57 27 0 25 -1 25 -90 25 l-90 0 0 -140z" />
            <path d="M2070 1091 l0 -141 35 0 c35 0 35 0 35 45 0 38 3 45 19 45 12 0 33 -18 52 -45 29 -40 37 -45 72 -45 30 0 37 3 30 13 -5 6 -25 31 -43 54 -31 40 -32 44 -17 61 23 26 22 94 -2 123 -17 21 -30 24 -100 27 l-81 4 0 -141z m130 75 c6 -8 10 -25 8 -38 -2 -18 -10 -24 -35 -26 -32 -3 -33 -2 -33 37 0 36 3 41 24 41 13 0 29 -7 36 -14z" />
            <path d="M2370 1090 l0 -140 36 0 35 0 -2 80 c-1 44 0 82 2 84 2 3 32 -33 67 -80 57 -77 65 -84 97 -84 l35 0 0 140 0 140 -30 0 -30 0 0 -80 c0 -44 -4 -80 -9 -80 -11 0 -45 40 -91 108 -32 47 -39 52 -72 52 l-38 0 0 -140z" />
            <path d="M2710 1090 l0 -140 30 0 30 0 0 140 0 140 -30 0 -30 0 0 -140z" />
            <path d="M2926 1221 c-4 -5 -27 -62 -52 -128 -25 -65 -48 -124 -51 -130 -4 -9 6 -13 31 -13 30 0 37 4 42 25 6 23 10 25 68 25 57 0 64 -2 74 -25 9 -19 19 -25 42 -25 16 0 30 3 30 7 0 3 -23 66 -52 140 l-51 133 -38 0 c-21 0 -40 -4 -43 -9z m59 -107 c21 -51 20 -54 -20 -54 -19 0 -35 2 -35 5 0 9 32 85 36 85 2 0 11 -16 19 -36z" />
            <path d="M3210 1222 c0 -4 25 -47 55 -96 45 -72 55 -95 55 -132 0 -42 1 -44 30 -44 29 0 30 2 30 46 0 39 9 61 55 134 30 48 55 90 55 94 0 3 -15 6 -32 6 -30 0 -36 -6 -66 -60 -18 -33 -36 -60 -40 -60 -4 1 -24 28 -44 60 -32 52 -41 60 -68 60 -16 0 -30 -4 -30 -8z" />
            <path d="M3600 1208 c5 -13 29 -75 54 -138 l44 -115 42 0 42 0 53 138 53 137 -33 0 c-29 0 -34 -5 -53 -47 -11 -27 -27 -72 -37 -100 -9 -29 -20 -53 -25 -53 -5 0 -16 24 -25 53 -10 28 -26 73 -37 100 -19 43 -23 47 -54 47 -31 0 -33 -2 -24 -22z" />
            <path d="M3934 1217 c-2 -7 -3 -69 -2 -138 l3 -124 93 -3 92 -3 0 26 c0 24 -2 25 -60 25 l-60 0 0 30 c0 29 1 30 50 30 49 0 50 1 50 30 0 29 -1 30 -50 30 -49 0 -50 1 -50 30 l0 30 60 0 c57 0 60 1 60 25 0 25 -1 25 -90 25 -65 0 -92 -4 -96 -13z" />
            <path d="M4440 1090 l0 -140 30 0 30 0 0 140 0 140 -30 0 -30 0 0 -140z" />
            <path d="M4900 1133 c0 -129 27 -177 100 -183 63 -5 89 1 119 29 l31 29 0 111 0 111 -30 0 -30 0 0 -93 c0 -106 -13 -137 -59 -137 -50 0 -61 25 -61 133 l0 97 -35 0 -35 0 0 -97z" />
            <path d="M5230 1090 l0 -140 90 0 c89 0 90 0 90 25 0 22 -4 24 -57 27 l-58 3 -3 113 -3 112 -29 0 -30 0 0 -140z" />
            <path d="M5531 1208 c-5 -13 -23 -59 -41 -103 -18 -44 -38 -97 -46 -117 l-13 -38 34 0 c29 0 36 4 41 25 6 23 10 25 70 25 60 0 65 -2 74 -25 8 -20 16 -25 44 -25 l35 0 -38 93 c-21 50 -46 113 -55 140 -17 45 -19 47 -57 47 -32 0 -41 -4 -48 -22z m65 -93 c20 -49 18 -55 -22 -55 -30 0 -35 3 -29 18 4 9 12 29 17 45 5 15 12 27 14 27 3 0 12 -16 20 -35z" />
          </g>
        </g>
      </svg>

      <div className="mt-4 text-center">
        <p className="text-[10px] font-medium text-slate-300/70 tracking-[0.2em] uppercase">
          Excelencia en Cirugía Especializada
        </p>
      </div>
    </div>
  </motion.div>
))
PremiumLogo.displayName = "PremiumLogo"

// ======================
// Premium Background
// ======================
const PremiumBackground: FC = memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Using will-change: opacity to improve rendering performance */}
    <div
      className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-15"
      style={{
        background: "radial-gradient(circle, rgba(99,102,241,0.4) 0%, transparent 50%)",
        filter: "blur(80px)",
        willChange: "opacity" // Ayuda al navegador a optimizar cambios de opacidad
      }}
    />
    <div
      className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-15"
      style={{
        background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 50%)",
        filter: "blur(80px)",
        willChange: "opacity" // Ayuda al navegador a optimizar cambios de opacidad
      }}
    />
  </div>
))
PremiumBackground.displayName = "PremiumBackground"

// ======================
// Premium Input Field
// ======================
const PremiumInput: FC<{
  id: keyof FormData
  type?: string
  label: string
  placeholder: string
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
}> = memo(({
  id, type = "text", label, placeholder, value, onChange, onFocus, onBlur,
  error, isActive, icon: Icon, disabled = false, showPasswordToggle = false,
  showPassword = false, onTogglePassword
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isActive && !disabled && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isActive, disabled])

  const actualType = showPasswordToggle ? (showPassword ? "text" : "password") : type

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-200/90">
        {label}
      </label>
      <div className={`relative transition-all duration-300 ${isActive ? 'transform scale-[1.02]' : ''}`}>
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon className={`h-5 w-5 transition-colors duration-200 ${
            error ? "text-red-400" : isActive ? "text-indigo-400" : "text-slate-400"
          }`} />
        </div>

        <input
          ref={inputRef}
          id={id}
          name={id}
          type={actualType}
          autoComplete={id === "email" ? "email" : "current-password"}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full pl-12 pr-${showPasswordToggle ? "12" : "4"} py-3.5
            bg-slate-800/50 backdrop-blur-sm border-2 rounded-xl
            text-slate-100 placeholder-slate-400/70 font-medium
            transition-all duration-300 focus:outline-none
            ${error
              ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] dark:shadow-[0_0_15px_rgba(153,27,27,0.2)]"
              : isActive
                ? "border-indigo-500/60 shadow-[0_0_25px_rgba(99,102,241,0.2)] dark:shadow-[0_0_20px_rgba(67,56,202,0.15)] bg-slate-800/70"
                : "border-slate-900 hover:border-slate-900 dark:border-slate-950 dark:hover:border-slate-900"
            }
          `}
        />

        {showPasswordToggle && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            disabled={disabled}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-400 transition-colors duration-200"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}

        {/* Elegant focus indicator - optimizado */}
        {isActive && !error && (
          <div
            className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            style={{
              animation: "slowPulse 2s infinite ease-in-out",
              willChange: "opacity" // Ayuda al navegador a optimizar esta animación
            }}
          />
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 text-sm text-red-400 pt-1"
        >
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  )
})
PremiumInput.displayName = "PremiumInput"

// ======================
// Dark Professional Button
// ======================
const DarkProfessionalButton: FC<{
  isLoading: boolean
  onClick: () => void
  disabled: boolean
}> = memo(({ isLoading, onClick, disabled }) => (
  <motion.button
    type="button" // Cambiado a button si el form se encarga del submit, o submit si este es el botón principal de envío
    onClick={onClick} // Puede ser redundante si type="submit" y el form tiene onSubmit
    disabled={disabled}
    className="group relative w-full overflow-hidden" // overflow-hidden es importante para el efecto shimmer
    whileHover={{ scale: disabled ? 1 : 1.01 }}
    whileTap={{ scale: disabled ? 1 : 0.99 }}
  >
    {/* Base button with dark gradient */}
    <div className={`
      relative w-full py-4 px-8 rounded-xl font-semibold text-base
      bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800
      border-2 border-slate-700
      text-slate-100
      transition-all duration-500
      ${disabled
        ? 'opacity-60 cursor-not-allowed'
        : 'hover:border-slate-600 shadow-lg hover:shadow-xl hover:shadow-slate-900/50'
      }
    `}>
      {/* Subtle animated gradient overlay */}
      <div
        className={`absolute inset-0 opacity-0 transition-opacity duration-500 rounded-xl
          ${!disabled && !isLoading ? 'group-hover:opacity-100' : ''}
        `}
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.1) 50%, transparent 100%)',
          animation: !disabled && !isLoading ? 'shimmer 3s ease-in-out infinite' : 'none',
          willChange: 'transform, opacity', // Optimización para la animación shimmer
          transform: 'translateZ(0)' // Promueve la aceleración por hardware
        }}
      />

      {/* Premium glass effect */}
      <div
        className="absolute inset-0 rounded-xl opacity-50"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)'
        }}
      />

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center space-x-3">
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-slate-400/30 border-t-slate-100 rounded-full animate-spin" />
            <span>Autenticando...</span>
          </>
        ) : (
          <>
            <LogIn className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
            <span>Acceder al Sistema</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </>
        )}
      </span>

      {/* Bottom accent line */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent
          transition-opacity duration-500
          ${!disabled ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}
        `}
      />
    </div>

    {/* CSS animation (ya estaba aquí, solo asegurando que `transform: translateZ(0)` esté en el @keyframes si es necesario) */}
    <style jsx>{`
      @keyframes shimmer {
        0% { transform: translateX(-100%) translateZ(0); } /* Añadido translateZ(0) para consistencia */
        100% { transform: translateX(200%) translateZ(0); } /* Añadido translateZ(0) */
      }
    `}</style>
  </motion.button>
))
DarkProfessionalButton.displayName = "DarkProfessionalButton"

// ======================
// Success Component Premium
// ======================
const LoginSuccess: FC<{ userName: string }> = memo(({ userName }) => (
  <motion.div
    className="text-center space-y-8"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
  >
    <div className="relative inline-flex items-center justify-center w-24 h-24 mx-auto">
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 blur-xl"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} // ease: "easeInOut" para suavizar
        style={{ willChange: "transform" }} // Optimización
      />
      <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/30 border-2 border-emerald-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
        <CheckCircle className="w-12 h-12 text-emerald-400" />
      </div>
    </div>

    <div className="space-y-3">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-100 to-emerald-400 bg-clip-text text-transparent">
        ¡Bienvenido de nuevo!
      </h2>
      <p className="text-xl font-semibold text-slate-100">{userName}</p>
      <p className="text-slate-300">Acceso autorizado correctamente.</p>
    </div>

    <motion.div
      className="flex items-center justify-center space-x-2 text-sm text-slate-300"
      animate={{ x: [0, 5, 0] }} // Animación sutil
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      style={{ willChange: "transform" }} // Optimización
    >
      <span>Redirigiendo al panel</span>
      <ArrowRight className="w-4 h-4" />
    </motion.div>
  </motion.div>
))
LoginSuccess.displayName = "LoginSuccess"

// ======================
// Validadores
// ======================
const validateEmail = (email: string): string | null => {
  if (!email.trim()) return "El correo electrónico es requerido."
  // Expresión regular mejorada para validación de email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) ? null : "Formato de correo inválido."
}

const validatePassword = (password: string): string | null => {
  if (!password) return "La contraseña es requerida."
  return password.length >= 6 ? null : "La contraseña debe tener mínimo 6 caracteres."
}

// ======================
// Main Premium Component
// ======================
const PremiumLoginForm: FC = () => {
  const router = useRouter() // Hook para la navegación
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

  const [errors, setErrors] = useState<Partial<FormData & { general?: string }>>({})

  const userName = useMemo(() => {
    const localPart = formData.email.split("@")[0] || ""
    return localPart ? localPart.charAt(0).toUpperCase() + localPart.slice(1) : "Usuario"
  }, [formData.email])

  const handleInputChange = useCallback(
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.type === "checkbox" ? e.target.checked : e.target.value
      setFormData(prev => ({ ...prev, [field]: value }))
      // Limpiar error específico cuando el usuario empieza a corregirlo
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      }
      // Limpiar error general si existe y se modifica algún campo
      if (errors.general) {
         setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors.general
          return newErrors
        })
      }
    },
    [errors], // Incluir errors en las dependencias
  )

  const handleFocus = useCallback((field: keyof FormData) => {
    setFormState(prev => ({ ...prev, activeInput: field }))
  }, [])

  const handleBlur = useCallback(() => {
    setFormState(prev => ({ ...prev, activeInput: null }))
  }, [])

  const togglePasswordVisibility = useCallback(() => { // Renombrado para claridad
    setFormState(prev => ({ ...prev, showPassword: !prev.showPassword }))
  }, [])

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<FormData & { general?: string }> = {}

    const emailError = validateEmail(formData.email)
    if (emailError) newErrors.email = emailError

    const passwordError = validatePassword(formData.password)
    if (passwordError) newErrors.password = passwordError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData.email, formData.password]) // Dependencias más específicas

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return // Validar primero
    if (formState.isLoading) return // Evitar envíos múltiples

    setFormState(prev => ({ ...prev, isLoading: true }))
    setErrors({}) // Limpiar errores previos

    try {
      // Simulación de llamada a API
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Aquí iría la lógica real de autenticación.
      // Si la autenticación es exitosa:
      setFormState(prev => ({ ...prev, isLoading: false, loginSuccess: true }))

      // Redirigir después de un breve retraso para mostrar el mensaje de éxito
      setTimeout(() => {
        router.push('/dashboard') // Redirección a /dashboard
      }, 2500) // Ajustar este tiempo según sea necesario

    } catch (error) {
      console.error("Login error:", error) // Loguear el error real
      setErrors({
        general: error instanceof Error ? error.message : "Error de conexión. Intente más tarde.",
      })
      setFormState(prev => ({ ...prev, isLoading: false, loginSuccess: false }))
    }
  }, [validateForm, formState.isLoading, router, formData.rememberMe]) // Añadir router y formData.rememberMe a dependencias

  // Efecto para manejar el foco inicial o cuando se muestra el formulario
  const emailInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!formState.loginSuccess && emailInputRef.current) {
      // Podrías querer enfocar el primer campo al montar, o bajo ciertas condiciones
      // emailInputRef.current.focus(); // Descomentar si se desea auto-foco inicial
    }
  }, [formState.loginSuccess]);


  return (
    <>
      <style jsx global>{`
        /* Custom checkbox styling */
        input[type="checkbox"] {
          appearance: none;
          width: 18px;
          height: 18px;
          border: 2px solid rgb(51 65 85); /* slate-700 - más oscuro */
          border-radius: 4px;
          background-color: rgb(15 23 42 / 0.8); /* slate-900 con opacidad */
          transition: all 0.2s ease-in-out;
          position: relative;
          cursor: pointer;
          flex-shrink: 0; /* Evita que se encoja en flex layouts */
        }

        input[type="checkbox"]:checked {
          background-color: rgb(99 102 241); /* indigo-500 */
          border-color: rgb(99 102 241); /* indigo-500 */
        }

        input[type="checkbox"]:checked::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 14px;
          font-weight: bold;
          line-height: 1; /* Asegura centrado vertical */
        }

        input[type="checkbox"]:hover:not(:disabled) {
          border-color: rgb(129 140 248); /* indigo-400 */
        }
        
        input[type="checkbox"]:focus-visible { /* Estilo de foco para accesibilidad */
          outline: 2px solid rgb(99 102 241);
          outline-offset: 2px;
        }

        /* Mobile responsive */
        @media (max-width: 640px) {
          .login-form-container {
            padding: 2rem 1.5rem; /* Ajustar padding para móviles */
          }
          /* Podrías querer reducir el tamaño de fuente o espaciado en móviles */
        }

        /* Optimized animations */
        @keyframes slowPulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        /* Nota: La animación 'shimmer' está definida localmente 
          en el componente DarkProfessionalButton y no necesita
          ser global si solo se usa allí. 
        */
      `}</style>

      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0a192f] via-[#0d2250] to-[#112d5e] relative overflow-hidden font-sans"> {/* Añadido font-sans como base */}
        <PremiumBackground />

        <motion.main
          className="w-full max-w-lg relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="relative group">
            {/* Premium glow effect - optimizado para rendimiento */}
            <div
              className="absolute -inset-1 bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-pink-600/30 rounded-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-700"
              style={{
                filter: "blur(12px)", // Aumentado un poco el blur para el efecto
                willChange: "opacity, filter", // Añadido filter a will-change
                transform: "translateZ(0)" // Promueve aceleración por hardware
              }}
            />

            <div className="relative bg-[#0a1a2f]/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-800 dark:border-slate-900 rounded-2xl p-8 sm:p-10 shadow-2xl login-form-container"> {/* Bordes más oscuros */}
              <AnimatePresence mode="wait">
                {formState.loginSuccess ? (
                  <LoginSuccess key="success" userName={userName} />
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.3 } }} // Transición de salida más rápida
                    className="space-y-8"
                  >
                    <header className="text-center">
                      <PremiumLogo className="w-52 sm:w-60 h-auto mx-auto" /> {/* Tamaño responsivo */}
                    </header>

                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6"> {/* Usar form y onSubmit */}
                      <PremiumInput
                        // ref={emailInputRef} // Pasar ref al input interno si es necesario, o manejarlo dentro de PremiumInput
                        id="email"
                        type="email"
                        label="Correo Electrónico"
                        placeholder="nombre@clinica.com"
                        value={formData.email}
                        onChange={handleInputChange("email")}
                        onFocus={() => handleFocus("email")}
                        onBlur={handleBlur}
                        icon={AtSign}
                        isActive={formState.activeInput === "email"}
                        error={errors.email}
                        disabled={formState.isLoading}
                      />

                      <PremiumInput
                        id="password"
                        label="Contraseña"
                        placeholder="Ingrese su contraseña"
                        value={formData.password}
                        onChange={handleInputChange("password")}
                        onFocus={() => handleFocus("password")}
                        onBlur={handleBlur}
                        icon={LockKeyhole}
                        isActive={formState.activeInput === "password"}
                        error={errors.password}
                        disabled={formState.isLoading}
                        showPasswordToggle
                        showPassword={formState.showPassword}
                        onTogglePassword={togglePasswordVisibility} // Usar nombre actualizado
                      />

                      {errors.general && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center space-x-3 p-3 sm:p-4 bg-red-900/30 border border-red-700/40 rounded-xl text-red-300" // Ajuste de colores y padding
                        >
                          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
                          <span className="text-sm">{errors.general}</span>
                        </motion.div>
                      )}

                      <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-4 sm:gap-0"> {/* Layout responsivo para checkbox y link */}
                        <label className="flex items-center space-x-2.5 cursor-pointer group"> {/* Aumentado space-x */}
                          <input
                            type="checkbox"
                            name="rememberMe" // Añadido name
                            checked={formData.rememberMe}
                            onChange={handleInputChange("rememberMe")}
                            disabled={formState.isLoading}
                            className="form-checkbox" // Clase para posible estilizado adicional
                          />
                          <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">Recordar sesión</span>
                        </label>

                        <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors duration-200 hover:underline">
                          ¿Olvidó su contraseña?
                        </a>
                      </div>

                      <DarkProfessionalButton
                        isLoading={formState.isLoading}
                        onClick={handleSubmit} 
                        // El type="button" es correcto aquí ya que el form tiene su propio onSubmit.
                        // Si este botón fuera a enviar el formulario directamente y no hubiera <form onSubmit>, sería type="submit".
                        disabled={formState.isLoading || !!errors.email || !!errors.password} // Deshabilitar si hay errores de campo
                      />
                    </form>

                    <footer className="text-center pt-6 border-t border-slate-900"> {/* Borde mucho más oscuro */}
                      <p className="text-xs text-slate-400/80"> {/* Texto un poco más tenue */}
                        &copy; {new Date().getFullYear()} Clínica de Hernia y Vesícula. Todos los derechos reservados.
                      </p>
                    </footer>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.main>
      </div>
    </>
  )
}

export default PremiumLoginForm
