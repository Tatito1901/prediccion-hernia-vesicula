"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  /** Tamaño en px o string válido (ej. "3rem") */
  size?: number | string;
  /** Grosor del aro en px */
  thickness?: number;
  /** Colores para el degradado cónico */
  gradientColors?: string[]; // ej. ["#3b82f6","#9333ea","#ec4899"]
  /** Clases extra */
  className?: string;
  /** Etiqueta ARIA */
  ariaLabel?: string;
}

/**
 * Spinner circular con degradado cónico, máscara radial y animación suave.
 */
export function LoadingSpinner({
  size = 48,
  thickness = 4,
  gradientColors = ["#3b82f6", "#9333ea", "#ec4899"],
  className,
  ariaLabel = "Cargando...",
}: LoadingSpinnerProps) {
  const sizeValue = typeof size === "number" ? `${size}px` : size;
  const gradient = `conic-gradient(from 0deg at 50% 50%, ${gradientColors.join(
    ", "
  )})`;

  return (
    <div role="status" aria-label={ariaLabel} className={cn("flex items-center justify-center", className)}>
      <motion.div
        className="rounded-full"
        style={{
          width: sizeValue,
          height: sizeValue,
          background: gradient,
          mask: `radial-gradient(closest-side, transparent 0%, transparent ${thickness}px, black ${thickness}px, black calc(100% - ${thickness}px), transparent calc(100% - ${thickness}px))`,
          WebkitMask: `radial-gradient(closest-side, transparent 0%, transparent ${thickness}px, black ${thickness}px, black calc(100% - ${thickness}px), transparent calc(100% - ${thickness}px))`,
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      />
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

interface LoadingStateProps {
  /** Controla si se muestra el overlay completo */
  visible: boolean;
  /** Mensaje bajo el spinner */
  message?: string;
  /** Tamaño del spinner */
  spinnerSize?: number | string;
  /** Grosor del aro */
  spinnerThickness?: number;
  /** Colores del degradado */
  gradientColors?: string[];
  /** Clases del contenedor */
  className?: string;
  /** Clases extra para el texto */
  textClassName?: string;
}

/**
 * Overlay fullscreen con backdrop-blur, spinner central y mensaje opcional.
 */
export function LoadingState({
  visible,
  message = "Cargando...",
  spinnerSize = 64,
  spinnerThickness = 6,
  gradientColors = ["#3b82f6", "#9333ea", "#ec4899"],
  className,
  textClassName,
}: LoadingStateProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={cn(
            "fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm",
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <LoadingSpinner
            size={spinnerSize}
            thickness={spinnerThickness}
            gradientColors={gradientColors}
            className="mb-4"
            ariaLabel={message}
          />
          {message && (
            <motion.p
              className={cn("text-white text-lg font-medium", textClassName)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.1 }}
            >
              {message}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
