// app/dashboard/data-model.ts
// Definición de tipos del modelo de datos para el dashboard

/**
 * Enumeración de los tipos de diagnósticos
 */
export enum DiagnosisEnum {
  HERNIA = "hernia",
  VESICULA = "vesicula",
  APENDICITIS = "apendicitis",
  OTROS = "otros"
}

/**
 * Enumeración de los orígenes de los pacientes
 */
export enum PatientOriginEnum {
  REFERIDO = "referido",
  DIRECTO = "directo",
  SEGURO = "seguro",
  CAMPAÑA = "campaña",
  OTRO = "otro"
}

/**
 * Métrica individual para gráficos
 */
export interface ChartMetric {
  name: string;
  value: number;
  color?: string;
}

/**
 * Datos de diagnóstico para gráficos
 */
export interface DiagnosticData {
  label: string;
  count: number;
  percentage: number;
}

/**
 * Métricas generales de la clínica
 */
export interface ClinicMetrics {
  totalPacientes: number;
  pacientesNuevosMes: number;
  pacientesOperados: number;
  pacientesNoOperados: number;
  pacientesSeguimiento: number;
  tasaConversion: number;
  tiempoPromedioDecision: number;
  fuentePrincipalPacientes: string;
  diagnosticosMasComunes: Array<{ name: string; count: number }>;
  name?: string;
  count?: number;
  lastUpdated: string;
}

/**
 * Estadísticas por período de tiempo
 */
export interface PeriodStats {
  period: string;
  count: number;
  change: number;
}
