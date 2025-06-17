/* -------------------------------------------------------------------------- */
/*  components/chart-theme.tsx - OPTIMIZADO                                   */
/* -------------------------------------------------------------------------- */

import type { CSSProperties } from 'react';

/** Cache global para valores CSS var */
const cssVarCache = new Map<string, string>();

/** Mapea un nombre de CSS-var a su string HSL con cache */
const cssVar = (name: string): string => {
  const cached = cssVarCache.get(name);
  if (cached) return cached;
  
  const value = `hsl(var(${name}))`;
  cssVarCache.set(name, value);
  return value;
};

/* ----------------------------------------------------------------------------
 * 1. VARIABLES BASE EXPANDIDAS
 * -------------------------------------------------------------------------- */
const vars = {
  primary: [
    '--primary-50','--primary-100','--primary-200','--primary-300','--primary-400',
    '--primary-500','--primary-600','--primary-700','--primary-800','--primary-900','--primary-950',
  ] as const,
  secondary: [
    '--secondary','--secondary-foreground',
    '--muted','--muted-foreground',
    '--accent','--accent-foreground',
  ] as const,
  neutral: [
    '--background','--card','--muted','--border',
    '--muted-foreground','--foreground','--card-foreground',
  ] as const,
  clinical: {
    healthy:     '--chart-green',
    attention:   '--chart-yellow',
    critical:    '--chart-red',
    stable:      '--chart-blue',
    improving:   '--chart-2',
    chronic:     '--chart-purple',
    emergency:   '--chart-orange',
    routine:     '--chart-teal',
  } as const,
  accent: {
    teal:      '--chart-2',
    lavender:  '--chart-5',
    mint:      '--chart-6',
    coral:     '--chart-4',
    navy:      '--chart-1',
    sunset:    '--chart-orange',
    ocean:     '--chart-cyan',
    forest:    '--chart-green-dark',
  } as const,
  semantic: {
    success:   '--chart-green',
    warning:   '--chart-yellow',
    error:     '--chart-red',
    info:      '--chart-blue',
    primary:   '--chart-1',
    secondary: '--chart-2',
  } as const,
} as const;

/* ----------------------------------------------------------------------------
 * 2. GENERADORES DE PALETA OPTIMIZADOS
 * -------------------------------------------------------------------------- */
const paletteCache = new Map<string, any>();

const createPalette = <T extends readonly string[]>(
  list: T,
  cacheKey?: string
): Readonly<{ [K in keyof T]: string }> => {
  const key = cacheKey || list.join(',');
  const cached = paletteCache.get(key);
  if (cached) return cached;

  const result = list.map(cssVar) as unknown as Readonly<{ [K in keyof T]: string }>;
  paletteCache.set(key, result);
  return result;
};

const createRecordPalette = <T extends Record<string, string>>(
  rec: T,
  cacheKey?: string
): Readonly<{ [K in keyof T]: string }> => {
  const key = cacheKey || Object.values(rec).join(',');
  const cached = paletteCache.get(key);
  if (cached) return cached;

  const out: Record<keyof T, string> = {} as any;
  for (const k in rec) {
    out[k] = cssVar(rec[k]);
  }
  const result = out as Readonly<{ [K in keyof T]: string }>;
  paletteCache.set(key, result);
  return result;
};

/* ----------------------------------------------------------------------------
 * 3. PALETAS GENERALES MEJORADAS
 * -------------------------------------------------------------------------- */
export const PALETTE = {
  primary:   createPalette(vars.primary, 'primary'),
  secondary: createPalette(vars.secondary, 'secondary'),
  neutral:   createPalette(vars.neutral, 'neutral'),
  clinical:  createRecordPalette(vars.clinical, 'clinical'),
  accent:    createRecordPalette(vars.accent, 'accent'),
  semantic:  createRecordPalette(vars.semantic, 'semantic'),
} as const;

export type PaletteKey = keyof typeof PALETTE;

/* ----------------------------------------------------------------------------
 * 4. PALETAS ESPECIALIZADAS POR CONTEXTO MÉDICO
 * -------------------------------------------------------------------------- */
export const CHART_PALETTES = {
  medical:      ['--chart-1','--chart-2','--chart-green','--chart-purple','--chart-3','--chart-6','--chart-blue','--chart-4','--chart-5','--chart-yellow'] as const,
  diagnosis:    ['--chart-1','--chart-2','--chart-6','--chart-yellow','--chart-blue','--chart-purple','--chart-4','--chart-3','--chart-red','--chart-5'] as const,
  patients:     ['--chart-blue','--chart-1','--chart-green','--chart-2','--chart-6','--chart-5','--chart-yellow','--chart-3','--chart-4','--chart-purple'] as const,
  trends:       ['--chart-1','--chart-4','--chart-purple','--chart-green','--chart-yellow','--chart-6','--chart-blue','--chart-3','--chart-2','--chart-5'] as const,
  comparison:   ['--chart-1','--chart-2','--chart-6','--chart-yellow','--chart-blue','--chart-purple','--chart-3','--chart-green'] as const,
  appointments: ['--chart-blue','--chart-green','--chart-yellow','--chart-red','--chart-purple','--chart-gray'] as const,
  surgery:      ['--chart-1','--chart-green','--chart-orange','--chart-purple','--chart-blue'] as const,
  emergency:    ['--chart-red','--chart-orange','--chart-yellow','--chart-blue','--chart-purple'] as const,
  recovery:     ['--chart-green','--chart-2','--chart-blue','--chart-teal','--chart-mint'] as const,
} as const;

export type ChartPaletteKey = keyof typeof CHART_PALETTES;
export type ChartColorSet = readonly string[];

const chartPaletteCache = new Map<string, ChartColorSet>();

export function getChartColors(
  palette: ChartPaletteKey = 'medical',
  count = 10,
  startIndex = 0
): ChartColorSet {
  const cacheKey = `${palette}-${count}-${startIndex}`;
  const cached = chartPaletteCache.get(cacheKey);
  if (cached) return cached;

  const basePalette = CHART_PALETTES[palette];
  const paletteLength = basePalette.length;
  const actualStartIndex = startIndex % paletteLength;

  const selectedVars: string[] = [];
  
  for (let i = 0; i < count; i++) {
    selectedVars.push(basePalette[(actualStartIndex + i) % paletteLength]);
  }

  const result = selectedVars.map(cssVar) as ChartColorSet;
  chartPaletteCache.set(cacheKey, result);
  return result;
}

/* ----------------------------------------------------------------------------
 * 5. HELPERS SEMÁNTICOS MEJORADOS
 * -------------------------------------------------------------------------- */
export const STATUS_COLORS = createRecordPalette({
  COMPLETADA:   '--chart-green',
  CANCELADA:    '--chart-red',
  PROGRAMADA:   '--chart-yellow',
  PRESENTE:     '--chart-blue',
  REAGENDADA:   '--chart-purple',
  "NO ASISTIO": '--chart-gray',
  CONFIRMADA:   '--chart-teal',
  alta:         '--chart-green',
  internado:    '--chart-blue',
  critico:      '--chart-red',
  estable:      '--chart-teal',
  mejorando:    '--chart-2',
  programado:   '--chart-blue',
  en_proceso:   '--chart-yellow',
  completado:   '--chart-green',
  cancelado:    '--chart-red',
  diferido:     '--chart-purple',
}, 'status-colors');

const defaultStatusColor = cssVar('--chart-gray'); // Pre-cacheado
export const getStatusColor = (status: keyof typeof STATUS_COLORS): string =>
  STATUS_COLORS[status] || defaultStatusColor;

// Cache para getSequentialScale
const sequentialScaleCache = new Map<string, readonly string[]>();

export function getSequentialScale(
  baseColorVarName: string = '--chart-1',
  steps = 6,
  direction: 'lighter' | 'darker' | 'both' = 'lighter'
): readonly string[] {
  const cacheKey = `sequential-${baseColorVarName}-${steps}-${direction}`;
  const cached = sequentialScaleCache.get(cacheKey);
  if (cached) return cached;

  const baseHslColor = cssVar(baseColorVarName);
  const variations: string[] = [];

  for (let i = 0; i < steps; i++) {
    let opacity: number;
    if (direction === 'lighter') {
      opacity = 1 - (i / (steps - 1)) * 0.85;
    } else if (direction === 'darker') {
      opacity = 1;
    } else { // 'both'
      const midPoint = (steps - 1) / 2;
      opacity = 1 - (Math.abs(i - midPoint) / midPoint) * 0.8;
    }
    variations.push(`${baseHslColor}/${Math.max(0.1, Math.min(1, opacity))}`);
  }
  
  const result = variations as readonly string[];
  sequentialScaleCache.set(cacheKey, result);
  return result;
}

/* ----------------------------------------------------------------------------
 * 6. ESTILOS GLOBALES MEJORADOS CON ANIMACIONES
 * -------------------------------------------------------------------------- */
export const CHART_STYLES = {
  tooltip: {
    background: cssVar('--chart-tooltip-bg'),
    borderRadius: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,.12), 0 4px 16px rgba(0,0,0,.08)',
    padding: '12px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: cssVar('--chart-tooltip-text'),
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
    tickColor: cssVar('--chart-grid'),
    lineColor: cssVar('--chart-grid'),
    labelColor: cssVar('--muted-foreground'),
    labelFontSize: 12,
    labelFontWeight: 500,
  } as const,
  
  grid: {
    strokeDasharray: '2 4',
    stroke: cssVar('--chart-grid'),
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
  
  radar: {
    fillOpacity: 0.4,
    strokeWidth: 2.5,
    dotSize: 6,
  } as const,
  
  scatter: {
    dotSize: { min: 4, max: 20 },
    opacity: 0.8,
    strokeWidth: 1,
  } as const,
} as const;

/* ----------------------------------------------------------------------------
 * 7. UTILIDADES PARA TEMAS Y ACCESIBILIDAD
 * -------------------------------------------------------------------------- */

// Cache para isDarkTheme con throttling
let isDarkCached: boolean | undefined = undefined;
let lastChecked = 0;
const CHECK_INTERVAL = 1000;

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

// Cache para funciones de color
const contrastColorCache = new Map<string, string>();
export const getContrastColor = (baseColorHslVar: string): string => {
  const isDark = isDarkTheme();
  const cacheKey = `${baseColorHslVar}-${isDark}`;
  const cached = contrastColorCache.get(cacheKey);
  if (cached) return cached;

  const result = isDark
    ? `color-mix(in srgb, ${baseColorHslVar} 80%, white)`
    : `color-mix(in srgb, ${baseColorHslVar} 80%, black)`;
  contrastColorCache.set(cacheKey, result);
  return result;
};

const adaptiveBgCache = new Map<string, string>();
export const getAdaptiveBackground = (opacity = 0.9): string => {
  const isDark = isDarkTheme();
  const cacheKey = `${opacity}-${isDark}`;
  const cached = adaptiveBgCache.get(cacheKey);
  if (cached) return cached;

  const result = isDark
    ? `hsla(var(--slate-900-hsl, 222.2 84% 4.9%) / ${opacity})`
    : `hsla(var(--slate-50-hsl, 210 40% 98%) / ${opacity})`;
  adaptiveBgCache.set(cacheKey, result);
  return result;
};

/* ----------------------------------------------------------------------------
 * 8. PRESETS PARA CASOS COMUNES
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
  PALETTE,
  CHART_PALETTES,
  STATUS_COLORS,
  CHART_STYLES,
  CHART_PRESETS,
  getChartColors,
  getStatusColor,
  getSequentialScale,
  getContrastColor,
  getAdaptiveBackground,
  isDarkTheme,
};