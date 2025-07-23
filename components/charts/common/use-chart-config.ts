import { useMemo } from 'react';
import { useTheme } from 'next-themes';

// 🎨 Sistema de diseño minimalista avanzado para gráficos profesionales
const MINIMAL_DESIGN_SYSTEM = {
  // 🌈 Paletas minimalistas con tonos pastel suaves y acentos oscuros
  palettes: {
    // Paleta principal minimalista con tonos pastel suaves
    minimal: [
      '#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B'
    ],
    // Acentos oscuros para destacar elementos clave
    accents: [
      '#1E293B', '#334155', '#475569', '#64748B', '#94A3B8', '#CBD5E1'
    ],
    // Paleta médica refinada con tonos profesionales
    medical: [
      '#EBF8FF', '#BEE3F8', '#90CDF4', '#63B3ED', '#4299E1', '#1A365D'
    ],
    // Paleta de diagnóstico con contraste sutil
    diagnostic: [
      '#FFFBF0', '#FED7AA', '#FDBA74', '#FB923C', '#F97316', '#9A3412'
    ],
    // Gradientes suaves para efectos especiales
    gradients: [
      'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
      'linear-gradient(135deg, #EBF8FF 0%, #BEE3F8 100%)',
      'linear-gradient(135deg, #FFFBF0 0%, #FED7AA 100%)'
    ]
  }
};

// 🎨 Hook de configuración avanzada para gráficos minimalistas
export const useChartConfig = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // ✍️ Tipografías refinadas con jerarquía clara
  const typography = useMemo(() => ({
    title: {
      fontSize: 16,
      fontWeight: 600,
      fill: isDark ? '#F8F9FA' : '#1E293B',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      letterSpacing: '-0.02em'
    },
    subtitle: {
      fontSize: 13,
      fontWeight: 500,
      fill: isDark ? '#CBD5E1' : '#475569',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
    },
    label: {
      fontSize: 11,
      fontWeight: 400,
      fill: isDark ? '#94A3B8' : '#64748B',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      letterSpacing: '0.01em'
    },
    annotation: {
      fontSize: 10,
      fontWeight: 500,
      fill: isDark ? '#64748B' : '#64748B',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }
  }), [isDark]);

  // 📏 Espaciado equilibrado y márgenes amplios
  const spacing = useMemo(() => ({
    margin: { top: 40, right: 60, bottom: 60, left: 60 },
    padding: { top: 20, right: 20, bottom: 20, left: 20 },
    axisGap: 24,
    legendGap: 32,
    annotationOffset: 16
  }), []);

  // 🔲 Líneas de cuadrícula minimalistas y discretas
  const gridLineStyle = useMemo(() => ({
    stroke: isDark ? '#334155' : '#F1F5F9',
    strokeWidth: 0.5,
    strokeDasharray: '1 3',
    opacity: 0.4
  }), [isDark]);

  // 🎯 Marcadores estilizados para puntos clave
  const markers = useMemo(() => ({
    standard: {
      fill: isDark ? '#94A3B8' : '#1E293B',
      stroke: '#FFFFFF',
      strokeWidth: 2,
      r: 4,
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
    },
    highlight: {
      fill: '#F97316',
      stroke: '#FFFFFF',
      strokeWidth: 3,
      r: 6,
      filter: 'drop-shadow(0 3px 6px rgba(249,115,22,0.3))'
    }
  }), [isDark]);

  // 💬 Tooltips minimalistas con efectos sutiles
  const tooltipStyle = useMemo(() => ({
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.96)' : 'rgba(248, 250, 252, 0.96)',
    border: `1px solid ${isDark ? '#475569' : '#E2E8F0'}`,
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '13px',
    fontWeight: '500',
    color: isDark ? '#F1F5F9' : '#1E293B',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    backdropFilter: 'blur(12px)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '240px',
    lineHeight: '1.4'
  }), [isDark]);

  // 🎨 Estilos de etiquetas refinados
  const labelStyle = useMemo(() => ({
    ...typography.label,
    textAnchor: 'middle' as const
  }), [typography.label]);

  // 🔗 Líneas de tick elegantes y discretas
  const tickLineStyle = useMemo(() => ({
    stroke: isDark ? '#475569' : '#CBD5E1',
    strokeWidth: 1
  }), [isDark]);

  // 🌈 Función para obtener colores de paletas
  const getChartColors = useMemo(() => {
    return (palette: keyof typeof MINIMAL_DESIGN_SYSTEM.palettes) => {
      return MINIMAL_DESIGN_SYSTEM.palettes[palette] || MINIMAL_DESIGN_SYSTEM.palettes.minimal;
    };
  }, []);

  // 🎨 Función para crear gradientes SVG
  const createGradient = useMemo(() => {
    return (id: string, colors: string[]) => {
      return {
        id,
        x1: '0%',
        y1: '0%',
        x2: '0%',
        y2: '100%',
        stops: colors.map((color, index) => ({
          offset: `${(index / (colors.length - 1)) * 100}%`,
          stopColor: color,
          stopOpacity: 1
        }))
      };
    };
  }, []);

  // 🎭 Animaciones suaves y profesionales
  const animations = useMemo(() => ({
    fadeInUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.8, ease: [0.23, 1, 0.32, 1] }
    },
    hover: {
      scale: 1.02,
      transition: { duration: 0.2, ease: 'easeInOut' }
    },
    pulse: {
      scale: [1, 1.01, 1],
      transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' }
    }
  }), []);

  // 📊 Configuración de leyendas compactas
  const legendConfig = useMemo(() => ({
    wrapperStyle: {
      paddingTop: '20px',
      fontSize: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    itemStyle: {
      color: isDark ? '#CBD5E1' : '#475569',
      fontSize: '11px',
      fontWeight: 500
    },
    iconType: 'circle' as const,
    iconSize: 8
  }), [isDark]);

  // 📝 Configuración de anotaciones contextuales
  const annotationConfig = useMemo(() => ({
    style: {
      ...typography.annotation,
      textAnchor: 'middle' as const,
      dominantBaseline: 'central' as const
    },
    callout: {
      stroke: isDark ? '#64748B' : '#94A3B8',
      strokeWidth: 1,
      strokeDasharray: '2 2',
      opacity: 0.7
    },
    background: {
      fill: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(248, 250, 252, 0.9)',
      stroke: isDark ? '#475569' : '#E2E8F0',
      strokeWidth: 1,
      rx: 4,
      ry: 4
    }
  }), [isDark, typography.annotation]);

  return {
    isDark,
    typography,
    spacing,
    gridLineStyle,
    markers,
    tooltipStyle,
    labelStyle,
    tickLineStyle,
    getChartColors,
    createGradient,
    animations,
    legendConfig,
    annotationConfig,
    // Compatibilidad con versión anterior
    baseLabelStyle: labelStyle,
    gridStyle: gridLineStyle
  };
};
