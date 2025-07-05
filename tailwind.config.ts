import { fontFamily } from "tailwindcss/defaultTheme"
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "app/**/*.{ts,tsx}", 
    "components/**/*.{ts,tsx}", 
    "*.{js,ts,jsx,tsx,mdx}",
    "src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Colores base del sistema
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        
        // Colores principales
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: 'hsl(var(--primary-50))',
          100: 'hsl(var(--primary-100))',
          200: 'hsl(var(--primary-200))',
          300: 'hsl(var(--primary-300))',
          400: 'hsl(var(--primary-400))',
          500: 'hsl(var(--primary-500))',
          600: 'hsl(var(--primary-600))',
          700: 'hsl(var(--primary-700))',
          800: 'hsl(var(--primary-800))',
          900: 'hsl(var(--primary-900))',
          950: 'hsl(var(--primary-950))',
        },
        
        // Colores secundarios
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },

        // Paleta médica profesional
        medical: {
          50: '#f0f9ff',   // Azul muy claro
          100: '#e0f2fe',  // Azul claro
          200: '#bae6fd',  // Azul suave
          300: '#7dd3fc',  // Azul medio-claro
          400: '#38bdf8',  // Azul medio
          500: '#0ea5e9',  // Azul principal
          600: '#0284c7',  // Azul medio-oscuro
          700: '#0369a1',  // Azul oscuro
          800: '#075985',  // Azul muy oscuro
          900: '#0c4a6e',  // Azul más oscuro
          950: '#082f49',  // Azul profundo
        },

        // Colores de estado clínico
        clinical: {
          pending: 'hsl(var(--clinical-pending))',
          active: 'hsl(var(--clinical-active))',
          completed: 'hsl(var(--clinical-completed))',
          cancelled: 'hsl(var(--clinical-cancelled))',
          'no-show': 'hsl(var(--clinical-no-show))',
        },

        // Colores de estado del sistema
        success: {
          light: 'hsl(var(--success-light))',
          DEFAULT: 'hsl(var(--success))',
          dark: 'hsl(var(--success-dark))',
        },
        
        warning: {
          light: 'hsl(var(--warning-light))',
          DEFAULT: 'hsl(var(--warning))',
          dark: 'hsl(var(--warning-dark))',
        },
        
        error: {
          light: 'hsl(var(--error-light))',
          DEFAULT: 'hsl(var(--error))',
          dark: 'hsl(var(--error-dark))',
        },
        
        info: {
          light: 'hsl(var(--info-light))',
          DEFAULT: 'hsl(var(--info))',
          dark: 'hsl(var(--info-dark))',
        },

        // Colores de gráficos
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
          6: 'hsl(var(--chart-6))',
          green: 'hsl(var(--chart-green))',
          yellow: 'hsl(var(--chart-yellow))',
          red: 'hsl(var(--chart-red))',
          blue: 'hsl(var(--chart-blue))',
          purple: 'hsl(var(--chart-purple))',
          gray: 'hsl(var(--chart-gray))',
          grid: 'hsl(var(--chart-grid))',
          'tooltip-bg': 'hsl(var(--chart-tooltip-bg))',
          'tooltip-text': 'hsl(var(--chart-tooltip-text))',
        },

        // Colores de sidebar
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },

      // Tipografía mejorada
      fontFamily: {
        sans: ["Inter", "system-ui", ...fontFamily.sans],
        mono: ["JetBrains Mono", "Consolas", ...fontFamily.mono],
      },

      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },

      // Radios de borde
      borderRadius: {
        '2xs': '0.125rem',
        xs: '0.25rem',
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 12px)',
      },

      // Espaciado mejorado
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        '144': '36rem',
      },

      // Sombras profesionales
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'medical': '0 4px 6px -1px rgba(14, 165, 233, 0.1), 0 2px 4px -1px rgba(14, 165, 233, 0.06)',
        'medical-lg': '0 10px 15px -3px rgba(14, 165, 233, 0.1), 0 4px 6px -2px rgba(14, 165, 233, 0.05)',
        'medical-xl': '0 20px 25px -5px rgba(14, 165, 233, 0.1), 0 10px 10px -5px rgba(14, 165, 233, 0.04)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glow': '0 0 20px rgba(14, 165, 233, 0.3)',
        'glow-lg': '0 0 40px rgba(14, 165, 233, 0.4)',
      },

      // Animaciones y keyframes mejorados
      keyframes: {
        // Animaciones existentes
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%': { opacity: '0' }
        },

        // Nuevas animaciones profesionales
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' }
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        'slide-in-top': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-in-bottom': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'scale-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' }
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'pulse-medical': {
          '0%, 100%': { backgroundColor: 'rgb(14, 165, 233)' },
          '50%': { backgroundColor: 'rgb(2, 132, 199)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' }
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(14, 165, 233, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(14, 165, 233, 0.8)' }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        }
      },

      animation: {
        // Animaciones existentes
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'caret-blink': 'caret-blink 1.25s ease-out infinite',

        // Nuevas animaciones
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-out': 'fade-out 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-top': 'slide-in-top 0.3s ease-out',
        'slide-in-bottom': 'slide-in-bottom 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'scale-out': 'scale-out 0.2s ease-out',
        'bounce-in': 'bounce-in 0.6s ease-out',
        'pulse-medical': 'pulse-medical 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
      },

      // Transiciones personalizadas
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-out': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'medical': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },

      // Duración de transiciones
      transitionDuration: {
        '50': '50ms',
        '250': '250ms',
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '1200': '1200ms',
        '1500': '1500ms',
      },

      // Tamaños de pantalla adicionales
      screens: {
        'xs': '475px',
        '3xl': '1600px',
        '4xl': '1920px',
      },

      // Blur personalizado
      blur: {
        'xs': '2px',
        '4xl': '72px',
        '5xl': '96px',
      },

      // Grayscale personalizado
      grayscale: {
        25: '0.25',
        75: '0.75',
      },

      // Saturación personalizada
      saturate: {
        25: '0.25',
        75: '0.75',
        125: '1.25',
        175: '1.75',
        200: '2',
      },

      // Backdrop blur
      backdropBlur: {
        'xs': '2px',
        '4xl': '72px',
        '5xl': '96px',
      },
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/container-queries"),
    
    // Plugin personalizado para utilidades médicas
    function({ addUtilities, theme, addComponents }: any) {
      // Utilidades para glassmorphism
      addUtilities({
        '.glass': {
          background: 'rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
        },
        '.glass-dark': {
          background: 'rgba(15, 23, 42, 0.25)',
          backdropFilter: 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.glass-strong': {
          background: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(20px)',
          '-webkit-backdrop-filter': 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        },
      })

      // Utilidades para scrollbar
      addUtilities({
        '.scrollbar-none': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'rgb(203 213 225) transparent',
        },
        '.scrollbar-medical': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'rgb(14 165 233) transparent',
        },
      })

      // Componentes para estados médicos
      addComponents({
        '.medical-card': {
          '@apply bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-lg backdrop-blur-sm': {},
        },
        '.medical-button': {
          '@apply bg-medical-500 hover:bg-medical-600 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 focus-visible:ring-2 focus-visible:ring-medical-500 focus-visible:ring-offset-2': {},
        },
        '.medical-input': {
          '@apply border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-medical-500 transition-colors': {},
        },
        '.status-badge': {
          '@apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium': {},
        },
        '.status-pending': {
          '@apply bg-warning-light text-warning-dark border border-warning/20': {},
        },
        '.status-active': {
          '@apply bg-medical-50 text-medical-700 border border-medical-200 dark:bg-medical-900/20 dark:text-medical-400': {},
        },
        '.status-completed': {
          '@apply bg-success-light text-success-dark border border-success/20': {},
        },
        '.status-cancelled': {
          '@apply bg-error-light text-error-dark border border-error/20': {},
        },
      })
    }
  ],
}

export default config