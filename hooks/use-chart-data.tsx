// hooks/use-chart-data.tsx
import { useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  DiagnosisData,
  PatientData,
  GeneralStats,
} from '@/components/charts/use-chart-config';
import { WEEKDAYS_SHORT } from '@/components/charts/use-chart-config';
import { AppointmentStatusEnum, PatientStatusEnum, Patient, Appointment } from '@/lib/types';

// Definimos el tipo AppointmentStatus para mantener compatibilidad con el código existente
// Es importante notar que en AppointmentStatusEnum usamos NO_ASISTIO (con guiones bajos)
// pero en el código original se usa 'NO ASISTIO' (con espacio)
type AppointmentStatus = 
  | 'PROGRAMADA'
  | 'CONFIRMADA'
  | 'CANCELADA'
  | 'COMPLETADA'
  | 'NO ASISTIO' // Mantenemos esta forma para compatibilidad
  | 'PRESENTE'
  | 'REAGENDADA';

// Constantes para mejorar mantenibilidad
const DEFAULT_STALE_TIME = 60000; // 1 minuto
const MIN_REFRESH_INTERVAL = 1000; // 1 segundo mínimo

// Usando tipos centralizados de la base de datos en lugar de definiciones locales
// Para referencia, las interfaces originales son reemplazadas por Patient y Appointment de lib/types

// Extendemos los tipos centralizados para incluir campos específicos necesarios para visualizaciones
// que podrían no estar en la base de datos original
// Definimos un tipo que extiende Patient pero sin conflictos de tipos
type ExtendedPatient = Patient & {
  // Campos adicionales que no están en el tipo Patient original
  origen_paciente?: string;
  probabilidad_cirugia?: number;
  ultimo_contacto?: string;
  proximo_contacto?: string;
  etiquetas?: string[];
  fecha_cirugia_programada?: string;
  doctor_info?: {
    id: string;
    full_name: string;
  };
};

// Extensión para Appointment cuando sea necesario
type ExtendedAppointment = Appointment & {
  patient_name?: string;
  doctor_info?: {
    full_name: string;
  };
}

export type DateRangeOption = '7dias' | '30dias' | '90dias' | 'ytd' | 'todos';

interface UseChartDataParams {
  dateRange?: DateRangeOption;
  patientId?: string;
  doctorId?: string;
  estado?: string;
  refreshInterval?: number;
}

interface ChartDataError {
  appointments: string | null;
  patients: string | null;
}

interface ChartData {
  transformedPatients: PatientData[];
  diagnosisData: DiagnosisData[];
  generalStats: GeneralStats;
  weekdayDistribution: WeekdayData[];
  clinicMetrics: ClinicMetrics;
}

interface WeekdayData {
  name: string;
  total: number;
  attended: number;
  rate: number;
}

interface ClinicMetrics {
  totalPacientes: number;
  pacientesNuevosMes: number;
  pacientesOperados: number;
  pacientesNoOperados: number;
  pacientesSeguimiento: number;
  tasaConversion: number;
  tiempoPromedioDecision: number;
  fuentePrincipalPacientes: string;
  diagnosticosMasComunes: Array<{ name: string; count: number }>;
  lastUpdated: string;
}

// Helper para validar fechas ISO
function isValidISODate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

// Helper para fetch con manejo de errores mejorado, timeout y caché
async function fetchData<T>(url: string, errorMessage: string, timeout = 30000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Añadir configuración de caché para optimizar rendimiento
    const res = await fetch(url, { 
      signal: controller.signal,
      next: { revalidate: 60 }, // Revalidar en el servidor cada 60 segundos
      headers: { 'Cache-Control': 'max-age=60' } // Cache para navegador
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(`${errorMessage}: ${errorBody.message || res.statusText} (${res.status})`);
    }
    
    const data = await res.json();
    return data as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`${errorMessage}: Tiempo de espera agotado`);
      }
      throw error;
    }
    throw new Error(`${errorMessage}: Error desconocido`);
  }
}

// Helper para construir parámetros de consulta con validación
function buildQueryParams(params: Record<string, string | undefined>): string {
  const validParams = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => {
      const sanitizedKey = encodeURIComponent(key);
      const sanitizedValue = encodeURIComponent(value!);
      return `${sanitizedKey}=${sanitizedValue}`;
    });
  
  return validParams.length > 0 ? validParams.join('&') : '';
}

// Helper para calcular rangos de fechas
function calculateDateRange(dateRange: DateRangeOption): { startDate: string; endDate: string } {
  const today = new Date();
  const currentEndDate = today.toISOString().split('T')[0];
  let currentStartDate = '';

  switch (dateRange) {
    case '7dias': {
      const date = new Date(today);
      date.setDate(date.getDate() - 7);
      currentStartDate = date.toISOString().split('T')[0];
      break;
    }
    case '30dias': {
      const date = new Date(today);
      date.setDate(date.getDate() - 30);
      currentStartDate = date.toISOString().split('T')[0];
      break;
    }
    case '90dias': {
      const date = new Date(today);
      date.setDate(date.getDate() - 90);
      currentStartDate = date.toISOString().split('T')[0];
      break;
    }
    case 'ytd': {
      currentStartDate = `${today.getFullYear()}-01-01`;
      break;
    }
    case 'todos':
    default:
      currentStartDate = '';
      break;
  }
  
  return { startDate: currentStartDate, endDate: currentEndDate };
}

export function useChartData({
  dateRange = '30dias',
  patientId,
  doctorId,
  estado,
  refreshInterval = 0,
}: UseChartDataParams = {}) {
  const queryClient = useQueryClient();

  // Validar refreshInterval
  const validRefreshInterval = refreshInterval > 0 ? Math.max(refreshInterval, MIN_REFRESH_INTERVAL) : 0;

  // Calcular rangos de fechas
  const { startDate, endDate } = useMemo(() => calculateDateRange(dateRange), [dateRange]);

  // Unified query key para datos del dashboard
  const dashboardQueryKey = useMemo(() => 
    ['dashboard-data', dateRange, patientId, doctorId, estado, startDate, endDate],
    [dateRange, patientId, doctorId, estado, startDate, endDate]
  );

  // Para compatibilidad retroactiva mantenemos estas keys
  const appointmentsQueryKey = useMemo(() => 
    ['appointments', dateRange, patientId, doctorId, estado, startDate, endDate],
    [dateRange, patientId, doctorId, estado, startDate, endDate]
  );

  const patientsQueryKey = useMemo(() => ['patients', estado], [estado]);

  // Query unificada para ambos recursos (optimización de fetching en paralelo)
  const {
    data = { appointments: [], patients: [] },
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: dashboardQueryKey,
    queryFn: async () => {
      const appointmentsParams = buildQueryParams({ 
        startDate, 
        endDate, 
        patientId, 
        doctorId, 
        estado: estado !== 'todos' ? estado : undefined 
      });
      
      const patientsParams = buildQueryParams({ 
        estado: estado !== 'todos' ? estado : undefined 
      });

      // Ejecutar ambas peticiones en paralelo para optimizar rendimiento
      const [appointmentsData, patientsData] = await Promise.all([
        fetchData<Appointment[]>(
          `/api/appointments${appointmentsParams ? `?${appointmentsParams}` : ''}`, 
          'Error al obtener citas'
        ),
        fetchData<{ data: ExtendedPatient[], pagination: unknown }>(`/api/patients${patientsParams ? `?${patientsParams}` : ''}`, 'Error al obtener pacientes')
      ]);

      const safeAppointments = Array.isArray(appointmentsData) ? appointmentsData : [];
      const safePatients = (patientsData && typeof patientsData === 'object' && Array.isArray(patientsData.data)) 
        ? patientsData.data 
        : [];

      return { 
        appointments: safeAppointments, 
        patients: safePatients 
      };
    },
    staleTime: DEFAULT_STALE_TIME,
    retry: (failureCount, error: any) => {
      // No reintentar en errores 4xx (cliente)
      if (error?.status >= 400 && error?.status < 500) return false;
      return failureCount < 2; // Máximo 2 reintentos para otros errores
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Usar placeholderData para mostrar datos de la caché mientras se cargan nuevos
    placeholderData: (oldData) => oldData,
  });

  // Extraer datos para mantener compatibilidad con el resto del código
  const appointments = Array.isArray(data?.appointments) ? data.appointments : [];
  const patients = Array.isArray(data?.patients) ? data.patients : [];
  
  // Errores separados para retrocompatibilidad
  const loadingAppointments = loading;
  const loadingPatients = loading;
  const errorAppointments = error;
  const errorPatients = error;

  // Estados de carga y error ya definidos anteriormente, usamos directamente 'loading'
  
  const errors = useMemo<ChartDataError>(() => ({
    appointments: errorAppointments instanceof Error ? errorAppointments.message : null,
    patients: errorPatients instanceof Error ? errorPatients.message : null,
  }), [errorAppointments, errorPatients]);
  
  const hasError = Boolean(errors.appointments || errors.patients);

  // Configurar refresco automático
  useEffect(() => {
    if (validRefreshInterval > 0) {
      const intervalId = setInterval(() => {
        void queryClient.invalidateQueries({ queryKey: appointmentsQueryKey });
        void queryClient.invalidateQueries({ queryKey: patientsQueryKey });
      }, validRefreshInterval);
      
      return () => clearInterval(intervalId);
    }
  }, [validRefreshInterval, queryClient, appointmentsQueryKey, patientsQueryKey]);

  // Transformar pacientes con validación
  const transformedPatients: PatientData[] = useMemo(() => {
    return patients.map(p => ({
      id: p.id,
      diagnostico: p.diagnostico_principal || 'Sin diagnóstico',
      diagnostico_principal: p.diagnostico_principal || 'Sin diagnóstico',
      fecha_registro: p.fecha_registro || '',
      // Convertimos null a undefined para compatibilidad con PatientData
      fecha_primera_consulta: p.fecha_primera_consulta || undefined,
      edad: p.edad || 0,
      genero: undefined, // El campo genero no existe en el nuevo modelo
      paciente: `${p.nombre} ${p.apellidos}`.trim(),
      // Usamos estado_paciente como equivalente a estado
      estado: (p.estado_paciente as unknown) as AppointmentStatus, // Cast para compatibilidad
      notas: p.comentarios_registro || '',
      telefono: p.telefono || '',
      email: p.email || '',
    }));
    }), [patients]);

  // Calcular datos de diagnósticos
  const diagnosisData: DiagnosisData[] = useMemo(() => {
    const counts = new Map<string, number>();
    
    // Contar diagnósticos de pacientes
    patients.forEach(p => {
      if (p.diagnostico_principal?.trim()) {
        const diag = p.diagnostico_principal.trim();
        counts.set(diag, (counts.get(diag) || 0) + 1);
      }
    });
    
    // Contar motivos de cita
    appointments.forEach(a => {
      if (a.motivo_cita?.trim()) {
        const motivo = a.motivo_cita.trim();
        counts.set(motivo, (counts.get(motivo) || 0) + 1);
      }
    });

    const totalDiagnoses = Array.from(counts.values()).reduce((sum, current) => sum + current, 0);

    return Array.from(counts.entries())
      .map(([tipo, cantidad]) => ({
        tipo,
        cantidad,
        porcentaje: totalDiagnoses > 0 ? parseFloat(((cantidad / totalDiagnoses) * 100).toFixed(2)) : 0,
        descripcion: `${tipo} - ${cantidad} caso${cantidad !== 1 ? 's' : ''}`,
      }))
      .sort((a, b) => b.cantidad - a.cantidad); // Ordenar por cantidad descendente
  }, [patients, appointments]);

  // Calcular estadísticas generales
  const generalStats = useMemo((): GeneralStats => {
    // Usamos un objeto con claves específicas para mantener compatibilidad
    const statusCounts = {
      PROGRAMADA: 0,
      CONFIRMADA: 0,
      CANCELADA: 0,
      COMPLETADA: 0,
      'NO ASISTIO': 0, // Mantenemos la clave con espacio para compatibilidad
      PRESENTE: 0,
      REAGENDADA: 0,
    };

    appointments.forEach(a => {
      // Necesitamos mapear de NO_ASISTIO (con guiones bajos) a 'NO ASISTIO' (con espacio)
      const estadoCita = a.estado_cita === 'NO_ASISTIO' ? 'NO ASISTIO' : a.estado_cita;
      
      // Verificar si existe la clave en statusCounts
      if (estadoCita && estadoCita in statusCounts) {
        // @ts-ignore - Ignoramos error de índice porque sabemos que las claves existen
        statusCounts[estadoCita]++;
      }
    });

    const total = appointments.length;
    const attendedCount = statusCounts.COMPLETADA + statusCounts.PRESENTE;
    const cancelledOrNoShowCount = statusCounts.CANCELADA + statusCounts['NO ASISTIO'];
    
    const attendance = total > 0 ? (attendedCount / total) * 100 : 0;
    const cancellation = total > 0 ? (cancelledOrNoShowCount / total) * 100 : 0;

    return {
      total,
      attendance: parseFloat(attendance.toFixed(2)),
      cancellation: parseFloat(cancellation.toFixed(2)),
      pending: statusCounts.PROGRAMADA + statusCounts.CONFIRMADA,
      present: statusCounts.PRESENTE,
      completed: statusCounts.COMPLETADA,
      cancelled: statusCounts.CANCELADA,
      pendingCount: statusCounts.PROGRAMADA,
      presentCount: statusCounts.PRESENTE,
      period: dateRange,
      allStatusCounts: statusCounts,
    };
  }, [appointments, dateRange]);

  // Calcular distribución por día de la semana
  const weekdayDistribution = useMemo((): WeekdayData[] => {
    // Inicializar con los días de la semana
    const data = WEEKDAYS_SHORT.map(name => ({ name, total: 0, attended: 0 }));
    
    appointments.forEach(a => {
      if (!a.fecha_hora_cita || !isValidISODate(a.fecha_hora_cita)) {
        console.warn(`Fecha inválida para cita ID ${a.id}: ${a.fecha_hora_cita}`);
        return;
      }
      
      try {
        const date = new Date(a.fecha_hora_cita);
        const dayOfWeek = date.getDay(); // 0 (Dom) a 6 (Sáb)
        
        if (dayOfWeek >= 0 && dayOfWeek < 7) {
          data[dayOfWeek].total++;
          if (a.estado_cita === 'COMPLETADA' || a.estado_cita === 'PRESENTE') {
            data[dayOfWeek].attended++;
          }
        }
      } catch (e) {
        console.error(`Error procesando fecha para cita ID ${a.id}:`, e);
      }
    });

    return data.map(d => ({
      name: d.name,
      total: d.total,
      attended: d.attended,
      rate: d.total > 0 ? parseFloat(((d.attended / d.total) * 100).toFixed(2)) : 0,
    }));
  }, [appointments]);

  // Calcular métricas de clínica
  const clinicMetrics = useMemo((): ClinicMetrics => {
    const totalPacientes = patients.length;
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Pacientes nuevos del mes
    const pacientesNuevosMes = patients.filter(p => {
      if (!p.fecha_registro || !isValidISODate(p.fecha_registro)) return false;
      try {
        return new Date(p.fecha_registro) >= startOfMonth;
      } catch {
        return false;
      }
    }).length;

    // Conteo por estado
    const pacientesOperados = patients.filter(p => p.estado_paciente === 'OPERADO').length;
    const pacientesNoOperados = patients.filter(p => p.estado_paciente === 'NO OPERADO').length;
    const pacientesSeguimiento = patients.filter(p => p.estado_paciente === 'EN SEGUIMIENTO').length;
    
    // Tasa de conversión
    const tasaConversion = totalPacientes > 0 
      ? parseFloat(((pacientesOperados / totalPacientes) * 100).toFixed(2)) 
      : 0;

    // Tiempo promedio de decisión
    let totalDiasDecision = 0;
    let conteoDecision = 0;
    
    patients.forEach(p => {
      if ((p.estado_paciente === 'OPERADO' || p.estado_paciente === 'NO OPERADO') && 
          p.fecha_primera_consulta && 
          p.fecha_cirugia_programada &&
          isValidISODate(p.fecha_primera_consulta) &&
          isValidISODate(p.fecha_cirugia_programada)) {
        try {
          const fechaConsulta = new Date(p.fecha_primera_consulta);
          const fechaDecision = new Date(p.fecha_cirugia_programada);
          const dias = Math.ceil((fechaDecision.getTime() - fechaConsulta.getTime()) / (1000 * 3600 * 24));
          
          if (dias >= 0 && dias < 365) { // Validar que sea un rango razonable
            totalDiasDecision += dias;
            conteoDecision++;
          }
        } catch (e) {
          console.error(`Error calculando días de decisión para paciente ${p.id}:`, e);
        }
      }
    });
    
    const tiempoPromedioDecision = conteoDecision > 0 
      ? Math.round(totalDiasDecision / conteoDecision) 
      : 0;

    // Diagnósticos más comunes
    const diagnosticosCount = new Map<string, number>();
    patients.forEach(p => {
      if (p.diagnostico_principal?.trim()) {
        const diag = p.diagnostico_principal.trim();
        diagnosticosCount.set(diag, (diagnosticosCount.get(diag) || 0) + 1);
      }
    });

    const diagnosticosMasComunes = Array.from(diagnosticosCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalPacientes,
      pacientesNuevosMes,
      pacientesOperados,
      pacientesNoOperados,
      pacientesSeguimiento,
      tasaConversion,
      tiempoPromedioDecision,
      fuentePrincipalPacientes: 'REFERIDO', // TODO: Calcular dinámicamente basado en origen_paciente
      diagnosticosMasComunes,
      lastUpdated: new Date().toISOString(),
    };
  }, [patients]);

  // Función de refresco manual
  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: appointmentsQueryKey });
    void queryClient.invalidateQueries({ queryKey: patientsQueryKey });
  }, [queryClient, appointmentsQueryKey, patientsQueryKey]);

  // Datos procesados
  const chartData: ChartData = useMemo(() => ({
    transformedPatients,
    diagnosisData,
    generalStats,
    weekdayDistribution,
    clinicMetrics,
  }), [transformedPatients, diagnosisData, generalStats, weekdayDistribution, clinicMetrics]);

  return {
    loading,
    error: hasError ? (errors.appointments || errors.patients || 'Error desconocido') : null,
    errors,
    rawData: { appointments, patients },
    chartData,
    refresh,
    // Exponer métodos útiles adicionales
    isStale: {
      appointments: queryClient.getQueryState(appointmentsQueryKey)?.isInvalidated ?? false,
      patients: queryClient.getQueryState(patientsQueryKey)?.isInvalidated ?? false,
    },
  };
}