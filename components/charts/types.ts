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

export interface TimelineData {
  date: string; // Cambiado de 'fecha' a 'date' para ser compatible con chart-diagnostic
  formattedDate: string;
  cantidad: number;
}
