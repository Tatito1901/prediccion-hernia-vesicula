/* -------------------------------------------------------------------------- */
/*  lib/chart/palette.ts                                                      */
/*  🎨  Paleta + helpers para todos los charts                                */
/* -------------------------------------------------------------------------- */

'use client';

import type { CSSProperties } from 'react';

/* ----------------------------------------------------------------------------
 * 1. PALETAS INMUTABLES
 * -------------------------------------------------------------------------- */

export const PALETTE = Object.freeze({
  primary: [
    '#E6F7FF', '#BAE7FF', '#91D5FF', '#69C0FF', '#40A9FF',
    '#1890FF', '#096DD9', '#0050B3', '#003A8C',
  ] as const,

  secondary: [
    '#E6FFFB', '#B5F5EC', '#87E8DE', '#5CDBD3', '#36CFC9',
    '#13C2C2', '#08979C', '#006D75', '#00474F',
  ] as const,

  accent: Object.freeze({
    teal:      '#20B2AA',
    lavender:  '#9683EC',
    mint:      '#5AC8C8',
    coral:     '#FF7F50',
    navy:      '#0A2463',
  }),

  clinical: Object.freeze({
    healthy:   '#52C41A',
    attention: '#FAAD14',
    critical:  '#F5222D',
    stable:    '#1890FF',
    improving: '#13C2C2',
    chronic:   '#722ED1',
  }),

  neutral: [
    '#FFFFFF', '#F5F7FA', '#E4E9F2', '#C5CEE0', '#A6B1C9',
    '#8897B8', '#5E6C8F', '#384366', '#1A2138',
  ] as const,

  charts: Object.freeze({
    medical: [
      '#1890FF', '#13C2C2', '#52C41A', '#722ED1', '#2F54EB',
      '#1D39C4', '#08979C', '#006D75', '#5B8FF9', '#5AD8A6',
    ] as const,
    diagnosis: [
      '#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#6DC8EC',
      '#945FB9', '#FF9845', '#1E9493', '#FF99C3', '#5D61BF',
    ] as const,
    patients: [
      '#5B8FF9', '#CDDDFD', '#61DDAA', '#CDF3E4', '#65789B',
      '#CED4DE', '#F6BD16', '#FCEBB9', '#7262FD', '#D3CEFD',
    ] as const,
    trends: [
      '#55A6F3', '#E8684A', '#9270CA', '#59CB74', '#F5C73D',
      '#5D7092', '#6DC8EC', '#FF9845', '#1E9493', '#FF99C3',
    ] as const,
    comparison: [
      '#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16',
      '#6DC8EC', '#945FB9', '#FF9845', '#1E9493',
    ] as const,
  }),
});

/* ----------------------------------------------------------------------------
 * 2. ESTILOS GLOBALES PARA CHARTS
 * -------------------------------------------------------------------------- */
export const CHART_STYLES = Object.freeze({
  tooltip:  { background: '#fff', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.08)', padding: '10px 14px', fontSize: 12, color: '#384366' } as const,
  legend:   { fontSize: 12, color: '#5E6C8F', iconSize: 10, padding: 5 } as const,
  axis:     { tickColor: '#E4E9F2', lineColor: '#E4E9F2', labelColor: '#5E6C8F', labelFontSize: 12 } as const,
  grid:     { strokeDasharray: '3 3', stroke: '#E4E9F2', vertical: false } as const,
  animation:{ duration: 800, easing: 'easeOutCubic' } as const,
  area:     { fillOpacity: 0.6, strokeWidth: 2, activeDotSize: 6 } as const,
  bar:      { radius: 4, barGap: 4, barCategoryGap: 16 } as const,
  line:     { strokeWidth: 2, activeDotSize: 6, dotSize: 4 } as const,
  pie:      { innerRadius: 50, outerRadius: 90, paddingAngle: 2, labelOffset: 10, cornerRadius: 4 } as const,
  radar:    { fillOpacity: 0.6, strokeWidth: 2 } as const,
});

/* ----------------------------------------------------------------------------
 * 3. HELPERS (memorizados)                                                   |
 * -------------------------------------------------------------------------- */
type PaletteKey = keyof typeof PALETTE.charts;

const memoColorSets = new Map<string, readonly string[]>();

/** Colores categóricos - siempre devuelve el mismo array memoizado */
export function getChartColors(
  palette: PaletteKey = 'medical',
  count = 10
): readonly string[] {
  const key = `${palette}-${count}`;
  if (memoColorSets.has(key)) return memoColorSets.get(key)!;

  const full = PALETTE.charts[palette];
  const res =
    count <= full.length
      ? full.slice(0, count)
      : Array.from({ length: count }, (_, i) => full[i % full.length]); // wrap-around

  memoColorSets.set(key, res);
  return res;
}

/** Colores por estado clínico */
const STATUS_COLORS: Record<string, string> = {
  completada: PALETTE.clinical.healthy,
  cancelada:  PALETTE.clinical.critical,
  pendiente:  PALETTE.clinical.attention,
  presente:   PALETTE.clinical.stable,
};

export const getStatusColor = (status: string): string =>
  STATUS_COLORS[status] ?? PALETTE.neutral[5];

/** Escala secuencial sencilla (aclara hacia blanco) */
export function getSequentialScale(steps = 6): string[] {
  const baseHex = PALETTE.primary[4]; // #40A9FF
  const [r, g, b] = baseHex.match(/\w\w/g)!.map(h => parseInt(h, 16));
  return Array.from({ length: steps }, (_, i) => {
    const k = i / (steps - 1);
    const shade = (c: number) =>
      Math.round(c + (255 - c) * (1 - k))
        .toString(16)
        .padStart(2, '0');
    return `#${shade(r)}${shade(g)}${shade(b)}`;
  });
}

/* ----------------------------------------------------------------------------
 * 4. TIPOS PÚBLICOS                                                          |
 * -------------------------------------------------------------------------- */
export type ChartColorSet   = ReturnType<typeof getChartColors>;
export type SequentialScale = ReturnType<typeof getSequentialScale>;
export type ChartStyles     = typeof CHART_STYLES;
