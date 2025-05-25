"use client"

import type React from "react"
import { useState, useCallback, useMemo, memo, useEffect, useRef } from "react"
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
  Sparkles,
  ArrowRight,
} from "lucide-react"

// Interfaces
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

interface InputFieldProps {
  id: string
  type?: string
  label: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFocus: () => void
  onBlur: () => void
  error?: string
  isActive: boolean
  icon: React.ElementType
  inputRef?: React.RefObject<HTMLInputElement>
  className?: string
  onToggle?: () => void
  showPassword?: boolean
}

interface BackgroundOrbsProps {
  prefersReducedMotion: boolean
}

interface FormState {
  isLoading: boolean
  loginSuccess: boolean
  activeInput: string | null
  showPassword: boolean
}

interface LoginSuccessProps {
  prefersReducedMotion: boolean
  userName?: string
}

// Theme configuration - Moved outside component to prevent recreation
const theme = {
  colors: {
    bg: {
      primary: "#000205",
      gradient: "linear-gradient(135deg, #000205 0%, #0d1f36 100%)",
      glass: "rgba(13, 25, 42, 0.85)",
      input: "rgba(15, 23, 42, 0.7)",
      error: "rgba(239, 68, 68, 0.12)",
      success: "rgba(16, 185, 129, 0.12)",
    },
    border: {
      default: "rgba(148, 163, 184, 0.2)",
      focus: "rgba(59, 130, 246, 0.6)",
      error: "rgba(239, 68, 68, 0.35)",
      success: "rgba(16, 185, 129, 0.35)",
    },
    brand: {
      primary: "#3b82f6",
      primaryLight: "#60a5fa",
      primaryDark: "#2563eb",
      accent: "#0ea5e9",
      accentLight: "#38bdf8",
    },
    text: {
      primary: "#f8fafc",
      secondary: "#e2e8f0",
      muted: "#94a3b8",
      dim: "#64748b",
    },
    status: {
      error: "#ef4444",
      success: "#10b981",
      warning: "#f59e0b",
    },
    glow: {
      primary: "rgba(59, 130, 246, 0.65)",
      accent: "rgba(14, 165, 233, 0.55)",
      success: "rgba(16, 185, 129, 0.55)",
      error: "rgba(239, 68, 68, 0.55)",
    },
    shadow: {
      primary: "rgba(59, 130, 246, 0.35)",
      dark: "rgba(0, 0, 0, 0.35)",
    },
  },
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
  },
}

// Validation utilities
const validators = {
  email: (email: string): string | null => {
    if (!email.trim()) return "El correo electrónico es requerido"
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return "Por favor, ingrese un correo electrónico válido"
    return null
  },
  password: (password: string): string | null => {
    if (!password) return "La contraseña es requerida"
    if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres"
    return null
  },
}

// Animation variants factory
const createAnimationVariants = (prefersReducedMotion: boolean) => ({
  form: {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.1 : 0.5,
        ease: "easeOut",
      },
    },
  },
  inputFocus: {
    focus: {
      scale: prefersReducedMotion ? 1 : 1.01,
      boxShadow: `0 0 20px ${theme.colors.glow.primary}`,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.3,
        ease: "easeOut",
      },
    },
    blur: {
      scale: 1,
      boxShadow: "none",
      transition: {
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: "easeOut",
      },
    },
  },
  fadeInOut: {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, y: prefersReducedMotion ? 0 : -10, transition: { duration: 0.3, ease: "easeIn" } },
  },
  staggerContainer: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.15,
        delayChildren: 0.1,
      },
    },
  },
  staggerItem: {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  },
  // Success animation variants
  successContainer: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.3 },
    },
  },
  successItem: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  },
  iconContainer: {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: 0.1,
      },
    },
  },
  checkmark: {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 0.6, ease: "easeOut", delay: 0.3 },
        opacity: { duration: 0.1, delay: 0.3 },
      },
    },
  },
  sparkle: {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: [0, 1.2, 0],
      opacity: [0, 1, 0],
      transition: {
        duration: 1.5,
        delay: 0.5 + i * 0.1,
        ease: "easeOut",
        repeat: Number.POSITIVE_INFINITY,
        repeatDelay: 2,
      },
    }),
  },
  progressBar: {
    hidden: { scaleX: 0 },
    visible: {
      scaleX: 1,
      transition: {
        duration: 2,
        ease: "easeInOut",
        delay: 0.8,
      },
    },
  },
})

// Pre-defined styles
const styles = {
  containerStyles: {
    background: theme.colors.bg.gradient,
  },
  cardStyles: {
    background: theme.colors.bg.glass,
    backdropFilter: "blur(16px) saturate(180%)",
    WebkitBackdropFilter: "blur(16px) saturate(180%)",
    boxShadow: `0 10px 30px ${theme.colors.shadow.dark}, 0 0 30px ${theme.colors.shadow.primary}20, inset 0 1px 0 rgba(255, 255, 255, 0.05)`,
  },
  headingGradient: {
    background: `linear-gradient(135deg, ${theme.colors.text.primary} 0%, ${theme.colors.brand.primaryLight} 100%)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  buttonGradient: {
    background: `linear-gradient(135deg, #2a3f5f 0%, #3a6ea5 50%, #1e3a5f 100%)`,
    backgroundSize: "200% 100%",
    boxShadow: `0 4px 12px rgba(42, 63, 95, 0.5), 0 0 0 1px rgba(58, 110, 165, 0.2)`,
  },
  successCardStyles: {
    background: `linear-gradient(135deg, ${theme.colors.bg.glass} 0%, rgba(13, 25, 42, 0.95) 100%)`,
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: `1px solid ${theme.colors.border.success}`,
    boxShadow: `
      0 20px 40px -10px ${theme.colors.shadow.dark},
      0 0 60px ${theme.colors.glow.success}30,
      inset 0 1px 0 rgba(255, 255, 255, 0.1)
    `,
  },
  errorIconColor: theme.colors.status.error,
}

// Optimized Input component
const InputField = memo(
  ({
    id,
    type = "text",
    label,
    value,
    onChange,
    onFocus,
    onBlur,
    error,
    isActive,
    icon: IconComponent,
    inputRef,
    className = "",
    onToggle,
    showPassword,
  }: InputFieldProps) => {
    const prefersReducedMotionHook = useReducedMotion()
    const { inputFocus: inputAnimationVariants, fadeInOut: errorAnimationVariants } = useMemo(
      () => createAnimationVariants(prefersReducedMotionHook ?? false),
      [prefersReducedMotionHook],
    )

    const inputStyles = useMemo(
      () => ({
        backgroundColor: theme.colors.bg.input,
        border: `1px solid ${error ? theme.colors.border.error : isActive ? theme.colors.border.focus : theme.colors.border.default}`,
        color: theme.colors.text.primary,
        outline: "none",
        boxShadow: isActive
          ? `0 0 0 1px ${theme.colors.brand.primary}40, 0 0 20px ${theme.colors.glow.primary}`
          : error
            ? `0 0 0 1px ${theme.colors.status.error}40, 0 0 15px ${theme.colors.glow.error}`
            : "none",
      }),
      [isActive, error],
    )

    const iconColor = useMemo(
      () => (error ? theme.colors.status.error : isActive ? theme.colors.brand.primary : theme.colors.text.dim),
      [isActive, error],
    )

    const inputRefLocal = useRef<HTMLInputElement>(null)

    useEffect(() => {
      if (isActive && inputRefLocal.current) {
        inputRefLocal.current.focus()
      }
    }, [isActive])

    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="block text-sm font-medium" style={{ color: theme.colors.text.secondary }}>
          {label}
        </label>
        <motion.div
          className="relative"
          variants={inputAnimationVariants}
          animate={isActive ? "focus" : "blur"}
          whileHover={{
            scale: !error && !isActive && !className.includes("disabled") ? 1.005 : 1,
            boxShadow: !error && !isActive && !className.includes("disabled") ? `0 0 15px ${theme.colors.glow.primary}30` : "none",
            transition: {
              scale: { duration: 0.3, ease: "easeOut" },
              boxShadow: { duration: 0.3, ease: "easeOut" },
            },
          }}
          style={{ willChange: "transform, box-shadow" }}
        >
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <IconComponent className="h-5 w-5 transition-colors duration-300" style={{ color: iconColor }} />
          </div>
          <input
            ref={inputRef ?? inputRefLocal}
            id={id}
            name={id}
            type={showPassword ? (onToggle ? (showPassword ? "text" : "password") : type) : type}
            autoComplete={id === "email" ? "email" : "current-password"}
            required
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            className={`w-full pl-11 ${showPassword ? "pr-12" : "pr-4"} py-2.5 rounded-lg transition-all duration-300 hover:shadow-lg focus:outline-none ${className}`}
            placeholder={label}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />

          {showPassword && onToggle && (
            <motion.button
              type="button"
              onClick={onToggle}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-glass"
              whileHover={!prefersReducedMotionHook ? { scale: 1.1, color: theme.colors.brand.primary } : {}}
              whileTap={!prefersReducedMotionHook ? { scale: 0.95 } : {}}
              style={{ color: iconColor }}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </motion.button>
          )}

          {isActive && !error && (
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 w-full rounded-full"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              style={{
                background: `linear-gradient(to right, ${theme.colors.brand.primary}, ${theme.colors.brand.accent})`,
                transformOrigin: "left",
                willChange: "transform, opacity",
              }}
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.p
              id={`${id}-error`}
              className="text-sm flex items-center space-x-1"
              style={{ color: theme.colors.status.error }}
              variants={errorAnimationVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
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
  },
  (prevProps, nextProps) => {
    return (
      prevProps.value === nextProps.value &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.error === nextProps.error &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.showPassword === nextProps.showPassword
    )
  },
)

InputField.displayName = "InputField"

// Background Orbs component
const BackgroundOrbs = memo(({ prefersReducedMotion }: BackgroundOrbsProps) => {
  const orbAnimations = [
    {
      size: "clamp(300px, 50vw, 800px)",
      color: `${theme.colors.brand.primaryLight}0A`,
      params: {
        x: ["-20%", "0%", "20%", "0%", "-20%"],
        y: ["-20%", "20%", "-10%", "10%", "-20%"],
        scale: [1, 1.2, 1, 0.8, 1],
        opacity: [0.7, 0.9, 0.8, 1, 0.7],
      },
    },
    {
      size: "clamp(250px, 40vw, 700px)",
      color: `${theme.colors.brand.accentLight}0A`,
      params: {
        x: ["30%", "0%", "-20%", "10%", "30%"],
        y: ["40%", "-10%", "30%", "-20%", "40%"],
        scale: [1.1, 0.9, 1.2, 1, 1.1],
        opacity: [0.8, 1, 0.7, 0.9, 0.8],
      },
    },
  ]

  const backgroundOrbVariants = {
    animate: (custom: { x: string[]; y: string[]; scale: number[]; opacity: number[] }) => ({
      x: custom.x,
      y: custom.y,
      scale: custom.scale,
      opacity: custom.opacity,
      transition: {
        duration: prefersReducedMotion ? 0 : 60,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "mirror" as const,
        ease: "easeInOut",
      },
    }),
  }

  return (
    <>
      {orbAnimations.map((orb, index) => (
        <motion.div
          key={`orb-${index}`}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color}0A 0%, transparent 60%)`,
            filter: "blur(80px)",
            willChange: "transform, opacity",
          }}
          variants={backgroundOrbVariants}
          custom={orb.params}
          animate="animate"
        />
      ))}
    </>
  )
})

BackgroundOrbs.displayName = "BackgroundOrbs"

// Success component
const LoginSuccess = memo(
  ({ prefersReducedMotion, userName = "Usuario" }: LoginSuccessProps) => {
    // Sparkle positions for decorative elements
    const sparklePositions = [
      { top: "10%", left: "15%", size: 4 },
      { top: "20%", right: "20%", size: 6 },
      { bottom: "25%", left: "10%", size: 5 },
      { bottom: "15%", right: "15%", size: 4 },
      { top: "50%", left: "5%", size: 3 },
      { top: "50%", right: "5%", size: 3 },
    ]

    const successVariants = useMemo(
      () => ({
        container: {
          hidden: { opacity: 0, scale: 0.8 },
          visible: {
            opacity: 1,
            scale: 1,
            transition: {
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
              staggerChildren: 0.1,
              delayChildren: 0.2,
            },
          },
          exit: {
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.3 },
          },
        },
        item: {
          hidden: { opacity: 0, y: 20 },
          visible: {
            opacity: 1,
            y: 0,
            transition: {
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            },
          },
        },
        iconContainer: {
          hidden: { scale: 0, rotate: -180 },
          visible: {
            scale: 1,
            rotate: 0,
            transition: {
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.1,
            },
          },
        },
        checkmark: {
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: {
              pathLength: { duration: 0.6, ease: "easeOut", delay: 0.3 },
              opacity: { duration: 0.1, delay: 0.3 },
            },
          },
        },
        sparkle: {
          hidden: { scale: 0, opacity: 0 },
          visible: (i: number) => ({
            scale: [0, 1.2, 0],
            opacity: [0, 1, 0],
            transition: {
              duration: 1.5,
              delay: 0.5 + i * 0.1,
              ease: "easeOut",
              repeat: Number.POSITIVE_INFINITY,
              repeatDelay: 2,
            },
          }),
        },
        progressBar: {
          hidden: { scaleX: 0 },
          visible: {
            scaleX: 1,
            transition: {
              duration: 2,
              ease: "easeInOut",
              delay: 0.8,
            },
          },
        },
      }),
      [],
    )

    return (
      <motion.div
        className="relative w-full max-w-sm mx-auto"
        variants={successVariants.container}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Glass morphism card */}
        <div className="relative rounded-2xl overflow-hidden" style={styles.successCardStyles}>
          {/* Gradient overlay */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(circle at 50% 0%, ${theme.colors.status.success}20 0%, transparent 70%)`,
            }}
          />

          {/* Content */}
          <div className="relative z-10 px-8 py-10 text-center">
            {/* Success icon with animation */}
            <motion.div
              className="relative inline-flex items-center justify-center mb-6"
              variants={successVariants.iconContainer}
            >
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
                style={{
                  background: `radial-gradient(circle, ${theme.colors.status.success}40 0%, transparent 70%)`,
                  filter: "blur(20px)",
                }}
              />

              {/* Icon background */}
              <div
                className="relative w-24 h-24 rounded-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.status.success}15 0%, ${theme.colors.status.success}25 100%)`,
                  border: `2px solid ${theme.colors.status.success}30`,
                }}
              >
                {/* Custom checkmark SVG */}
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 48 48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="relative z-10"
                >
                  <motion.path
                    d="M14 24L20 30L34 16"
                    stroke={theme.colors.status.success}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    variants={successVariants.checkmark}
                    initial="hidden"
                    animate="visible"
                  />
                </svg>

                {/* Sparkles around icon */}
                {!prefersReducedMotion &&
                  sparklePositions.map((pos, i) => (
                    <motion.div
                      key={i}
                      className="absolute"
                      style={{
                        ...pos,
                        width: `${pos.size}px`,
                        height: `${pos.size}px`,
                      }}
                      custom={i}
                      variants={successVariants.sparkle}
                      initial="hidden"
                      animate="visible"
                    >
                      <Sparkles
                        className="w-full h-full"
                        style={{
                          color: theme.colors.status.success,
                          filter: `drop-shadow(0 0 3px ${theme.colors.status.success})`,
                        }}
                      />
                    </motion.div>
                  ))}
              </div>
            </motion.div>

            {/* Success message */}
            <motion.div variants={successVariants.item} className="space-y-3">
              <h2
                className="text-3xl font-bold tracking-tight"
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.text.primary} 0%, ${theme.colors.status.success} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                ¡Bienvenido!
              </h2>

              <p className="text-lg font-medium" style={{ color: theme.colors.text.primary }}>
                {userName}
              </p>

              <p className="text-sm" style={{ color: theme.colors.text.muted }}>
                Acceso autorizado correctamente
              </p>
            </motion.div>

            {/* Progress bar */}
            <motion.div variants={successVariants.item} className="mt-8 mb-4">
              <div
                className="relative h-1 rounded-full overflow-hidden"
                style={{
                  background: `${theme.colors.border.default}`,
                }}
              >
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  variants={successVariants.progressBar}
                  style={{
                    background: `linear-gradient(90deg, ${theme.colors.status.success} 0%, ${theme.colors.brand.primary} 100%)`,
                    boxShadow: `0 0 10px ${theme.colors.glow.success}`,
                  }}
                />
              </div>
            </motion.div>

            {/* Redirect message */}
            <motion.div
              variants={successVariants.item}
              className="flex items-center justify-center space-x-2 text-sm"
              style={{ color: theme.colors.text.secondary }}
            >
              <span>Redirigiendo al panel</span>
              <motion.div
                animate={{
                  x: [0, 5, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "easeInOut",
                }}
              >
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </motion.div>

            {/* Loading dots */}
            <motion.div variants={successVariants.item} className="flex justify-center space-x-1 mt-4">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: theme.colors.brand.primary }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Bottom gradient decoration */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{
              background: `linear-gradient(90deg, 
              ${theme.colors.brand.primary} 0%, 
              ${theme.colors.status.success} 50%, 
              ${theme.colors.brand.primary} 100%)`,
              backgroundSize: "200% 100%",
              animation: "shimmer 3s linear infinite",
            }}
          />
        </div>

        {/* Add shimmer animation */}
        <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </motion.div>
  )
}
)

LoginSuccess.displayName = "LoginSuccess"

// Main component
export default function EnhancedLoginPage() {
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

  // Extract user name from email for personalized success message
  const userName = useMemo(() => {
    if (formData.email) {
      const name = formData.email.split("@")[0]
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
    return "Usuario"
  }, [formData.email])

  const animationVariants = useMemo(() => createAnimationVariants(prefersReducedMotion), [prefersReducedMotion])

  const handleInputChange = useCallback(
    (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === "rememberMe" ? e.target.checked : e.target.value
      setFormData((prev) => ({ ...prev, [field]: value }))
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    },
    [errors],
  )

  const handleFocus = useCallback(
    (field: string) => () => {
      setFormState((prev) => ({ ...prev, activeInput: field }))
    },
    [],
  )

  const handleBlur = useCallback(() => {
    setFormState((prev) => ({ ...prev, activeInput: null }))
  }, [])

  const togglePasswordVisibility = useCallback(() => {
    setFormState((prev) => ({ ...prev, showPassword: !prev.showPassword }))
  }, [])

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    const emailError = validators.email(formData.email)
    if (emailError) newErrors.email = emailError
    const passwordError = validators.password(formData.password)
    if (passwordError) newErrors.password = passwordError
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleLogin = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      if (!validateForm()) {
        setFormState((prev) => ({ ...prev, isLoading: false }))
        return
      }

      setFormState((prev) => ({ ...prev, isLoading: true, loginSuccess: false }))
      setErrors({})

      try {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 1500)
        })

        setFormState((prev) => ({ ...prev, isLoading: false, loginSuccess: true }))

        requestAnimationFrame(() => {
          setTimeout(() => {
            router.push("/dashboard")
          }, 2500) // Increased delay to show the improved success animation
        })
      } catch (error) {
        setErrors({
          general: error instanceof Error ? error.message : "Error de conexión. Por favor, intente más tarde.",
        })
        setFormState((prev) => ({ ...prev, isLoading: false, loginSuccess: false }))
      }
    },
    [formData, validateForm, router],
  )

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 overflow-hidden relative antialiased"
      style={styles.containerStyles}
    >
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden -z-10" aria-hidden="true">
        {!prefersReducedMotion && <BackgroundOrbs prefersReducedMotion={prefersReducedMotion ?? false} />}
      </div>

      <motion.main
        className="w-full max-w-md sm:px-4 lg:px-6 z-10 relative mx-auto"
        variants={animationVariants.form}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="relative"
          initial={{ filter: `drop-shadow(0 0 24px ${theme.colors.glow.primary})` }}
          whileHover={{ filter: `drop-shadow(0 0 48px ${theme.colors.glow.primary})` }}
          transition={{
            filter: {
              duration: 0.7,
              ease: [0.19, 1, 0.22, 1],
            },
            when: "beforeChildren",
          }}
        >
          {!prefersReducedMotion && (
            <motion.div
              className="absolute -inset-px rounded-xl p-[1px] overflow-hidden"
              initial={{
                background: `linear-gradient(135deg, ${theme.colors.brand.primary}30 0%, ${theme.colors.brand.accent}30 50%, ${theme.colors.brand.primary}30 100%)`,
                opacity: 0.5,
              }}
              whileHover={{
                opacity: 0.85,
              }}
              transition={{
                opacity: {
                  duration: 0.7,
                  ease: [0.19, 1, 0.22, 1],
                },
              }}
              style={{ willChange: "opacity" }}
            />
          )}

          <div className="relative rounded-xl overflow-hidden m-[1px]" style={styles.cardStyles}>
            <div className="relative z-10 p-6 sm:p-8">
              <AnimatePresence mode="wait">
                {formState.loginSuccess ? (
                  <LoginSuccess prefersReducedMotion={prefersReducedMotion} userName={userName} />
                ) : (
                  <motion.div
                    key="login-form"
                    variants={animationVariants.fadeInOut}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="text-center mb-8">
                      <motion.div
                        className="inline-flex items-center justify-center p-3 rounded-full mb-4"
                        whileHover={!prefersReducedMotion ? { scale: 1.1, rotate: 5 } : {}}
                        transition={{ type: "spring", stiffness: 300, damping: 10 }}
                        style={{
                          background: `radial-gradient(circle, ${theme.colors.brand.primaryLight}1A 0%, transparent 70%)`,
                          border: `1px solid ${theme.colors.brand.primary}30`,
                        }}
                      >
                        <Shield className="w-8 h-8" style={{ color: theme.colors.brand.primary }} />
                      </motion.div>

                      <h1 className="text-2xl sm:text-3xl font-bold mb-1 text-balance" style={styles.headingGradient}>
                        Plataforma Médica
                      </h1>

                      <p className="text-base mb-2" style={{ color: theme.colors.text.secondary }}>
                        Clínica de Hernia y Vesícula
                      </p>

                      <motion.div
                        className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full"
                        style={{
                          background: theme.colors.bg.success,
                          border: `1px solid ${theme.colors.border.success}`,
                          color: theme.colors.status.success,
                        }}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: prefersReducedMotion ? 0 : 0.3, duration: 0.4 }}
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Conexión Segura</span>
                      </motion.div>
                    </div>

                    <motion.form
                      onSubmit={handleLogin}
                      className="space-y-5"
                      noValidate
                      variants={animationVariants.staggerContainer}
                      initial="hidden"
                      animate="visible"
                    >
                      <motion.div variants={animationVariants.staggerItem}>
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

                      <motion.div variants={animationVariants.staggerItem}>
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
                          showToggle
                          onToggle={togglePasswordVisibility}
                          showPassword={formState.showPassword}
                        />
                      </motion.div>

                      <AnimatePresence>
                        {errors.general && (
                          <motion.div
                            className="flex items-center space-x-2 text-sm p-3 rounded-lg"
                            variants={animationVariants.fadeInOut}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            style={{
                              backgroundColor: theme.colors.bg.error,
                              border: `1px solid ${theme.colors.border.error}`,
                              color: theme.colors.status.error,
                            }}
                            role="alert"
                            aria-live="assertive"
                          >
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{errors.general}</span>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.div variants={animationVariants.staggerItem}>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <motion.label
                            className="flex items-center cursor-pointer group"
                            whileHover={!prefersReducedMotion ? { x: 2 } : {}}
                          >
                            <input
                              id="remember-me"
                              name="remember-me"
                              type="checkbox"
                              checked={formData.rememberMe}
                              onChange={handleInputChange("rememberMe")}
                              className="h-4 w-4 rounded transition-colors duration-200 focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-glass"
                              style={{
                                color: theme.colors.brand.primary,
                                backgroundColor: formData.rememberMe
                                  ? theme.colors.brand.primary
                                  : theme.colors.bg.input,
                                borderColor: formData.rememberMe
                                  ? theme.colors.brand.primaryDark
                                  : theme.colors.border.default,
                              }}
                            />
                            <span
                              className="ml-2 text-sm transition-colors duration-200 group-hover:text-white"
                              style={{ color: theme.colors.text.secondary }}
                            >
                              Recordar sesión
                            </span>
                          </motion.label>

                          <motion.a
                            href="#"
                            className="text-sm font-medium relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
                            whileHover={!prefersReducedMotion ? { color: theme.colors.brand.primaryLight } : {}}
                            style={{ color: theme.colors.brand.primary }}
                          >
                            ¿Olvidó su contraseña?
                            {!prefersReducedMotion && (
                              <motion.span
                                className="absolute bottom-0 left-0 h-px w-full"
                                style={{ backgroundColor: theme.colors.brand.primaryLight }}
                                initial={{ scaleX: 0 }}
                                whileHover={{ scaleX: 1 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                              />
                            )}
                          </motion.a>
                        </div>
                      </motion.div>

                      <motion.button
                        type="submit"
                        disabled={formState.isLoading}
                        className="w-full relative py-3.5 px-6 font-semibold text-white rounded-lg overflow-hidden transition-all duration-300 mt-6 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-glass focus-visible:ring-indigo-700"
                        whileHover={
                          !formState.isLoading && !prefersReducedMotion
                            ? {
                                boxShadow: `0 8px 25px rgba(42, 63, 95, 0.6)`,
                                y: -2,
                              }
                            : {}
                        }
                        whileTap={
                          !formState.isLoading && !prefersReducedMotion
                            ? {
                                boxShadow: `0 3px 10px rgba(42, 63, 95, 0.4)`,
                                y: 1,
                              }
                            : {}
                        }
                        style={{
                          ...styles.buttonGradient,
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                          borderTop: "1px solid rgba(255, 255, 255, 0.25)",
                        }}
                        animate={
                          !formState.isLoading && !prefersReducedMotion
                            ? {
                                backgroundPosition: ["0% 0%", "100% 0%"],
                                boxShadow: [
                                  `0 6px 15px rgba(42, 63, 95, 0.4), 0 0 0 1px rgba(58, 110, 165, 0.2)`,
                                  `0 8px 20px rgba(42, 63, 95, 0.5), 0 0 0 1px rgba(58, 110, 165, 0.3)`,
                                  `0 6px 15px rgba(42, 63, 95, 0.4), 0 0 0 1px rgba(58, 110, 165, 0.2)`,
                                ],
                              }
                            : {}
                        }
                        transition={
                          !formState.isLoading && !prefersReducedMotion
                            ? {
                                backgroundPosition: {
                                  duration: 4,
                                  ease: "easeInOut",
                                  repeat: Number.POSITIVE_INFINITY,
                                  repeatType: "reverse",
                                },
                                boxShadow: {
                                  duration: 0.4,
                                  ease: "easeOut",
                                },
                                y: {
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 15
                                }
                              }
                            : {}
                        }
                      >
                        <span className="relative flex items-center justify-center space-x-2 z-10">
                          {formState.isLoading ? (
                            <>
                              <svg
                                className="animate-spin h-5 w-5"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                              </svg>
                              <span>Autenticando...</span>
                            </>
                          ) : (
                            <>
                              <LogIn className="h-5 w-5" />
                              <span>Acceder al Sistema</span>
                            </>
                          )}
                        </span>
                      </motion.button>
                    </motion.form>

                    <div className="mt-8 text-center">
                      <p className="text-xs" style={{ color: theme.colors.text.dim }}>
                        {new Date().getFullYear()} Clínica de Hernia y Vesícula
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.main>
    </div>
  )
}
