"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, LineChart, Line,
} from "recharts";
import {
  Download, Filter, Search, Calendar as CalendarIcon, TrendingUp, Users,
  FileText, BarChart3, Activity, AlertTriangle, CheckCircle2, MessageSquare, ListChecks, HelpCircle
} from "lucide-react";
import { usePatientStore } from "@/lib/stores/patient-store"; // Importación directa del store
import type { 
  PatientWithSurveyData, ChartDataItem, RadarPoint, TrendPoint, 
  PriorityPatientDisplay, CommentDisplay, ProcessedDashboardData 
} from "@/lib/survey-types"; // Ajusta la ruta

// --- MAPEOS (Asegúrate que estén en un archivo separado y se importen) ---
// Estos son cruciales para traducir los códigos de la encuesta a etiquetas legibles
const comoNosConocioMap: Record<string, string> = { /* ... tu map ... */ };
const motivoVisitaMap: Record<string, string> = { /* ... tu map ... */ };
const seguroMedicoMap: Record<string, string> = { /* ... tu map ... */ };
const desdeCuandoSintomaPrincipalMap: Record<string, string> = { /* ... tu map ... */ };
const severidadSintomasMap: Record<string, string> = { /* ... tu map ... */ };
const afectacionActividadesMap: Record<string, string> = { /* ... tu map ... */ };
const plazoResolucionMap: Record<string, string> = { /* ... tu map ... */ };
const tiempoTomaDecisionMap: Record<string, string> = { /* ... tu map ... */ };
const expectativaPrincipalMap: Record<string, string> = { /* ... tu map ... */ };
// --- FIN MAPEOS ---

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF6E4A"];
const SENTIMENT_COLORS: Record<string, string> = {
  positivo: "#22c55e", // green-500
  negativo: "#ef4444", // red-500
  neutral: "#3b82f6",  // blue-500
};

// --- FUNCIONES DE UTILIDAD (Idealmente en un archivo utils.ts) ---
const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return "Fecha inválida";
  }
};

const formatPercent = (value?: number, decimals = 0): string => {
  if (value === undefined || value === null || isNaN(value)) return "0%";
  return `${(value * 100).toFixed(decimals)}%`;
};

const getSentimentClass = (sentimiento?: string): string => {
  if (!sentimiento) return "bg-gray-100 text-gray-800";
  switch (sentimiento.toLowerCase()) {
    case "positivo": return "bg-green-100 text-green-700";
    case "negativo": return "bg-red-100 text-red-700";
    default: return "bg-blue-100 text-blue-700";
  }
};

const aggregateData = (
  surveys: PatientWithSurveyData[], 
  key: keyof PatientWithSurveyData, 
  map?: Record<string, string>
): ChartDataItem[] => {
  const counts: Record<string, number> = {};
  surveys.forEach(survey => {
    const value = survey[key] as string | undefined;
    if (value) {
      const name = map && map[value] ? map[value] : value;
      counts[name] = (counts[name] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a,b) => b.value - a.value); // Ordenar por popularidad
};

const calculateAverage = (surveys: PatientWithSurveyData[], key: keyof PatientWithSurveyData): number | undefined => {
  const values = surveys
    .map(s => s[key] as number | undefined)
    .filter(v => typeof v === 'number' && !isNaN(v)) as number[];
  if (values.length === 0) return undefined;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
};
// --- FIN FUNCIONES DE UTILIDAD ---


export interface MedicalSurveyAnalysisProps {
  title?: string;
  description?: string;
  // Opcional: pasar datos de pacientes externamente si no se usa el contexto global
  // externalPatientsData?: PatientWithSurveyData[]; 
}

export default function MedicalSurveyAnalysis({
  title = "Análisis de Encuestas Médicas",
  description = "Visualización y análisis de datos de encuestas de pacientes",
  // externalPatientsData
}: MedicalSurveyAnalysisProps) {
  const { patients: patientsFromContext } = usePatientStore();
  // const surveyDataSource = externalPatientsData || patientsFromContext || [];
  // Para este ejemplo, asumimos que patientsFromContext es PatientWithSurveyData[]
  const surveyDataSource: PatientWithSurveyData[] = (patientsFromContext || []) as PatientWithSurveyData[];

  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterDate, setFilterDate] = useState("ultimo-mes");
  const [filterDiagnosis, setFilterDiagnosis] = useState("todos");
  const [filterAge, setFilterAge] = useState("todos");
  const [filterSeverity, setFilterSeverity] = useState("todas");
  const [searchTermPatients, setSearchTermPatients] = useState("");
  const [searchTermComments, setSearchTermComments] = useState("");

  const filteredSurveys = useMemo(() => {
    let surveys = surveyDataSource.filter(p => p.encuestaCompletada === true);

    // Filtro de Fecha
    if (filterDate !== "todo") {
      const now = new Date();
      let startDate = new Date();
      if (filterDate === "ultima-semana") startDate.setDate(now.getDate() - 7);
      else if (filterDate === "ultimo-mes") startDate.setMonth(now.getMonth() - 1);
      else if (filterDate === "ultimo-trimestre") startDate.setMonth(now.getMonth() - 3);
      else if (filterDate === "ultimo-anio") startDate.setFullYear(now.getFullYear() - 1);
      
      surveys = surveys.filter(s => {
        const surveyDateStr = s.fechaEncuesta || s.fechaActualizacion;
        if (!surveyDateStr) return false;
        try {
          return new Date(surveyDateStr) >= startDate;
        } catch { return false; }
      });
    }

    // Filtro de Diagnóstico (asume que s.diagnostico es una string normalizada o mapeable)
    if (filterDiagnosis !== "todos") {
      surveys = surveys.filter(s => s.diagnostico?.toLowerCase().replace(/\s+/g, "-") === filterDiagnosis);
    }
    
    // Filtro de Edad
    if (filterAge !== "todos" && surveys.length > 0 && typeof surveys[0].edad === 'number') {
        surveys = surveys.filter(s => {
            if (typeof s.edad !== 'number') return false;
            if (filterAge === "18-30") return s.edad >= 18 && s.edad <= 30;
            if (filterAge === "31-45") return s.edad >= 31 && s.edad <= 45;
            if (filterAge === "46-60") return s.edad >= 46 && s.edad <= 60;
            if (filterAge === "60+") return s.edad > 60;
            return true;
        });
    }

    // Filtro de Severidad
    if (filterSeverity !== "todas") {
      surveys = surveys.filter(s => s.severidadSintomasActuales === filterSeverity);
    }
    return surveys;
  }, [surveyDataSource, filterDate, filterDiagnosis, filterAge, filterSeverity]);

  const processedData = useMemo((): ProcessedDashboardData | null => {
    if (filteredSurveys.length === 0) return null;

    const totalSurveys = filteredSurveys.length;
    const decidedToOperate = filteredSurveys.filter(s => s.decidioOperarse === true).length;
    const conversionRate = totalSurveys > 0 ? decidedToOperate / totalSurveys : 0;
    const averagePainIntensity = calculateAverage(filteredSurveys, 'intensidadDolorActual');

    // Datos para gráficos
    const diagnosisDistribution = aggregateData(filteredSurveys, 'diagnostico');
    const symptomDurationDistribution = aggregateData(filteredSurveys, 'desdeCuandoSintomaPrincipal', desdeCuandoSintomaPrincipalMap);
    const symptomSeverityDistribution = aggregateData(filteredSurveys, 'severidadSintomasActuales', severidadSintomasMap);
    const mainExpectationsDistribution = aggregateData(filteredSurveys, 'expectativaPrincipalTratamiento', expectativaPrincipalMap);
    const dailyActivityImpactDistribution = aggregateData(filteredSurveys, 'afectacionActividadesDiarias', afectacionActividadesMap);
    const comoNosConocioDistribution = aggregateData(filteredSurveys, 'comoNosConocio', comoNosConocioMap);
    const motivoVisitaDistribution = aggregateData(filteredSurveys, 'motivoVisita', motivoVisitaMap);
    const seguroMedicoDistribution = aggregateData(filteredSurveys, 'seguroMedico', seguroMedicoMap);
    const plazoResolucionDistribution = aggregateData(filteredSurveys, 'plazoResolucionIdeal', plazoResolucionMap);
    const tiempoDecisionDistribution = aggregateData(filteredSurveys, 'tiempoTomaDecision', tiempoTomaDecisionMap);
    
    // Preocupaciones para Radar Chart (promedios)
    const concernKeys: (keyof PatientWithSurveyData)[] = [
        'preocupacionCostoTotal', 'preocupacionManejoDolor', 'preocupacionRiesgosComplicaciones',
        'preocupacionAnestesia', 'preocupacionTiempoRecuperacion', 'preocupacionFaltarTrabajo',
        'preocupacionNoApoyoCasa', 'preocupacionNoSeguroMejorOpcion'
    ];
    const concernLabels: Record<string, string> = {
        preocupacionCostoTotal: "Costo", preocupacionManejoDolor: "Dolor", 
        preocupacionRiesgosComplicaciones: "Riesgos", preocupacionAnestesia: "Anestesia",
        preocupacionTiempoRecuperacion: "Recuperación", preocupacionFaltarTrabajo: "Trabajo",
        preocupacionNoApoyoCasa: "Apoyo", preocupacionNoSeguroMejorOpcion: "Opción"
    };
    const concernsRadarData: RadarPoint[] = concernKeys.map(key => ({
      subject: concernLabels[key] || key.toString(),
      value: calculateAverage(filteredSurveys, key) || 0,
      fullMark: 5, // Asumiendo escala 1-5
    }));

    // Pacientes prioritarios
    const priorityPatientsList: PriorityPatientDisplay[] = filteredSurveys
      .filter(s => typeof s.probabilidadCirugia === 'number')
      .sort((a, b) => (b.probabilidadCirugia || 0) - (a.probabilidadCirugia || 0))
      .slice(0, 20) // Mostrar top 20 o menos
      .map(s => ({
        id: s.id,
        nombreCompleto: `${s.nombre} ${s.apellidos || ''}`,
        edad: s.edad,
        diagnostico: s.diagnostico,
        probabilidadCirugia: s.probabilidadCirugia,
        telefono: s.telefono,
        ultimoContacto: formatDate(s.fechaEncuesta || s.fechaActualizacion),
      }));

    // Tendencias Mensuales (simplificado, necesitaría agrupar por mes real)
    const monthlyTrends: TrendPoint[] = (() => {
        const trends: Record<string, { surveys: number; conversions: number }> = {};
        filteredSurveys.forEach(s => {
            const dateStr = s.fechaEncuesta || s.fechaActualizacion;
            if (!dateStr) return;
            try {
                const monthYear = new Date(dateStr).toLocaleDateString('es-ES', { month: 'short', year: 'numeric'});
                if (!trends[monthYear]) trends[monthYear] = { surveys: 0, conversions: 0 };
                trends[monthYear].surveys++;
                if (s.decidioOperarse) trends[monthYear].conversions++;
            } catch {}
        });
        return Object.entries(trends)
            .map(([month, data]) => ({ month, ...data, conversionRate: data.surveys > 0 ? data.conversions / data.surveys : 0 }))
            .sort((a,b) => new Date(a.month).getTime() - new Date(b.month).getTime()); // Asegurar orden cronológico
    })();
    
    // Comentarios
    const recentCommentsList: CommentDisplay[] = filteredSurveys
      .filter(s => s.comentarioEncuesta)
      .map(s => ({
        id: s.id,
        pacienteNombre: `${s.nombre} ${s.apellidos || ''}`,
        fecha: formatDate(s.fechaEncuesta || s.fechaActualizacion),
        sentimiento: s.sentimientoComentario || 'neutral',
        texto: s.comentarioEncuesta || '',
      }))
      .sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) // Más recientes primero
      .slice(0, 50); // Limitar a 50 comentarios para la UI

    const sentimentCounts: Record<string, number> = {};
    recentCommentsList.forEach(c => {
        const sentiment = c.sentimiento.toLowerCase();
        sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
    });
    const sentimentDistribution: ChartDataItem[] = Object.entries(sentimentCounts)
        .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, fill: SENTIMENT_COLORS[name] || COLORS[3] }));

    // Simulación de temas principales (en una app real, esto vendría de un análisis NLP)
    const topCommentThemes: ChartDataItem[] = [
        { name: "Atención del personal", value: Math.floor(Math.random() * 20 + 5) },
        { name: "Claridad de información", value: Math.floor(Math.random() * 15 + 5) },
        { name: "Tiempo de espera", value: Math.floor(Math.random() * 10 + 3) },
        { name: "Costos", value: Math.floor(Math.random() * 8 + 2) },
        { name: "Resultados esperados", value: Math.floor(Math.random() * 12 + 4) },
    ].sort((a,b) => b.value - a.value);

    return {
      totalSurveys, conversionRate, averagePainIntensity, diagnosisDistribution,
      concernsRadarData, symptomDurationDistribution, symptomSeverityDistribution,
      mainExpectationsDistribution, dailyActivityImpactDistribution, priorityPatientsList,
      monthlyTrends, recentCommentsList, sentimentDistribution, topCommentThemes,
      comoNosConocioDistribution, motivoVisitaDistribution, seguroMedicoDistribution,
      plazoResolucionDistribution, tiempoDecisionDistribution
    };
  }, [filteredSurveys]);

  const handleExportData = useCallback(() => {
    if (!processedData || filteredSurveys.length === 0) {
      alert("No hay datos filtrados para exportar.");
      return;
    }
    // Simple CSV export
    const headers = [
      "ID", "Nombre", "Apellidos", "Edad", "Diagnóstico", "Fecha Encuesta", 
      "Decidió Operarse", "Prob. Cirugía (%)", "Dolor (0-10)", "Severidad", 
      "Tiempo Síntomas", "Expectativa", "Comentario"
    ];
    const rows = filteredSurveys.map(s => [
      s.id, s.nombre, s.apellidos, s.edad, s.diagnostico, formatDate(s.fechaEncuesta),
      s.decidioOperarse ? "Sí" : "No", formatPercent(s.probabilidadCirugia, 0), s.intensidadDolorActual,
      s.severidadSintomasActuales ? severidadSintomasMap[s.severidadSintomasActuales as keyof typeof severidadSintomasMap] : '',
      s.desdeCuandoSintomaPrincipal ? desdeCuandoSintomaPrincipalMap[s.desdeCuandoSintomaPrincipal as keyof typeof desdeCuandoSintomaPrincipalMap] : '',
      s.expectativaPrincipalTratamiento ? expectativaPrincipalMap[s.expectativaPrincipalTratamiento as keyof typeof expectativaPrincipalMap] : '',
      `"${s.comentarioEncuesta?.replace(/"/g, '""') || ""}"` // Escape quotes
    ].join(","));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analisis_encuestas_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedData, filteredSurveys]);


  // ---- RENDERIZADO ----
  if (!processedData) {
    return (
      <div className="p-6 text-center">
        <HelpCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700">No hay datos de encuestas</h3>
        <p className="text-gray-500">
          No se encontraron encuestas completadas que coincidan con los filtros seleccionados, o no hay datos disponibles.
        </p>
      </div>
    );
  }
  
  // Filtrado para la tabla de pacientes prioritarios
  const displayPriorityPatients = useMemo(() => {
    if (!processedData?.priorityPatientsList) return [];
    return processedData.priorityPatientsList.filter(p => 
      p.nombreCompleto.toLowerCase().includes(searchTermPatients.toLowerCase()) ||
      p.diagnostico?.toLowerCase().includes(searchTermPatients.toLowerCase())
    );
  }, [processedData?.priorityPatientsList, searchTermPatients]);

  // Filtrado para la lista de comentarios
  const displayComments = useMemo(() => {
    if (!processedData?.recentCommentsList) return [];
    return processedData.recentCommentsList.filter(c =>
      c.pacienteNombre.toLowerCase().includes(searchTermComments.toLowerCase()) ||
      c.texto.toLowerCase().includes(searchTermComments.toLowerCase())
    );
  }, [processedData?.recentCommentsList, searchTermComments]);


  return (
    <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
      {/* Encabezado y Filtros Globales */}
      <Card className="shadow-sm">
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-slate-800">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <Button onClick={handleExportData} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> Exportar Datos Filtrados
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select value={filterDate} onValueChange={setFilterDate}>
            <SelectTrigger><CalendarIcon className="mr-2 h-4 w-4 opacity-70" /><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ultima-semana">Última Semana</SelectItem>
              <SelectItem value="ultimo-mes">Último Mes</SelectItem>
              <SelectItem value="ultimo-trimestre">Último Trimestre</SelectItem>
              <SelectItem value="ultimo-anio">Último Año</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterDiagnosis} onValueChange={setFilterDiagnosis}>
            <SelectTrigger><Filter className="mr-2 h-4 w-4 opacity-70" /><SelectValue placeholder="Diagnóstico" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Diagnósticos</SelectItem>
              {/* Deberías popular esto dinámicamente o con tus diagnósticos comunes */}
              <SelectItem value="hernia-inguinal">Hernia Inguinal</SelectItem>
              <SelectItem value="vesicula">Vesícula</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAge} onValueChange={setFilterAge}>
            <SelectTrigger><Users className="mr-2 h-4 w-4 opacity-70" /><SelectValue placeholder="Edad" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="todos">Todas las Edades</SelectItem>
                <SelectItem value="18-30">18-30 años</SelectItem>
                <SelectItem value="31-45">31-45 años</SelectItem>
                <SelectItem value="46-60">46-60 años</SelectItem>
                <SelectItem value="60+">60+ años</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger><Activity className="mr-2 h-4 w-4 opacity-70" /><SelectValue placeholder="Severidad" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="todas">Toda Severidad</SelectItem>
                {Object.entries(severidadSintomasMap).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ScrollArea className="w-full pb-2">
            <TabsList className="inline-flex h-auto p-1">
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm"><BarChart3 className="mr-1.5 h-4 w-4" />Dashboard</TabsTrigger>
            <TabsTrigger value="pacientes" className="text-xs sm:text-sm"><Users className="mr-1.5 h-4 w-4" />Prioritarios</TabsTrigger>
            <TabsTrigger value="tendencias" className="text-xs sm:text-sm"><TrendingUp className="mr-1.5 h-4 w-4" />Tendencias</TabsTrigger>
            <TabsTrigger value="comentarios" className="text-xs sm:text-sm"><MessageSquare className="mr-1.5 h-4 w-4" />Comentarios</TabsTrigger>
            <TabsTrigger value="perfil" className="text-xs sm:text-sm"><ListChecks className="mr-1.5 h-4 w-4" />Perfil Paciente</TabsTrigger>
            </TabsList>
        </ScrollArea>

        {/* --- PESTAÑA DASHBOARD --- */}
        <TabsContent value="dashboard" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Encuestas" value={processedData.totalSurveys.toString()} icon={Users} />
            <MetricCard title="Tasa Conversión" value={formatPercent(processedData.conversionRate)} icon={TrendingUp} />
            <MetricCard title="Dolor Promedio" value={`${processedData.averagePainIntensity?.toFixed(1) || 'N/A'} / 10`} icon={Activity} />
            <MetricCard title="Prob. Cirugía (Media)" value={formatPercent(calculateAverage(filteredSurveys, 'probabilidadCirugia'))} icon={CheckCircle2} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Distribución por Diagnóstico">
                <ResponsivePieChart data={processedData.diagnosisDistribution} />
            </ChartCard>
            <ChartCard title="Nivel de Preocupaciones (Escala 1-5)">
                <ResponsiveRadarChart data={processedData.concernsRadarData} />
            </ChartCard>
            <ChartCard title="Tiempo de Evolución de Síntomas">
                 <ResponsivePieChart data={processedData.symptomDurationDistribution} />
            </ChartCard>
            <ChartCard title="Severidad de Síntomas">
                 <ResponsiveBarChart data={processedData.symptomSeverityDistribution} layout="vertical" yAxisWidth={100} />
            </ChartCard>
             <ChartCard title="Expectativas Principales del Tratamiento">
                 <ResponsiveBarChart data={processedData.mainExpectationsDistribution} layout="vertical" yAxisWidth={120}/>
            </ChartCard>
            <ChartCard title="Afectación de Actividades Diarias">
                 <ResponsivePieChart data={processedData.dailyActivityImpactDistribution} />
            </ChartCard>
          </div>
        </TabsContent>

        {/* --- PESTAÑA PACIENTES PRIORITARIOS --- */}
        <TabsContent value="pacientes" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Pacientes Prioritarios ({displayPriorityPatients.length})</CardTitle>
              <CardDescription>Pacientes con mayor probabilidad de conversión o necesidad de seguimiento.</CardDescription>
              <Input 
                placeholder="Buscar por nombre o diagnóstico..." 
                value={searchTermPatients} 
                onChange={(e) => setSearchTermPatients(e.target.value)}
                className="mt-2 max-w-sm"
                icon={<Search className="h-4 w-4 text-muted-foreground" />} 
              />
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] md:h-[calc(100vh-300px)]"> {/* Ajusta altura para scroll */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead className="hidden sm:table-cell">Diagnóstico</TableHead>
                      <TableHead>Prob. Cirugía</TableHead>
                      <TableHead className="hidden md:table-cell">Últ. Contacto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayPriorityPatients.length > 0 ? displayPriorityPatients.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.nombreCompleto}</div>
                          <div className="text-xs text-muted-foreground">{p.edad ? `${p.edad} años` : ''}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{p.diagnostico || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={ (p.probabilidadCirugia || 0) > 0.7 ? "default" : "secondary"}
                                 className={(p.probabilidadCirugia || 0) > 0.7 ? "bg-green-500 hover:bg-green-600 text-white" : ""}>
                            {formatPercent(p.probabilidadCirugia)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{p.ultimoContacto}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center py-8">No se encontraron pacientes prioritarios.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- PESTAÑA TENDENCIAS --- */}
        <TabsContent value="tendencias" className="mt-4 space-y-6">
            <ChartCard title="Tendencia Mensual de Encuestas y Conversiones">
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={processedData.monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" label={{ value: 'Cantidad', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" unit="%" label={{ value: 'Tasa Conv.', angle: 90, position: 'insideRight' }} />
                        <Tooltip formatter={(value, name) => name === 'conversionRate' ? formatPercent(value as number) : value} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="surveys" name="Encuestas" stroke={COLORS[0]} strokeWidth={2} />
                        <Line yAxisId="left" type="monotone" dataKey="conversions" name="Conversiones" stroke={COLORS[1]} strokeWidth={2} />
                        <Line yAxisId="right" type="monotone" dataKey="conversionRate" name="Tasa Conversión" stroke={COLORS[2]} strokeDasharray="5 5" />
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>
            {/* Aquí podrías añadir más gráficos de tendencias si los tienes */}
        </TabsContent>

        {/* --- PESTAÑA COMENTARIOS --- */}
        <TabsContent value="comentarios" className="mt-4 space-y-6">
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Comentarios de Pacientes ({displayComments.length})</CardTitle>
                    <CardDescription>Feedback cualitativo de las encuestas.</CardDescription>
                    <Input 
                        placeholder="Buscar en comentarios..." 
                        value={searchTermComments} 
                        onChange={(e) => setSearchTermComments(e.target.value)}
                        className="mt-2 max-w-sm"
                        icon={<Search className="h-4 w-4 text-muted-foreground" />} 
                    />
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh] md:h-[calc(100vh-380px)] pr-3"> {/* Ajusta altura */}
                        {displayComments.length > 0 ? displayComments.map(c => (
                            <div key={c.id} className="mb-4 p-3 border rounded-md bg-white">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-sm text-slate-700">{c.pacienteNombre}</span>
                                    <Badge variant="outline" className={`${getSentimentClass(c.sentimiento)} text-xs px-1.5 py-0.5`}>{c.sentimiento}</Badge>
                                </div>
                                <p className="text-xs text-slate-500 mb-1.5">{c.fecha}</p>
                                <p className="text-sm text-slate-600 leading-relaxed">{c.texto}</p>
                            </div>
                        )) : (
                            <p className="text-center py-8 text-slate-500">No hay comentarios para mostrar.</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChartCard title="Distribución de Sentimientos">
                    <ResponsivePieChart data={processedData.sentimentDistribution} />
                </ChartCard>
                <ChartCard title="Temas Principales en Comentarios">
                    <ResponsiveBarChart data={processedData.topCommentThemes} layout="vertical" yAxisWidth={120} />
                </ChartCard>
            </div>
        </TabsContent>
        
        {/* --- PESTAÑA PERFIL PACIENTE (AGREGACIONES) --- */}
        <TabsContent value="perfil" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ChartCard title="¿Cómo nos conoció?">
                    <ResponsivePieChart data={processedData.comoNosConocioDistribution} />
                </ChartCard>
                 <ChartCard title="Motivo Principal de Visita">
                    <ResponsivePieChart data={processedData.motivoVisitaDistribution} />
                </ChartCard>
                 <ChartCard title="Tipo de Seguro Médico">
                    <ResponsivePieChart data={processedData.seguroMedicoDistribution} />
                </ChartCard>
                <ChartCard title="Plazo Ideal para Resolución">
                    <ResponsiveBarChart data={processedData.plazoResolucionDistribution} layout="vertical" yAxisWidth={100} />
                </ChartCard>
                <ChartCard title="Tiempo para Tomar Decisión">
                    <ResponsiveBarChart data={processedData.tiempoDecisionDistribution} layout="vertical" yAxisWidth={120} />
                </ChartCard>
            </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

// --- SUBCOMPONENTES MEMOIZADOS PARA TARJETAS Y GRÁFICOS ---
interface MetricCardProps { title: string; value: string; icon: React.ElementType; description?: string; }
const MetricCard = React.memo(({ title, value, icon: Icon }: MetricCardProps) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
      <Icon className="h-4 w-4 text-slate-400" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
    </CardContent>
  </Card>
));
MetricCard.displayName = 'MetricCard';


interface ChartCardProps { title: string; children: React.ReactNode; description?: string; }
const ChartCard = React.memo(({ title, children, description }: ChartCardProps) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="text-lg font-semibold text-slate-700">{title}</CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent>
      <div className="h-[300px] sm:h-[350px]">{children}</div> {/* Altura base responsiva */}
    </CardContent>
  </Card>
));
ChartCard.displayName = 'ChartCard';


const ResponsivePieChart = React.memo(({ data }: { data: ChartDataItem[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" labelLine={false}
           label={({ name, percent }) => `${name}: ${formatPercent(percent)}`}>
        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />)}
      </Pie>
      <Tooltip formatter={(value: number, name: string, entry: any) => [`${value} (${formatPercent(entry.payload.percent)})`, name]} />
      <Legend iconSize={10} wrapperStyle={{ fontSize: "12px" }} />
    </PieChart>
  </ResponsiveContainer>
));
ResponsivePieChart.displayName = 'ResponsivePieChart';


const ResponsiveBarChart = React.memo(({ data, layout = "horizontal", yAxisWidth = 60 }: { data: ChartDataItem[], layout?: "horizontal" | "vertical", yAxisWidth?: number }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout={layout} margin={{ top: 5, right: 20, left: layout === 'vertical' ? yAxisWidth - 60 : 5, bottom: 20 }}>
      <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
      {layout === "horizontal" ? (
        <>
          <XAxis dataKey="name" angle={-25} textAnchor="end" height={50} interval={0} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
        </>
      ) : (
        <>
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis dataKey="name" type="category" width={yAxisWidth} tick={{ fontSize: 10 }} />
        </>
      )}
      <Tooltip formatter={(value: number) => [value, "Cantidad"]} />
      <Bar dataKey="value" radius={[4, 4, 0, 0]} >
        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
));
ResponsiveBarChart.displayName = 'ResponsiveBarChart';

const ResponsiveRadarChart = React.memo(({ data }: { data: RadarPoint[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
      <PolarGrid opacity={0.7} />
      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
      <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} tick={{ fontSize: 9 }} />
      <Radar name="Promedio" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} />
      <Tooltip formatter={(value: number) => [value.toFixed(1), "Valor Promedio"]} />
    </RadarChart>
  </ResponsiveContainer>
));
ResponsiveRadarChart.displayName = 'ResponsiveRadarChart';