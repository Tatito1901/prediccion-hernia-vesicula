export interface PatientData {
  id: string;
  diagnostico_principal?: string;
  fecha_registro?: string;
  [key: string]: any;
}

export interface ChartData {
  tipo: string;
  cantidad: number;
}

export interface DiagnosticInsight {
  title: string;
  description: string;
  level: 'info' | 'warning' | 'critical';
}

