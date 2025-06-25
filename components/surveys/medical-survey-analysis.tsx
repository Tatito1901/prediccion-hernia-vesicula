"use client";

import React, { useState, useMemo, type ChangeEvent, type FC } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  Filter, Search, Calendar as CalendarIcon, TrendingUp, Users,
  BarChart3, Activity, AlertTriangle, CheckCircle2
} from "lucide-react";
import { usePatients } from '@/hooks/use-patients';
import type { Patient } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Type Definitions
type ChartDataItem = { name: string; value: number };

// Constants
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];
const severidadSintomasMap: Record<string, string> = { 
    "1": "Muy Leve", "2": "Leve", "3": "Moderado", "4": "Severo", "5": "Muy Severo" 
};
const diagnosticoMap: Record<string, string> = {
    "hernia-inguinal": "Hernia Inguinal",
    "vesicula": "Vesícula Biliar",
    "apendicitis": "Apendicitis",
    "otro": "Otro"
};

// Utility Functions
const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch { return "Fecha inválida"; }
};

const formatPercent = (value?: number, decimals = 0): string => {
  if (value === undefined || value === null || isNaN(value)) return "0%";
  return `${(value * 100).toFixed(decimals)}%`;
};

const aggregateData = (
  surveys: Patient[], 
  key: keyof Patient, 
  map?: Record<string, string>
): ChartDataItem[] => {
  const counts: Record<string, number> = {};
  surveys.forEach(survey => {
    const value = survey[key] as string | undefined;
    if (value) {
      const name = map?.[value] ?? value;
      counts[name] = (counts[name] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

// Child Components for better readability
const MetricCard: FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const ChartCard: FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <Card>
        <CardHeader>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
            {children}
        </CardContent>
    </Card>
);

const ResponsivePieChart: FC<{ data: ChartDataItem[] }> = ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
        </PieChart>
    </ResponsiveContainer>
);

// Main Component
export default function MedicalSurveyAnalysis() {
  const { data, isLoading, error } = usePatients(1, 1000, 'completed');

  const [activeTab, setActiveTab] = useState("dashboard");
  const [filterDate, setFilterDate] = useState("todo");
  const [filterDiagnosis, setFilterDiagnosis] = useState("todos");
  const [filterAge, setFilterAge] = useState("todos");
  const [filterSeverity, setFilterSeverity] = useState("todas");
  const [searchTermPatients, setSearchTermPatients] = useState("");

  const filteredData = useMemo(() => {
    let surveys = data?.patients || [];

    if (filterDate !== "todo") {
      const now = new Date();
      const startDate = new Date();
      if (filterDate === "ultima-semana") startDate.setDate(now.getDate() - 7);
      else if (filterDate === "ultimo-mes") startDate.setMonth(now.getMonth() - 1);
      else if (filterDate === "ultimo-trimestre") startDate.setMonth(now.getMonth() - 3);
      else if (filterDate === "ultimo-anio") startDate.setFullYear(now.getFullYear() - 1);
      
      surveys = surveys.filter((s: Patient) => {
        const surveyDateStr = s.fechaEncuesta || s.fechaActualizacion;
        if (!surveyDateStr) return false;
        try { return new Date(surveyDateStr) >= startDate; } catch { return false; }
      });
    }

    if (filterDiagnosis !== "todos") {
      surveys = surveys.filter(s => s.diagnostico?.toLowerCase().replace(/\s+/g, "-") === filterDiagnosis);
    }
    
    if (filterAge !== "todos") {
      surveys = surveys.filter((s: Patient) => {
        if (typeof s.edad !== 'number') return false;
        if (filterAge === "18-30") return s.edad >= 18 && s.edad <= 30;
        if (filterAge === "31-45") return s.edad >= 31 && s.edad <= 45;
        if (filterAge === "46-60") return s.edad >= 46 && s.edad <= 60;
        if (filterAge === "60+") return s.edad > 60;
        return true;
      });
    }

    if (filterSeverity !== "todas") {
      surveys = surveys.filter(s => s.severidadSintomasActuales === filterSeverity);
    }

    return surveys;
  }, [data, filterDate, filterDiagnosis, filterAge, filterSeverity]);

  const processedData = useMemo(() => {
    if (!filteredData.length) return null;

    const totalSurveys = filteredData.length;
    
    const withProbCirugia = filteredData.filter(p => typeof p.probabilidadCirugia === 'number');
    const conversionRate = withProbCirugia.length > 0
      ? withProbCirugia.reduce((sum, p) => sum + (p.probabilidadCirugia || 0), 0) / withProbCirugia.length
      : 0;

    const severidadSintomasNum = filteredData
        .map((s: Patient) => s.severidadSintomasActuales ? parseInt(s.severidadSintomasActuales, 10) : undefined)
        .filter((v: number | undefined): v is number => typeof v === 'number' && !isNaN(v));

    const averagePainIntensity = severidadSintomasNum.length > 0 
        ? severidadSintomasNum.reduce((a: number, b: number) => a + b, 0) / severidadSintomasNum.length 
        : undefined;

    return {
      totalSurveys,
      conversionRate,
      averagePainIntensity,
      diagnosisDistribution: aggregateData(filteredData, 'diagnostico', diagnosticoMap),
      symptomSeverityDistribution: aggregateData(filteredData, 'severidadSintomasActuales', severidadSintomasMap),
    };
  }, [filteredData]);

  const displayPriorityPatients = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => (b.probabilidadCirugia || 0) - (a.probabilidadCirugia || 0));
    const filtered = sorted.filter(p =>
        p.nombreCompleto?.toLowerCase().includes(searchTermPatients.toLowerCase()) ||
        p.diagnostico?.toLowerCase().includes(searchTermPatients.toLowerCase())
    );
    return filtered.map(p => ({
        id: p.id,
        nombreCompleto: p.nombreCompleto || 'Sin Nombre',
        edad: p.edad,
        diagnostico: p.diagnostico ? (diagnosticoMap[p.diagnostico] || p.diagnostico) : 'N/A',
        probabilidadCirugia: p.probabilidadCirugia,
        ultimoContacto: formatDate(p.fechaActualizacion),
    }));
  }, [filteredData, searchTermPatients]);

  if (isLoading) return <div className="flex justify-center items-center h-96"><LoadingSpinner /></div>;
  if (error) return (
    <Alert variant="destructive" className="m-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error al Cargar Datos</AlertTitle>
      <AlertDescription>{error instanceof Error ? error.message : "Ocurrió un error desconocido"}</AlertDescription>
    </Alert>
  );
  if (!processedData) return (
    <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No hay datos disponibles</AlertTitle>
        <AlertDescription>No se encontraron encuestas completadas que coincidan con los filtros seleccionados.</AlertDescription>
    </Alert>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros Globales</CardTitle>
          <CardDescription>Aplica filtros a todos los análisis y visualizaciones.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
              {Object.entries(diagnosticoMap).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
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
            </TabsList>
        </ScrollArea>

        <TabsContent value="dashboard" className="mt-4 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Encuestas" value={processedData.totalSurveys.toString()} icon={Users} />
            <MetricCard title="Tasa Conversión (Prob.)" value={formatPercent(processedData.conversionRate)} icon={TrendingUp} />
            <MetricCard title="Dolor Promedio" value={`${processedData.averagePainIntensity?.toFixed(1) || 'N/A'} / 5`} icon={Activity} />
            <MetricCard title="Prob. Cirugía (Media)" value={formatPercent(processedData.conversionRate)} icon={CheckCircle2} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Distribución por Diagnóstico">
                <ResponsivePieChart data={processedData.diagnosisDistribution} />
            </ChartCard>
            <ChartCard title="Severidad de Síntomas Reportada">
                <ResponsivePieChart data={processedData.symptomSeverityDistribution} />
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="pacientes" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Pacientes Prioritarios ({displayPriorityPatients.length})</CardTitle>
              <CardDescription>Pacientes con mayor probabilidad de conversión o necesidad de seguimiento.</CardDescription>
              <div className="relative mt-2 max-w-sm">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por nombre o diagnóstico..." 
                  value={searchTermPatients} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTermPatients(e.target.value)}
                  className="pl-8"
                />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh - 420px)]">
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
                    {displayPriorityPatients.length > 0 ? displayPriorityPatients.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.nombreCompleto}</div>
                          <div className="text-xs text-muted-foreground">{p.edad ? `${p.edad} años` : ''}</div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{p.diagnostico}</TableCell>
                        <TableCell>
                          <Badge variant={(p.probabilidadCirugia || 0) > 0.7 ? "default" : "secondary"}
                                 className={(p.probabilidadCirugia || 0) > 0.7 ? "bg-green-500 hover:bg-green-600 text-white" : ""}>
                            {formatPercent(p.probabilidadCirugia)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{p.ultimoContacto}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={4} className="text-center py-8">No se encontraron pacientes con los filtros actuales.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
