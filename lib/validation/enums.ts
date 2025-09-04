// lib/validation/enums.ts
// DEPRECATED - Mantenido solo para compatibilidad temporal
// Todos los nuevos imports deben usar @/lib/constants
// TODO: Eliminar este archivo después de migrar todos los componentes

export {
  // Re-exporta desde la fuente centralizada para mantener compatibilidad
  AppointmentStatusEnum,
  PatientStatusEnum,
  UserRoleEnum,
  ZAppointmentStatus,
  ZDiagnosisDb,
  dbDiagnosisToDisplay,
  DIAGNOSIS_DB_VALUES,
  type AppointmentStatus,
  type PatientStatus,
  type UserRole,
} from '@/lib/constants';
