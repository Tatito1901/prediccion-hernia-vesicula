/* -------------------------------------------------------------------------- */
/*  components/chart-theme.tsx - OPTIMIZADO                                   */
/* -------------------------------------------------------------------------- */

import type { CSSProperties } from 'react';

/** Cache optimizado con límite */
const cache = new Map<string, string>();
const CACHE_LIMIT = 200;

const cssVar = (name: string): string => {
  if (cache.has(name)) return cache.get(name)!;
  
  if (cache.size >= CACHE_LIMIT) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  
  const value = `hsl(var(${name}))`;
  cache.set(name, value);
  return value;
};

/* ----------------------------------------------------------------------------
 * PALETAS ESPECIALIZADAS SIMPLIFICADAS
 * -------------------------------------------------------------------------- */
export const CHART_PALETTES = {
  medical:      ['--chart-1','--chart-2','--chart-green','--chart-purple','--chart-3','--chart-6','--chart-blue','--chart-4','--chart-5','--chart-yellow'],
  diagnosis:    ['--chart-1','--chart-2','--chart-6','--chart-yellow','--chart-blue','--chart-purple','--chart-4','--chart-3','--chart-red','--chart-5'],
  patients:     ['--chart-blue','--chart-1','--chart-green','--chart-2','--chart-6','--chart-5','--chart-yellow','--chart-3','--chart-4','--chart-purple'],
  trends:       ['--chart-1','--chart-4','--chart-purple','--chart-green','--chart-yellow','--chart-6','--chart-blue','--chart-3','--chart-2','--chart-5'],
  comparison:   ['--chart-1','--chart-2','--chart-6','--chart-yellow','--chart-blue','--chart-purple','--chart-3','--chart-green'],
} as const;

export type ChartPaletteKey = keyof typeof CHART_PALETTES;
export type ChartColorSet = readonly string[];

// Cache simplificado para paletas
const paletteCache = new Map<string, ChartColorSet>();

export function getChartColors(
  palette: ChartPaletteKey = 'medical',
  count = 10,
  startIndex = 0
): ChartColorSet {
  const cacheKey = `${palette}-${count}-${startIndex}`;
  if (paletteCache.has(cacheKey)) return paletteCache.get(cacheKey)!;

  const basePalette = CHART_PALETTES[palette];
  const paletteLength = basePalette.length;
  const actualStartIndex = startIndex % paletteLength;

  const selectedVars: string[] = [];
  
  for (let i = 0; i < count; i++) {
    selectedVars.push(basePalette[(actualStartIndex + i) % paletteLength]);
  }

  const result = selectedVars.map(cssVar) as ChartColorSet;
  
  if (paletteCache.size >= CACHE_LIMIT) {
    const firstKey = paletteCache.keys().next().value;
    paletteCache.delete(firstKey);
  }
  
  paletteCache.set(cacheKey, result);
  return result;
}

/* ----------------------------------------------------------------------------
 * STATUS COLORS SIMPLIFICADOS
 * -------------------------------------------------------------------------- */
export const STATUS_COLORS = {
  COMPLETADA:   cssVar('--chart-green'),
  CANCELADA:    cssVar('--chart-red'),
  PROGRAMADA:   cssVar('--chart-yellow'),
  PRESENTE:     cssVar('--chart-blue'),
  REAGENDADA:   cssVar('--chart-purple'),
  "NO ASISTIO": cssVar('--chart-gray'),
  CONFIRMADA:   cssVar('--chart-teal'),
} as const;

const defaultStatusColor = cssVar('--chart-gray');
export const getStatusColor = (status: keyof typeof STATUS_COLORS): string =>
  STATUS_COLORS[status] || defaultStatusColor;

/* ----------------------------------------------------------------------------
 * ESTILOS GLOBALES OPTIMIZADOS
 * -------------------------------------------------------------------------- */
export const CHART_STYLES = {
  tooltip: {
    background: cssVar('--background'),
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,.12), 0 4px 16px rgba(0,0,0,.08)',
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: cssVar('--foreground'),
    backdropFilter: 'blur(8px)',
    border: `1px solid ${cssVar('--border')}`,
    transition: 'all 0.2s ease-in-out',
  } as const satisfies CSSProperties,
  
  legend: {
    fontSize: 13,
    fontWeight: 500,
    color: cssVar('--muted-foreground'),
    iconSize: 12,
    padding: 8,
    lineHeight: 1.6,
  } as const satisfies CSSProperties,
  
  colors: {
    primary: cssVar('--primary'),
    secondary: cssVar('--secondary'),
    neutral: cssVar('--muted'),
    neutralText: cssVar('--muted-foreground'),
    accent: cssVar('--accent'),
    success: cssVar('--chart-green'),
    warning: cssVar('--chart-yellow'),
    error: cssVar('--chart-red'),
  } as const,
  
  axis: {
    tickColor: cssVar('--border'),
    lineColor: cssVar('--border'),
    labelColor: cssVar('--muted-foreground'),
    labelFontSize: 12,
    labelFontWeight: 500,
  } as const,
  
  grid: {
    strokeDasharray: '2 4',
    stroke: cssVar('--border'),
    strokeOpacity: 0.6,
    vertical: false,
  } as const,
  
  animation: {
    duration: 1000,
    easing: 'easeOutCubic',
    delay: 0,
    stagger: 100,
  } as const,
  
  interactions: {
    hover: {
      scale: 1.05,
      transition: 'all 0.2s ease-out',
      shadowElevation: '0 8px 25px rgba(0,0,0,0.15)',
    },
    active: {
      scale: 0.98,
      transition: 'all 0.1s ease-in',
    },
    focus: {
      outline: `2px solid ${cssVar('--primary')}`,
      outlineOffset: 2,
    },
  } as const,
  
  area: {
    fillOpacity: 0.7,
    strokeWidth: 2.5,
    activeDotSize: 8,
    dotSize: 5,
    gradient: true,
  } as const,
  
  bar: {
    radius: 6,
    barGap: 6,
    barCategoryGap: 20,
    minHeight: 4,
    hoverOpacity: 0.8,
  } as const,
  
  line: {
    strokeWidth: 3,
    activeDotSize: 8,
    dotSize: 5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const,
  
  pie: {
    innerRadius: 0.55,
    outerRadius: 0.90,
    paddingAngle: 3,
    labelOffset: 15,
    cornerRadius: 6,
    strokeWidth: 2,
    hoverOffset: 8,
  } as const,
} as const;

/* ----------------------------------------------------------------------------
 * UTILIDADES PARA TEMAS SIMPLIFICADAS
 * -------------------------------------------------------------------------- */

// Cache con throttling optimizado
let isDarkCached: boolean | undefined = undefined;
let lastChecked = 0;
const CHECK_INTERVAL = 2000;

export const isDarkTheme = (): boolean => {
  if (typeof window === 'undefined') return false;

  const now = Date.now();
  if (isDarkCached !== undefined && now - lastChecked < CHECK_INTERVAL) {
    return isDarkCached;
  }

  isDarkCached = document.documentElement.classList.contains('dark');
  lastChecked = now;
  return isDarkCached;
};

// Funciones de color simplificadas
const colorFuncCache = new Map<string, string>();

export const getContrastColor = (baseColorHslVar: string): string => {
  const isDark = isDarkTheme();
  const cacheKey = `${baseColorHslVar}-${isDark}`;
  if (colorFuncCache.has(cacheKey)) return colorFuncCache.get(cacheKey) as string;

  const result = isDark
    ? `color-mix(in srgb, ${baseColorHslVar} 80%, white)`
    : `color-mix(in srgb, ${baseColorHslVar} 80%, black)`;
  
  if (colorFuncCache.size >= 50) {
    const firstKey = colorFuncCache.keys().next().value;
    colorFuncCache.delete(firstKey);
  }
  
  colorFuncCache.set(cacheKey, result);
  return result;
};

export const getAdaptiveBackground = (opacity = 0.9): string => {
  const isDark = isDarkTheme();
  const cacheKey = `bg-${opacity}-${isDark}`;
  if (colorFuncCache.has(cacheKey)) return colorFuncCache.get(cacheKey) as string;

  const result = isDark
    ? `hsla(222.2, 84%, 4.9%, ${opacity})`
    : `hsla(210, 40%, 98%, ${opacity})`;
  
  if (colorFuncCache.size >= 50) {
    const firstKey = colorFuncCache.keys().next().value;
    colorFuncCache.delete(firstKey);
  }
  
  colorFuncCache.set(cacheKey, result);
  return result;
};

/* ----------------------------------------------------------------------------
 * PRESETS SIMPLIFICADOS
 * -------------------------------------------------------------------------- */
export const CHART_PRESETS = {
  medical: {
    colors: getChartColors('medical', 8),
    styles: {
      ...CHART_STYLES,
      animation: { ...CHART_STYLES.animation, duration: 800 },
    },
  },
  dashboard: {
    colors: getChartColors('patients', 6),
    styles: {
      ...CHART_STYLES,
      pie: { ...CHART_STYLES.pie, innerRadius: 0.45 },
    },
  },
  comparison: {
    colors: getChartColors('comparison', 4),
    styles: {
      ...CHART_STYLES,
      bar: { ...CHART_STYLES.bar, radius: 8 },
    },
  },
} as const;

export type ChartPresetKey = keyof typeof CHART_PRESETS;
export const getChartPreset = (preset: ChartPresetKey) => CHART_PRESETS[preset];

export default {
  CHART_PALETTES,
  STATUS_COLORS,
  CHART_STYLES,
  CHART_PRESETS,
  getChartColors,
  getStatusColor,
  getContrastColor,
  getAdaptiveBackground,
  isDarkTheme,
};