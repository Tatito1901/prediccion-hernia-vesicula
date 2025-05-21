"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LockKeyhole, AtSign, LogIn, ShieldCheck, Eye, EyeOff } from "lucide-react";

interface Particle {
  id: string;
  initialX: string;
  initialY: string;
  targetX: string;
  targetY: string;
  scale: number;
  opacity: number;
  duration: number;
  width: string;
  height: string;
  delay: number;
}

export default function EnhancedLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  
  // Enhanced color palette for better contrast and professionalism
  const colors = {
    background: '#020818', // Darker background for better contrast
    formBg: 'rgba(15, 30, 60, 0.9)', // More opaque form background
    inputBg: 'rgba(8, 16, 32, 0.9)', // Darker input background for contrast
    primary: '#4285f4', // Professional blue (Google-inspired)
    primaryDark: '#3367d6', // Darker shade for hover states
    primaryLight: 'rgba(66, 133, 244, 0.15)', // Light version for backgrounds
    accent: '#00C4B4', // Teal medical color for accents
    accentLight: 'rgba(0, 196, 180, 0.15)',
    textPrimary: '#ffffff', // White text for maximum contrast on dark backgrounds
    textSecondary: '#e1e8f5', // Light blue-gray for secondary text
    textMuted: '#9aa8c7', // Muted blue-gray for less important text
    border: 'rgba(66, 133, 244, 0.25)', // Subtle blue border
    borderActive: 'rgba(66, 133, 244, 0.5)', // Brighter border for active states
    error: '#ff5252', // Bright red for errors
    success: '#00C48C' // Bright green for success
  };

  // Generate particles only on client to avoid hydration mismatch
  const particles = useMemo(() => {
    if (!isMounted) return [];
    // Reduced number of particles for a more professional look
    return Array.from({ length: 12 }).map((_, i) => ({
      id: `particle-${i}-${Math.random().toString(36).substring(7)}`,
      initialX: `${Math.random() * 100}%`,
      initialY: `${Math.random() * 100}%`,
      targetX: `${Math.random() * 100}%`,
      targetY: `${Math.random() * 100}%`,
      scale: Math.random() * 0.1 + 0.05, // Smaller particles
      opacity: Math.random() * 0.06 + 0.01, // More subtle opacity
      duration: Math.random() * 80 + 40,
      width: `${Math.random() * 3 + 1}px`, // Smaller size
      height: `${Math.random() * 3 + 1}px`, // Smaller size
      delay: Math.random() * 5,
    }));
  }, [isMounted]);

  useEffect(() => {
    setIsMounted(true);
    document.documentElement.classList.add("dark");
    
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    setTimeout(() => {
      setLoginSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    }, 1500);
  };

  const handleFocus = (inputId: string) => {
    setActiveInput(inputId);
  };

  const handleBlur = () => {
    setActiveInput(null);
  };

  // Animation variants for form elements
  const formItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: { 
        duration: 0.4, 
        delay: custom * 0.08,
        ease: "easeOut" 
      }
    })
  };

  return (
    // Main background - using a gradient for more depth
    <div 
      className="min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 transition-colors duration-700 overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg, ${colors.background} 0%, #051230 100%)`,
        color: colors.textPrimary
      }}
    >
      {/* Background decorative elements - very subtle */}
      {isMounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* More subtle particles with better distribution */}
          <div className="absolute inset-0 opacity-30">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute rounded-full"
                style={{
                  width: particle.width,
                  height: particle.height,
                  background: `rgba(255, 255, 255, 0.6)`,
                  boxShadow: `0 0 4px rgba(255, 255, 255, 0.3)`
                }}
                initial={{
                  x: particle.initialX,
                  y: particle.initialY,
                  scale: particle.scale,
                  opacity: 0,
                }}
                animate={{
                  x: particle.targetX,
                  y: particle.targetY,
                  opacity: particle.opacity,
                  transition: {
                    duration: particle.duration,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                    delay: particle.delay,
                  },
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main form container with improved contrast and professional appearance */}
      <motion.main
        className="w-full max-w-md rounded-lg z-10 relative overflow-hidden"
        style={{
          boxShadow: `0 10px 40px rgba(0, 0, 0, 0.5)`,
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Enhanced border with better contrast */}
        <motion.div
          className="absolute inset-0 rounded-lg z-0"
          style={{
            border: `1px solid ${colors.border}`,
            boxShadow: `0 0 15px 1px rgba(66, 133, 244, 0.15)`,
            pointerEvents: 'none'
          }}
          animate={{
            boxShadow: [
              `0 0 10px 1px rgba(66, 133, 244, 0.1)`,
              `0 0 20px 2px rgba(66, 133, 244, 0.2)`,
              `0 0 10px 1px rgba(66, 133, 244, 0.1)`
            ]
          }}
          transition={{
            duration: 4,
            ease: "easeInOut",
            times: [0, 0.5, 1],
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
        
        {/* Background with improved opacity for better contrast */}
        <div 
          className="absolute inset-0 rounded-lg"
          style={{
            background: colors.formBg,
            backdropFilter: 'blur(10px)',
            border: `1px solid rgba(255, 255, 255, 0.05)`
          }}
        ></div>
        
        {/* Subtle blue accent in top-right corner */}
        <motion.div 
          className="absolute w-56 h-56 -top-20 -right-20 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(66, 133, 244, 0.12) 0%, rgba(66, 133, 244, 0.05) 40%, transparent 75%)`,
            filter: 'blur(20px)'
          }}
          animate={{
            opacity: [0.6, 0.9, 0.6],
            scale: [0.95, 1.05, 0.95]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Subtle teal accent in bottom-left corner */}
        <motion.div 
          className="absolute w-56 h-56 -bottom-20 -left-20 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(0, 196, 180, 0.12) 0%, rgba(0, 196, 180, 0.05) 40%, transparent 75%)`,
            filter: 'blur(20px)'
          }}
          animate={{
            opacity: [0.6, 0.9, 0.6],
            scale: [0.95, 1.05, 0.95]
          }}
          transition={{
            duration: 10,
            delay: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Form content */}
        <div className="relative z-10 p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {loginSuccess ? (
              <motion.div
                key="success"
                className="text-center py-10"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <motion.div 
                  className="flex justify-center mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ type: "spring", damping: 12, stiffness: 100, delay: 0.1 }}
                >
                  <div 
                    className="rounded-full p-4"
                    style={{
                      background: `radial-gradient(circle, ${colors.accentLight}, transparent)`,
                      border: `1px solid ${colors.accent}30`,
                      boxShadow: `0 0 15px ${colors.accent}40`
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke={colors.success} strokeWidth="2">
                      <motion.path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        d="M5 13l4 4L19 7"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
                      />
                    </svg>
                  </div>
                </motion.div>
                <h2 
                  className="text-2xl font-semibold mb-3"
                  style={{ 
                    color: colors.textPrimary,
                  }}
                >
                  ¡Acceso Concedido!
                </h2>
                <p style={{ color: colors.textSecondary }}>Será redirigido en un momento...</p>
              </motion.div>
            ) : (
              <motion.div
                key="login-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="px-0 sm:px-2"
              >
                <div className="text-center mb-8">
                  {/* Clinic badge with improved contrast and professionalism */}
                  <motion.div 
                    className="inline-flex items-center justify-center p-3 rounded-full mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    whileHover={{ scale: 1.05 }}
                    style={{
                      background: `radial-gradient(circle, ${colors.primaryLight} 0%, rgba(20, 50, 120, 0.1) 100%)`,
                      border: `1px solid ${colors.border}`,
                      boxShadow: `0 0 15px ${colors.border}`
                    }}
                  >
                    <ShieldCheck 
                      className="h-10 w-10" 
                      style={{
                        color: colors.primary,
                        filter: `drop-shadow(0 0 4px ${colors.primary}70)`
                      }}
                    />
                  </motion.div>
                  
                  {/* Title with better contrast and professionalism */}
                  <motion.h1 
                    className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    style={{ 
                      color: colors.primary,
                      textShadow: `0 0 10px ${colors.primary}40`
                    }}
                  >
                    Clínica de Hernia y Vesícula
                  </motion.h1>
                  
                  <motion.p 
                    className="mt-2 text-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    style={{ color: colors.textSecondary }}
                  >
                    Portal de Acceso para Personal Autorizado
                  </motion.p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Email field - with improved contrast and professionalism */}
                  <motion.div
                    variants={formItemVariants}
                    initial="hidden"
                    animate="visible"
                    custom={4}
                  >
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: colors.textSecondary }}
                    >
                      Correo Electrónico
                    </label>
                    <div className="relative group transition-all duration-300 rounded-lg">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <AtSign 
                          className="h-5 w-5 transition-colors duration-300" 
                          style={{
                            color: activeInput === 'email' 
                              ? colors.primary 
                              : colors.textMuted
                          }}
                        />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => handleFocus('email')}
                        onBlur={handleBlur}
                        className="form-input block w-full rounded-lg border py-2.5 pl-10 pr-4 focus:ring-2 transition-all duration-300 ease-in-out"
                        placeholder="usuario@clinica.com"
                        disabled={isLoading}
                        style={{
                          backgroundColor: colors.inputBg,
                          borderColor: activeInput === 'email' 
                            ? colors.borderActive 
                            : 'rgba(255, 255, 255, 0.1)',
                          color: colors.textPrimary,
                          boxShadow: activeInput === 'email' 
                            ? `0 0 10px -2px ${colors.primary}40` 
                            : 'none'
                        }}
                      />
                      {/* Improved focus indication with better contrast */}
                      <AnimatePresence>
                        {activeInput === 'email' && (
                          <motion.div
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0, scaleX: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute bottom-0 left-0 h-0.5 w-full origin-left"
                            style={{ 
                              background: `linear-gradient(to right, ${colors.primary}80, ${colors.primary}, ${colors.primary}80)`,
                              boxShadow: `0 0 6px ${colors.primary}`
                            }}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>

                  {/* Password field - with improved contrast and professionalism */}
                  <motion.div
                    variants={formItemVariants}
                    initial="hidden"
                    animate="visible"
                    custom={5}
                  >
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: colors.textSecondary }}
                    >
                      Contraseña
                    </label>
                    <div className="relative group transition-all duration-300 rounded-lg">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <LockKeyhole 
                          className="h-5 w-5 transition-colors duration-300" 
                          style={{
                            color: activeInput === 'password' 
                              ? colors.primary
                              : colors.textMuted
                          }}
                        />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => handleFocus('password')}
                        onBlur={handleBlur}
                        className="form-input block w-full rounded-lg border py-2.5 pl-10 pr-10 focus:ring-2 transition-all duration-300 ease-in-out"
                        placeholder="••••••••"
                        disabled={isLoading}
                        style={{
                          backgroundColor: colors.inputBg,
                          borderColor: activeInput === 'password' 
                            ? colors.borderActive
                            : 'rgba(255, 255, 255, 0.1)',
                          color: colors.textPrimary,
                          boxShadow: activeInput === 'password' 
                            ? `0 0 10px -2px ${colors.primary}40` 
                            : 'none'
                        }}
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 focus:outline-none transition-colors duration-300"
                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          color: activeInput === 'password' 
                            ? colors.primary
                            : colors.textMuted
                        }}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </motion.button>
                      {/* Improved focus indication with better contrast */}
                      <AnimatePresence>
                        {activeInput === 'password' && (
                          <motion.div
                            initial={{ opacity: 0, scaleX: 0 }}
                            animate={{ opacity: 1, scaleX: 1 }}
                            exit={{ opacity: 0, scaleX: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute bottom-0 left-0 h-0.5 w-full origin-left"
                            style={{ 
                              background: `linear-gradient(to right, ${colors.primary}80, ${colors.primary}, ${colors.primary}80)`,
                              boxShadow: `0 0 6px ${colors.primary}`
                            }}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>

                  {/* Error message with improved contrast */}
                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        className="flex items-center space-x-2 text-sm p-3 rounded-md border"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5, transition: { duration: 0.2 } }}
                        role="alert"
                        style={{
                          backgroundColor: 'rgba(255, 82, 82, 0.1)',
                          borderColor: 'rgba(255, 82, 82, 0.2)',
                          color: 'rgba(255, 180, 180, 1)'
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Remember session & forgot password with improved contrast */}
                  <motion.div 
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm space-y-2 sm:space-y-0"
                    variants={formItemVariants}
                    initial="hidden"
                    animate="visible"
                    custom={6}
                  >
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 rounded border focus:ring-2 transition-colors duration-200"
                        style={{
                          backgroundColor: colors.inputBg,
                          borderColor: 'rgba(255, 255, 255, 0.2)',
                          color: colors.primary,
                        }}
                      />
                      <label
                        htmlFor="remember-me"
                        className="ml-2 block hover:text-white transition-colors cursor-pointer"
                        style={{ color: colors.textSecondary }}
                      >
                        Recordar sesión
                      </label>
                    </div>
                    <motion.a
                      href="#"
                      className="font-medium hover:underline transition-colors"
                      whileHover={{ scale: 1.02, x: 3 }}
                      style={{ 
                        color: colors.primary,
                      }}
                    >
                      ¿Olvidó su contraseña?
                    </motion.a>
                  </motion.div>

                  {/* Security note to enhance trust */}
                  <motion.div
                    variants={formItemVariants}
                    initial="hidden"
                    animate="visible"
                    custom={6.5}
                    className="flex items-center gap-1.5 mt-1 mb-3"
                  >
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke={colors.accent} className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xs" style={{ color: colors.textMuted }}>
                      Conexión segura. Sus datos están protegidos
                    </p>
                  </motion.div>

                  {/* Submit button with improved contrast and professionalism */}
                  <motion.div
                    variants={formItemVariants}
                    initial="hidden"
                    animate="visible"
                    custom={7}
                    className="pt-2"
                  >
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center py-3 px-5 text-sm font-semibold rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transform active:shadow-inner transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed group"
                      whileHover={{ 
                        boxShadow: `0 6px 15px -3px ${colors.primary}50`,
                        y: -2
                      }}
                      whileTap={{ scale: 0.98, y: 0 }}
                      style={{
                        background: colors.primary,
                        boxShadow: `0 4px 10px -3px ${colors.primary}40`,
                        color: 'white',
                        border: `1px solid ${colors.primary}90`,
                      }}
                    >
                      {isLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2.5 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Autenticando...
                        </>
                      ) : (
                        <>
                          <LogIn className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                          Acceder al Sistema
                        </>
                      )}
                      
                      {/* Button glow effect - more subtle for professionalism */}
                      <motion.div
                        className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{ 
                          boxShadow: `0 0 15px 2px ${colors.primary}40`,
                          background: 'transparent'
                        }}
                        animate={{
                          opacity: [0, 0.15, 0]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatType: "mirror"
                        }}
                      />
                    </motion.button>
                  </motion.div>
                </form>

                {/* Brand trust indicators */}
                <motion.div
                  variants={formItemVariants}
                  initial="hidden"
                  animate="visible"
                  custom={7.5}
                  className="mt-8 flex justify-center space-x-4 items-center"
                >
                  <div className="text-xs px-2 py-1 rounded border flex items-center gap-1" 
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: colors.textMuted,
                      background: 'rgba(255, 255, 255, 0.03)'
                    }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    SSL Seguro
                  </div>
                  <div className="text-xs px-2 py-1 rounded border flex items-center gap-1" 
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: colors.textMuted,
                      background: 'rgba(255, 255, 255, 0.03)'
                    }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    HIPAA
                  </div>
                </motion.div>

                {/* Footer copyright with improved clarity */}
                <motion.div
                  variants={formItemVariants}
                  initial="hidden"
                  animate="visible"
                  custom={8}
                >
                  <p className="mt-4 text-center text-xs" style={{ color: colors.textMuted }}>
                    &copy; {new Date().getFullYear()} Clínica Especializada en Hernia y Vesícula.
                    <br />
                    Cuidado experto y tecnología de vanguardia. Ciudad de México.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.main>
    </div>
  );
}