import { useMemo } from 'react';
import { useTheme } from 'next-themes';

// 🎨 Paletas de colores modernas y elegantes
const CHART_PALETTES = {
  // Paleta principal con gradientes médicos modernos
  default: [
    '#667eea', // Azul elegante
    '#f093fb', // Rosa suave
    '#4facfe', // Azul cielo
    '#43e97b', // Verde menta
    '#fa709a', // Rosa coral
    '#fee140', // Amarillo dorado
    '#a8edea', // Turquesa
    '#ffecd2'  // Melocotón
  ],
  // Paleta médica profesional
  medical: [
    '#3b82f6', // Azul médico
    '#10b981', // Verde salud
    '#f59e0b', // Ámbar alerta
    '#ef4444', // Rojo urgente
    '#8b5cf6', // Violeta especialidad
    '#06b6d4', // Cyan diagnóstico
    '#f97316', // Naranja seguimiento
    '#84cc16'  // Lima recuperación
  ],
  // Paleta de diagnósticos elegante
  diagnostic: [
    '#6366f1', // Índigo profundo
    '#ec4899', // Rosa vibrante
    '#22d3ee', // Cyan brillante
    '#facc15', // Amarillo vibrante
    '#a855f7', // Púrpura
    '#34d399', // Esmeralda
    '#fb923c', // Naranja suave
    '#fbbf24'  // Ámbar
  ],
  // Paleta de gradientes
  gradient: [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
  ]
};

export const useChartConfig = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // 🎨 Estilos de etiquetas modernos
  const baseLabelStyle = useMemo(() => ({
    fill: isDark ? '#e2e8f0' : '#475569',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'Inter, system-ui, sans-serif',
    letterSpacing: '0.025em'
  }), [isDark]);

  // 🎨 Estilos de líneas de tick elegantes
  const tickLineStyle = useMemo(() => ({
    stroke: isDark ? '#334155' : '#e2e8f0',
    strokeWidth: 1,
    strokeDasharray: '2 2'
  }), [isDark]);

  // 🎨 Estilos de grid modernos
  const gridStyle = useMemo(() => ({
    stroke: isDark ? '#334155' : '#f1f5f9',
    strokeWidth: 0.8,
    strokeDasharray: '4 4',
    opacity: 0.6
  }), [isDark]);

  // 🎨 Estilos de tooltip elegantes
  const tooltipStyle = useMemo(() => ({
    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '12px',
    padding: '12px 16px',
    boxShadow: isDark 
      ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' 
      : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    backdropFilter: 'blur(16px)',
    fontSize: '14px',
    fontWeight: 500,
    color: isDark ? '#e2e8f0' : '#475569',
    fontFamily: 'Inter, system-ui, sans-serif'
  }), [isDark]);

  // 🎨 Función para obtener colores con soporte de gradientes
  const getChartColors = (paletteName: keyof typeof CHART_PALETTES = 'default') => {
    return CHART_PALETTES[paletteName] || CHART_PALETTES.default;
  };

  // 🎨 Función para generar gradientes dinámicos
  const createGradient = (color1: string, color2: string, direction = '135deg') => {
    return `linear-gradient(${direction}, ${color1} 0%, ${color2} 100%)`;
  };

  // 🎨 Animaciones y transiciones
  const animations = {
    enter: {
      animation: 'fadeInUp 0.6s ease-out',
      animationFillMode: 'both'
    },
    hover: {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'translateY(-2px)'
    },
    pulse: {
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    }
  };

  return { 
    isDark, 
    baseLabelStyle, 
    tickLineStyle, 
    gridStyle,
    tooltipStyle,
    getChartColors,
    createGradient,
    animations
  };
};
