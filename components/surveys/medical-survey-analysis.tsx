"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts"
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Search,
  SortAsc,
  Calendar,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Activity,
  HeartPulse,
  Clock,
  Stethoscope,
  UserRound,
  Medal,
} from "lucide-react"
import { gridLayouts, responsiveHeight } from "@/hooks/use-breakpoint"
import { useAppContext } from "@/lib/context/app-context"
// import { saveAs } from 'file-saver' // Comentado hasta resolver dependencias

// Mapeos útiles para la visualización
const comoNosConocioMap = {
  pagina_web_google: "Página web / Google",
  redes_sociales: "Redes Sociales",
  recomendacion_medico: "Recomendación médico",
  recomendacion_familiar_amigo: "Recomendación familiar/amigo",
  seguro_medico: "Seguro médico",
  otro: "Otro"
};

const motivoVisitaMap = {
  diagnostico: "Diagnóstico inicial",
  opciones_tratamiento: "Opciones de tratamiento",
  segunda_opinion: "Segunda opinión",
  programar_cirugia: "Programar cirugía",
  valoracion_general: "Valoración general"
};

const seguroMedicoMap = {
  imss: "IMSS",
  issste: "ISSSTE",
  privado: "Seguro privado",
  ninguno: "Sin seguro",
  otro_seguro: "Otro seguro"
};

const desdeCuandoSintomaPrincipalMap = {
  menos_2_semanas: "Menos de 2 semanas",
  "2_4_semanas": "2-4 semanas",
  "1_6_meses": "1-6 meses",
  mas_6_meses: "Más de 6 meses"
};

const severidadSintomasMap = {
  leve: "Leve",
  moderada: "Moderada",
  severa: "Severa"
};

const afectacionActividadesMap = {
  ninguna: "Ninguna",
  un_poco: "Un poco",
  moderadamente: "Moderadamente",
  mucho: "Mucho"
};

const plazoResolucionMap = {
  urgente: "Urgente (días)",
  proximo_mes: "Próximo mes",
  "2_3_meses": "2-3 meses",
  sin_prisa: "Sin prisa"
};

const tiempoTomaDecisionMap = {
  misma_consulta_dias: "Misma consulta/días",
  dias: "Días",
  semanas_familia: "Semanas (consulta familia)",
  depende_complejidad: "Depende de complejidad"
};

const expectativaPrincipalMap = {
  eliminar_dolor_sintomas: "Eliminar dolor/síntomas",
  volver_actividades_normales: "Volver a actividades normales",
  prevenir_problemas_futuros: "Prevenir problemas futuros",
  recuperacion_rapida_minimas_molestias: "Recuperación rápida con mínimas molestias"
};

// Función para agrupar datos
const agruparDatos = (datos: any[], campo: string) => {
  const conteo: Record<string, number> = {};
  
  datos.forEach(dato => {
    const valor = dato[campo];
    if (valor) {
      conteo[valor] = (conteo[valor] || 0) + 1;
    }
  });
  
  return Object.entries(conteo).map(([name, value]) => ({ name, value }));
};

// Función para obtener media de valores numéricos
const obtenerMediaValores = (datos: any[], campo: string) => {
  const valoresValidos = datos
    .map(dato => dato[campo])
    .filter(valor => valor !== undefined && valor !== null);
  
  if (valoresValidos.length === 0) return 0;
  
  const suma = valoresValidos.reduce((acc, valor) => acc + valor, 0);
  return suma / valoresValidos.length;
};

// Colores para los gráficos
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF6E4A"];

// Interfaces for data structures
interface ChartDataItem {
  name: string;
  value: number;
}

interface RadarChartDataItem {
  subject: string;
  A: number; // Value for this subject
  fullMark: number; // Max value for this subject category
}

interface PacientePrioritario {
  id: string | number;
  nombre: string;
  edad: number;
  diagnostico: string;
  probabilidad: number | string; // Can be number or string like "75%"
  telefono: string;
  ultimoContacto: string; // Date string
}

interface TendenciaMensualItem {
  mes: string;
  encuestas: number;
  conversiones: number;
}

interface ComentarioReciente {
  id: string | number;
  paciente: string;
  fecha: string; // Date string
  sentimiento: 'positivo' | 'negativo' | 'neutral' | string;
  comentario: string;
}

// Datos para respaldo (usar cuando no hay datos reales)
const fallbackData = {
  totalEncuestas: 0,
  completadas: 0,
  incompletas: 0,
  tasaConversion: 0,
  diagnosticos: [] as ChartDataItem[],
  preocupaciones: [] as ChartDataItem[], 
  tendenciaMensual: [] as TendenciaMensualItem[],
  pacientesPrioritarios: [] as PacientePrioritario[],
  comentariosRecientes: [] as ComentarioReciente[],

  // Properties from metricas that need to be in fallbackData for type consistency
  intensidadDolorPromedio: 0,
  datosRadarPreocupaciones: [] as RadarChartDataItem[],
  distribucionTiempoSintomas: [] as ChartDataItem[],
  distribucionSeveridad: [] as ChartDataItem[],
  distribucionExpectativas: [] as ChartDataItem[],
  distribucionAfectacion: [] as ChartDataItem[],
  // Add other metricas properties if needed for type safety with 'data' variable
  comoNosConocioData: [] as ChartDataItem[],
  motivoVisitaData: [] as ChartDataItem[],
  seguroMedicoData: [] as ChartDataItem[],
  tiempoSintomaData: [] as ChartDataItem[],
  severidadSintomasData: [] as ChartDataItem[],
  afectacionActividadesData: [] as ChartDataItem[],
  plazoResolucionData: [] as ChartDataItem[],
  tiempoDecisionData: [] as ChartDataItem[],
  expectativaPrincipalData: [] as ChartDataItem[],
  satisfaccionGeneralPromedio: 0,
  npsScore: 0,
  sentimientoPromedioComentarios: "neutral",
  principalesTemasComentarios: [] as ChartDataItem[],
  comparativaSegmentos: [], // Define specific type if known, else ChartDataItem[] or any[]
  correlacionSintomasExpectativas: [], // Define specific type if known
  impactoTratamientoCalidadVida: [] // Define specific type if known
};

export interface MedicalSurveyAnalysisProps {
  title?: string;
  description?: string;
}

export default function MedicalSurveyAnalysis({ title = "Análisis de Encuestas Médicas", description = "Visualización y análisis de datos de encuestas de pacientes" }: MedicalSurveyAnalysisProps) {
  const { patients } = useAppContext();
  const [activeTab, setActiveTab] = useState("dashboard")
  const [filtroFecha, setFiltroFecha] = useState("ultimo-mes")
  const [filtroDiagnostico, setFiltroDiagnostico] = useState("todos")
  const [filtroEdad, setFiltroEdad] = useState("todos")
  const [filtroSeveridad, setFiltroSeveridad] = useState("todas")
  const [searchTerm, setSearchTerm] = useState("")

  // Función para formatear porcentajes
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
  }

  // Función para obtener clase de color según sentimiento
  const getSentimentClass = (sentimiento: string) => {
    switch (sentimiento) {
      case "positivo":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
      case "negativo":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
    }
  }
  
  // Procesamiento de datos para análisis
  const metricas = useMemo(() => {
    // Tratamos a los pacientes como si tuvieran los campos de la encuesta
    const pacientesConSurvey = patients as unknown as PatientWithSurvey[];
    
    // Filtrar pacientes con encuestas completadas
    const pacientesConEncuesta = pacientesConSurvey.filter(p => p.encuesta === true);
    
    // Aplicar filtros de fecha si es necesario
    let pacientesFiltrados = [...pacientesConEncuesta];
    
    if (filtroFecha !== "todo") {
      const hoy = new Date();
      let fechaLimite = new Date();
      
      switch (filtroFecha) {
        case "ultima-semana":
          fechaLimite.setDate(hoy.getDate() - 7);
          break;
        case "ultimo-mes":
          fechaLimite.setMonth(hoy.getMonth() - 1);
          break;
        case "ultimo-trimestre":
          fechaLimite.setMonth(hoy.getMonth() - 3);
          break;
        case "ultimo-año":
          fechaLimite.setFullYear(hoy.getFullYear() - 1);
          break;
      }
      
      pacientesFiltrados = pacientesFiltrados.filter(p => {
        // Usar fechaActualizacion si no hay fechaEncuesta
        const fechaAConsiderar = p.fechaEncuesta || p.fechaActualizacion || new Date().toISOString();
        const fechaPaciente = new Date(fechaAConsiderar);
        return fechaPaciente >= fechaLimite;
      });
    }
    
    // Aplicar filtro de diagnóstico
    if (filtroDiagnostico !== "todos") {
      pacientesFiltrados = pacientesFiltrados.filter(p => {
        const diagnosticoNormalizado = p.diagnostico?.toLowerCase().replace(/\s+/g, "-");
        return diagnosticoNormalizado === filtroDiagnostico;
      });
    }
    
    // Aplicar filtro de edad
    if (filtroEdad !== "todos") {
      pacientesFiltrados = pacientesFiltrados.filter(p => {
        const edad = p.edad || 0;
        switch (filtroEdad) {
          case "18-30": return edad >= 18 && edad <= 30;
          case "31-45": return edad >= 31 && edad <= 45;
          case "46-60": return edad >= 46 && edad <= 60;
          case "60+": return edad > 60;
          default: return true;
        }
      });
    }
    
    // Aplicar filtro de severidad
    if (filtroSeveridad !== "todas") {
      pacientesFiltrados = pacientesFiltrados.filter(p => {
        return p.severidadSintomasActuales === filtroSeveridad;
      });
    }
    
    // Obtener datos para las visualizaciones
    const totalEncuestas = pacientesFiltrados.length;
    
    // Completadas/incompletas (asumimos que toda encuesta registrada está completa por ahora)
    const completadas = totalEncuestas;
    const incompletas = 0;
    
    // Calcular tasa de conversión (simulada o basada en estado real si existe)
    // Asumimos un 60% de tasa de conversión para simulación
    const tasaConversion = 0.6;
    
    // Agrupar por diagnóstico
    const diagnosticos = agruparDatos(pacientesFiltrados, 'diagnostico')
      .map(item => ({
        name: item.name || "Sin diagnóstico",
        value: item.value
      }));
      
    // Valores promedios simulados para las preocupaciones en escala 1-5
    // Estos serían reemplazados por datos reales cuando estén disponibles
    const preocupacionesData = [
      { name: "Costo total", value: 4.2 },
      { name: "Manejo del dolor", value: 3.8 },
      { name: "Riesgos/complicaciones", value: 4.5 },
      { name: "Anestesia", value: 3.7 },
      { name: "Tiempo recuperación", value: 4.3 },
      { name: "Faltar al trabajo", value: 4.1 },
      { name: "No apoyo en casa", value: 3.2 },
      { name: "No seguro mejor opción", value: 3.9 },
    ];
    
    // Datos simulados para distribución de tiempo de síntomas
    const distribucionTiempoSintomas = [
      { name: "Menos de 2 semanas", value: Math.floor(totalEncuestas * 0.2) },
      { name: "2-4 semanas", value: Math.floor(totalEncuestas * 0.3) },
      { name: "1-6 meses", value: Math.floor(totalEncuestas * 0.4) },
      { name: "Más de 6 meses", value: Math.floor(totalEncuestas * 0.1) },
    ];
    
    // Datos simulados para distribución de severidad
    const distribucionSeveridad = [
      { name: "Leve", value: Math.floor(totalEncuestas * 0.3) },
      { name: "Moderada", value: Math.floor(totalEncuestas * 0.5) },
      { name: "Severa", value: Math.floor(totalEncuestas * 0.2) },
    ];
    
    // Datos simulados para expectativas principales
    const distribucionExpectativas = [
      { name: "Eliminar dolor/síntomas", value: Math.floor(totalEncuestas * 0.4) },
      { name: "Volver a actividades normales", value: Math.floor(totalEncuestas * 0.3) },
      { name: "Prevenir problemas futuros", value: Math.floor(totalEncuestas * 0.2) },
      { name: "Recuperación rápida con mínimas molestias", value: Math.floor(totalEncuestas * 0.1) },
    ];
    
    // Intensidad promedio del dolor (simulada)
    const intensidadDolorPromedio = 7.2;
    
    // Datos simulados para afectación de actividades diarias
    const distribucionAfectacion = [
      { name: "Ninguna", value: Math.floor(totalEncuestas * 0.1) },
      { name: "Un poco", value: Math.floor(totalEncuestas * 0.3) },
      { name: "Moderadamente", value: Math.floor(totalEncuestas * 0.4) },
      { name: "Mucho", value: Math.floor(totalEncuestas * 0.2) },
    ];
    
    // Crear datos para radar chart de preocupaciones
    const datosRadarPreocupaciones = preocupacionesData.map(item => ({
      preocupacion: item.name,
      valor: item.value
    }));
    
    // Pacientes prioritarios (simulado con datos reales de pacientes)
    const pacientesPrioritarios = pacientesFiltrados
      .slice(0, Math.min(10, pacientesFiltrados.length))
      .map((p, index) => ({
        id: p.id,
        nombre: `${p.nombre} ${p.apellidos || ''}`,
        edad: p.edad || 0,
        diagnostico: p.diagnostico || 'Sin diagnóstico',
        // Simulamos una probabilidad decreciente para ordenar por prioridad
        probabilidad: 0.95 - (index * 0.03),
        telefono: p.telefono || 'No disponible',
        ultimoContacto: p.fechaActualizacion || new Date().toISOString()
      }));
    
    // Comentarios simulados (podrían reemplazarse con datos reales de mayorPreocupacionCirugia, etc.)
    const comentariosEjemplo = [
      "Me preocupa el costo total del procedimiento y si mi seguro lo cubrirá.",
      "Tengo miedo al dolor post-operatorio.",
      "Necesito recuperarme rápido para volver al trabajo.",
      "Espero que esta operación mejore mi calidad de vida.",
      "No sé si este es el mejor momento para operarme."
    ];
    
    const sentimientosEjemplo = ["neutral", "negativo", "negativo", "positivo", "neutral"];
    
    const comentariosRecientes = pacientesFiltrados
      .slice(0, Math.min(8, pacientesFiltrados.length))
      .map((p, index) => ({
        id: p.id,
        paciente: `${p.nombre} ${p.apellidos || ''}`,
        comentario: comentariosEjemplo[index % comentariosEjemplo.length],
        sentimiento: sentimientosEjemplo[index % sentimientosEjemplo.length],
        fecha: p.fechaActualizacion || new Date().toISOString()
      }));
    
    // Crear datos para tendencia mensual (simulados)
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mesActual = new Date().getMonth();
    
    const tendenciaMensual = meses
      .slice(Math.max(0, mesActual - 5), mesActual + 1)
      .map((mes, index) => {
        // Simulación básica de tendencia creciente
        const base = 5 + index * 3;
        const variacion = Math.floor(Math.random() * 5);
        const encuestas = base + variacion;
        const conversiones = Math.floor(encuestas * (0.5 + Math.random() * 0.3));
        
        return { mes, encuestas, conversiones };
      });
    
    // Retornar todos los datos procesados
    return {
      totalEncuestas,
      completadas,
      incompletas,
      tasaConversion,
      diagnosticos,
      preocupaciones: preocupacionesData,
      tendenciaMensual,
      pacientesPrioritarios,
      comentariosRecientes,
      distribucionTiempoSintomas,
      distribucionSeveridad,
      distribucionExpectativas,
      intensidadDolorPromedio,
      distribucionAfectacion,
      datosRadarPreocupaciones
    };
  }, [patients, filtroFecha, filtroDiagnostico, filtroEdad, filtroSeveridad]);
  
  // Función exportada para descargar datos como CSV (comentada hasta resolver dependencias)
  /*
  const exportarDatos = () => {
    try {
      // Crear un array con los datos de pacientes
      const headers = [
        'ID', 'Nombre', 'Apellidos', 'Edad', 'Diagnóstico', 'Probabilidad Cirugía',
        'Severidad Síntomas', 'Intensidad Dolor', 'Tiempo Evolución', 'Expectativa Principal'
      ];
      
      const pacientesConSurvey = patients as unknown as PatientWithSurvey[];
      const filasPacientes = pacientesConSurvey
        .filter(p => p.encuesta === true)
        .map(p => [
          p.id,
          p.nombre,
          p.apellidos || '',
          p.edad || '',
          p.diagnostico || '',
          p.probabilidadCirugia ? (p.probabilidadCirugia * 100).toFixed(1) + '%' : '',
          p.severidadSintomasActuales ? severidadSintomasMap[p.severidadSintomasActuales as keyof typeof severidadSintomasMap] : '',
          p.intensidadDolorActual || '',
          p.desdeCuandoSintomaPrincipal ? desdeCuandoSintomaPrincipalMap[p.desdeCuandoSintomaPrincipal as keyof typeof desdeCuandoSintomaPrincipalMap] : '',
          p.expectativaPrincipalTratamiento ? expectativaPrincipalMap[p.expectativaPrincipalTratamiento as keyof typeof expectativaPrincipalMap] : ''
        ]);
      
      // Crear contenido CSV
      let csvContent = headers.join(',') + '\n';
      filasPacientes.forEach(fila => {
        // Asegurar que las celdas con comas estén entre comillas
        const filaFormateada = fila.map(celda => {
          const celdaStr = String(celda);
          return celdaStr.includes(',') ? `"${celdaStr}"` : celdaStr;
        });
        csvContent += filaFormateada.join(',') + '\n';
      });
      
      // Crear blob y descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fecha = new Date().toISOString().split('T')[0];
      saveAs(blob, `analisis-encuestas-${fecha}.csv`);
    } catch (error) {
      console.error('Error al exportar datos:', error);
      alert('Hubo un error al exportar los datos. Por favor, inténtelo de nuevo.');
    }
  };
  */
  
  // Extendemos el tipo PatientData para incluir los campos de la encuesta
  type PatientWithSurvey = {
    id: number;
    nombre: string;
    apellidos?: string;
    edad?: number;
    telefono?: string;
    email?: string;
    diagnostico?: string;
    encuesta?: boolean; // Indica si tiene encuesta
    probabilidadCirugia?: number;
    fechaCreacion?: string;
    fechaActualizacion?: string;
    estado?: string;
    // Campos de la encuesta
    encuestaCompletada?: boolean;
    decidioOperarse?: boolean;
    fechaEncuesta?: string;
    comoNosConocio?: string;
    motivoVisita?: string;
    diagnosticoPrevio?: boolean;
    seguroMedico?: string;
    aseguradoraSeleccionada?: string;
    descripcionSintomaPrincipal?: string;
    sintomasAdicionales?: string[];
    desdeCuandoSintomaPrincipal?: string;
    severidadSintomasActuales?: string;
    intensidadDolorActual?: number;
    afectacionActividadesDiarias?: string;
    condicionesMedicasCronicas?: string[];
    aspectosMasImportantes?: string[];
    preocupacionCostoTotal?: number;
    preocupacionManejoDolor?: number;
    preocupacionRiesgosComplicaciones?: number;
    preocupacionAnestesia?: number;
    preocupacionTiempoRecuperacion?: number;
    preocupacionFaltarTrabajo?: number;
    preocupacionNoApoyoCasa?: number;
    preocupacionNoSeguroMejorOpcion?: number;
    mayorPreocupacionCirugia?: string;
    plazoResolucionIdeal?: string;
    tiempoTomaDecision?: string;
    expectativaPrincipalTratamiento?: string;
    informacionAdicionalImportante?: string;
    mayorBeneficioEsperado?: string;
  };

  // Simular datos para desarrollo hasta que tengamos datos reales
  const mockData = {
    totalEncuestas: 10,
    completadas: 8,
    incompletas: 2,
    tasaConversion: 0.6,
    diagnosticos: [
      { name: "Hernia Inguinal", value: 5 },
      { name: "Vesícula", value: 3 },
      { name: "Hernia Umbilical", value: 2 },
    ],
    preocupaciones: [
      { name: "Costo total", value: 4.2 },
      { name: "Manejo del dolor", value: 3.8 },
      { name: "Riesgos/complicaciones", value: 4.5 },
      { name: "Anestesia", value: 3.7 },
      { name: "Tiempo recuperación", value: 4.3 },
      { name: "Faltar al trabajo", value: 4.1 },
      { name: "No apoyo en casa", value: 3.2 },
      { name: "No seguro mejor opción", value: 3.9 },
    ],
    tendenciaMensual: [
      { mes: "Ene", encuestas: 8, conversiones: 5 },
      { mes: "Feb", encuestas: 12, conversiones: 7 },
      { mes: "Mar", encuestas: 15, conversiones: 9 },
      { mes: "Abr", encuestas: 18, conversiones: 11 },
      { mes: "May", encuestas: 22, conversiones: 14 },
      { mes: "Jun", encuestas: 25, conversiones: 16 },
    ],
    pacientesPrioritarios: [
      {
        id: 1,
        nombre: "Ana García",
        edad: 45,
        diagnostico: "Hernia Inguinal",
        probabilidad: 0.92,
        telefono: "555-1234",
        ultimoContacto: "2023-06-10",
      },
      {
        id: 2,
        nombre: "Carlos Pérez",
        edad: 52,
        diagnostico: "Vesícula",
        probabilidad: 0.88,
        telefono: "555-5678",
        ultimoContacto: "2023-06-12",
      },
    ],
    comentariosRecientes: [
      {
        id: 1,
        paciente: "Roberto Díaz",
        comentario: "Excelente atención, muy profesionales y claros con la información.",
        sentimiento: "positivo",
        fecha: "2023-06-22",
      },
      {
        id: 2,
        paciente: "Sofía López",
        comentario: "Tengo dudas sobre el costo total del procedimiento.",
        sentimiento: "neutral",
        fecha: "2023-06-21",
      },
    ],
    distribucionTiempoSintomas: [
      { name: "Menos de 2 semanas", value: 2 },
      { name: "2-4 semanas", value: 3 },
      { name: "1-6 meses", value: 4 },
      { name: "Más de 6 meses", value: 1 },
    ],
    distribucionSeveridad: [
      { name: "Leve", value: 3 },
      { name: "Moderada", value: 5 },
      { name: "Severa", value: 2 },
    ],
    distribucionExpectativas: [
      { name: "Eliminar dolor/síntomas", value: 4 },
      { name: "Volver a actividades normales", value: 3 },
      { name: "Prevenir problemas futuros", value: 2 },
      { name: "Recuperación rápida con mínimas molestias", value: 1 },
    ],
    intensidadDolorPromedio: 7.2,
    distribucionAfectacion: [
      { name: "Ninguna", value: 1 },
      { name: "Un poco", value: 3 },
      { name: "Moderadamente", value: 4 },
      { name: "Mucho", value: 2 },
    ],
    datosRadarPreocupaciones: [
      { preocupacion: "Costo total", valor: 4.2 },
      { preocupacion: "Manejo del dolor", valor: 3.8 },
      { preocupacion: "Riesgos/complicaciones", valor: 4.5 },
      { preocupacion: "Anestesia", valor: 3.7 },
      { preocupacion: "Tiempo recuperación", valor: 4.3 },
      { preocupacion: "Faltar al trabajo", valor: 4.1 },
      { preocupacion: "No apoyo en casa", valor: 3.2 },
      { preocupacion: "No seguro mejor opción", valor: 3.9 },
    ],
  };

  // Usar datos reales o simulados para desarrollo
  const data = metricas.totalEncuestas > 0 ? metricas : fallbackData;

  // Función para exportar datos como CSV simplificada (sin saveAs)
  const exportarDatos = () => {
    try {
      alert('Función de exportación implementada, pero requiere la instalación de la biblioteca file-saver.');
      // En un entorno real, aquí iría la lógica para exportar datos
    } catch (error) {
      console.error('Error al exportar datos:', error);
      alert('Hubo un error al exportar los datos. Por favor, inténtelo de nuevo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado con filtros */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-x-2 md:space-y-0">
          <Select value={filtroFecha} onValueChange={setFiltroFecha}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ultima-semana">Última semana</SelectItem>
              <SelectItem value="ultimo-mes">Último mes</SelectItem>
              <SelectItem value="ultimo-trimestre">Último trimestre</SelectItem>
              <SelectItem value="ultimo-año">Último año</SelectItem>
              <SelectItem value="todo">Todo el tiempo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroDiagnostico} onValueChange={setFiltroDiagnostico}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Diagnóstico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los diagnósticos</SelectItem>
              <SelectItem value="hernia-inguinal">Hernia Inguinal</SelectItem>
              <SelectItem value="vesicula">Vesícula</SelectItem>
              <SelectItem value="hernia-umbilical">Hernia Umbilical</SelectItem>
              <SelectItem value="hernia-hiatal">Hernia Hiatal</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            <span>Exportar</span>
          </Button>
        </div>
      </div>

      {/* Navegación principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-auto">
          <TabsList className="inline-flex w-full md:w-auto">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="pacientes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Pacientes Prioritarios</span>
            </TabsTrigger>
            <TabsTrigger value="tendencias" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Tendencias</span>
            </TabsTrigger>
            <TabsTrigger value="comentarios" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Comentarios</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard principal */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* Tarjetas de métricas */}
          <div className={gridLayouts.dashboard}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Encuestas</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalEncuestas}</div>
                <p className="text-xs text-muted-foreground">
                  Pacientes que han completado la encuesta digital
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercent(data.tasaConversion)}</div>
                <p className="text-xs text-muted-foreground">Pacientes que deciden operarse</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Intensidad de Dolor</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.intensidadDolorPromedio?.toFixed(1) || 0}/10</div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-amber-500"
                    style={{ width: `${(data.intensidadDolorPromedio || 0) * 10}%` }}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Probabilidad Cirugía</CardTitle>
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.tasaConversion > 0 ? formatPercent(data.tasaConversion) : "0%"}</div>
                <Progress className="mt-2" value={data.tasaConversion * 100} />
              </CardContent>
            </Card>
          </div>

          {/* Gráficos principales */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Diagnóstico</CardTitle>
                <CardDescription>Encuestas agrupadas por diagnóstico médico</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[300px]", "h-[350px]", "h-[400px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.diagnosticos}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.diagnosticos.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} encuestas`, "Cantidad"]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nivel de Preocupaciones</CardTitle>
                <CardDescription>Preocupaciones valoradas en escala 1-5</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[300px]", "h-[350px]", "h-[400px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius={90} width={500} height={250} data={data.datosRadarPreocupaciones}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="preocupacion" />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} />
                      <Radar name="Valor promedio" dataKey="valor" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Segunda fila de gráficos */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tiempo de Evolución de Síntomas</CardTitle>
                <CardDescription>Desde cuándo presentan los síntomas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[300px]", "h-[350px]", "h-[400px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.distribucionTiempoSintomas}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.distribucionTiempoSintomas?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} pacientes`, "Cantidad"]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Severidad de Síntomas</CardTitle>
                <CardDescription>Distribución por nivel de severidad</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[300px]", "h-[350px]", "h-[400px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.distribucionSeveridad}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value) => [`${value} pacientes`, "Cantidad"]} />
                      <Bar dataKey="value" fill="#8884d8">
                        {data.distribucionSeveridad?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? "#00C49F" : index === 1 ? "#FFBB28" : "#FF8042"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tercera fila de gráficos */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Expectativas Principales</CardTitle>
                <CardDescription>Qué esperan los pacientes del tratamiento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[300px]", "h-[350px]", "h-[400px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.distribucionExpectativas}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip formatter={(value) => [`${value} pacientes`, "Cantidad"]} />
                      <Bar dataKey="value" fill="#8884d8">
                        {data.distribucionExpectativas?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Afectación Actividades Diarias</CardTitle>
                <CardDescription>Cómo afectan los síntomas la vida diaria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[300px]", "h-[350px]", "h-[400px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.distribucionAfectacion}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.distribucionAfectacion?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} pacientes`, "Cantidad"]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pacientes prioritarios (versión resumida) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pacientes Prioritarios</CardTitle>
                <CardDescription>Pacientes con alta probabilidad de conversión</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("pacientes")}>
                Ver todos
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.pacientesPrioritarios?.slice(0, 3).map((paciente: any) => (
                  <div key={paciente.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{paciente.nombre}</div>
                      <div className="text-sm text-muted-foreground">
                        {paciente.edad} años | {paciente.diagnostico}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400">
                        {formatPercent(paciente.probabilidad)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Último contacto: {formatDate(paciente.ultimoContacto)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pacientes prioritarios (vista completa) */}
        <TabsContent value="pacientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pacientes Prioritarios</CardTitle>
              <CardDescription>Pacientes con alta probabilidad de conversión a cirugía</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar pacientes..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="probabilidad">
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SortAsc className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="probabilidad">Mayor probabilidad</SelectItem>
                      <SelectItem value="reciente">Contacto más reciente</SelectItem>
                      <SelectItem value="nombre">Nombre</SelectItem>
                      <SelectItem value="edad">Edad</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    <span className="hidden md:inline">Exportar</span>
                  </Button>
                </div>
              </div>

              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Paciente</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Diagnóstico</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Probabilidad</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Teléfono</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Último Contacto</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fallbackData.pacientesPrioritarios.map((paciente, index) => (
                        <tr key={paciente.id} className={index % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="font-medium">{paciente.nombre}</div>
                            <div className="text-xs text-muted-foreground">{paciente.edad} años</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">{paciente.diagnostico}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400">
                              {formatPercent(paciente.probabilidad)}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">{paciente.telefono}</td>
                          <td className="whitespace-nowrap px-4 py-3">{formatDate(paciente.ultimoContacto)}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Button variant="outline" size="sm">
                              Contactar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tendencias */}
        <TabsContent value="tendencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendencias Mensuales</CardTitle>
              <CardDescription>Evolución de encuestas y conversiones a lo largo del tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={responsiveHeight("h-[300px]", "h-[400px]", "h-[500px]")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fallbackData.tendenciaMensual} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="encuestas" fill="#8884d8" name="Total Encuestas" />
                    <Bar dataKey="conversiones" fill="#82ca9d" name="Conversiones" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tasa de Conversión Mensual</CardTitle>
                <CardDescription>Porcentaje de pacientes que deciden operarse</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[300px]", "h-[350px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={fallbackData.tendenciaMensual.map((item) => ({
                        ...item,
                        tasa: parseFloat(((item.conversiones / item.encuestas) * 100).toFixed(1)),
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis unit="%" />
                      <Tooltip formatter={(value) => [`${value}%`, "Tasa de Conversión"]} />
                      <Bar dataKey="tasa" fill="#FFC107" name="Tasa de Conversión" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tiempo Promedio de Decisión</CardTitle>
                <CardDescription>Días desde la encuesta hasta la decisión de cirugía</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[300px]", "h-[350px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { mes: "Ene", dias: 15 },
                        { mes: "Feb", dias: 14 },
                        { mes: "Mar", dias: 12 },
                        { mes: "Abr", dias: 13 },
                        { mes: "May", dias: 10 },
                        { mes: "Jun", dias: 9 },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis unit=" días" />
                      <Tooltip formatter={(value) => [`${value} días`, "Tiempo Promedio"]} />
                      <Bar dataKey="dias" fill="#FF8042" name="Días Promedio" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comentarios */}
        <TabsContent value="comentarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comentarios de Pacientes</CardTitle>
              <CardDescription>Feedback y comentarios de los pacientes en las encuestas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar comentarios..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="reciente">
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SortAsc className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reciente">Más recientes</SelectItem>
                      <SelectItem value="positivo">Sentimiento positivo</SelectItem>
                      <SelectItem value="negativo">Sentimiento negativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ScrollArea className={responsiveHeight("h-[400px]", "h-[500px]", "h-[600px]")}>
                <div className="space-y-4 pr-4">
                  {fallbackData.comentariosRecientes.map((comentario) => (
                    <div key={comentario.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{comentario.paciente}</div>
                          <div className="text-xs text-muted-foreground mb-2">{formatDate(comentario.fecha)}</div>
                        </div>
                        <Badge variant="outline" className={getSentimentClass(comentario.sentimiento)}>
                          {comentario.sentimiento.charAt(0).toUpperCase() + comentario.sentimiento.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm">{comentario.comentario}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Sentimiento</CardTitle>
                <CardDescription>Distribución de comentarios por sentimiento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[200px]", "h-[250px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Positivo", value: 65 },
                          { name: "Neutral", value: 20 },
                          { name: "Negativo", value: 15 },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#00C49F" />
                        <Cell fill="#FFBB28" />
                        <Cell fill="#FF8042" />
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, "Porcentaje"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Temas Principales</CardTitle>
                <CardDescription>Temas más mencionados en los comentarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[200px]", "h-[250px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={[
                        { tema: "Atención médica", menciones: 45 },
                        { tema: "Tiempo de espera", menciones: 32 },
                        { tema: "Información recibida", menciones: 28 },
                        { tema: "Instalaciones", menciones: 20 },
                        { tema: "Costo", menciones: 18 },
                      ]}
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="tema" type="category" width={100} />
                      <Tooltip formatter={(value) => [`${value} menciones`, "Cantidad"]} />
                      <Bar dataKey="menciones" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
