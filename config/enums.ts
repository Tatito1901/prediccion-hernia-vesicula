// Enumeración para tipos de diagnósticos
export enum DiagnosisEnum {
  HERNIA_INGUINAL = "Hernia Inguinal",
  HERNIA_FEMORAL = "Hernia Femoral",
  HERNIA_UMBILICAL = "Hernia Umbilical",
  HERNIA_INCISIONAL = "Hernia Incisional",
  COLECISTITIS = "Colecistitis",
  COLELITIASIS = "Colelitiasis",
  OTROS = "Otros"
}

// Tipo para opciones de rango de fechas
export type DateRangeOption = '7dias' | '15dias' | '30dias' | '90dias' | '180dias' | '365dias' | 'personalizado';
