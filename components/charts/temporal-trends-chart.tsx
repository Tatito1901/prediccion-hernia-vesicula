// components/charts/temporal-trends-chart.tsx - GRÁFICO FUNCIONAL DE TENDENCIAS TEMPORALES
"use client";

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClinic } from '@/contexts/clinic-data-provider';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface MonthlyData {
  month: string;
  registered: number;
  operated: number;
  consulted: number;
  monthKey: string;
}

export default function TemporalTrendsChart() {
  const { allPatients, allAppointments, isLoading } = useClinic();

  // Procesar datos para el gráfico temporal
  const chartData: MonthlyData[] = useMemo(() => {
    if (!allPatients?.length) return [];

    // Obtener los últimos 6 meses
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      months.push({
        date: monthStart,
        key: format(monthStart, 'yyyy-MM'),
        label: format(monthStart, 'MMM yyyy', { locale: es })
      });
    }

    // Procesar datos por mes
    return months.map(({ date, key, label }) => {
      const monthStart = startOfMonth(date);
      const nextMonth = startOfMonth(subMonths(date, -1));

      // Pacientes registrados en el mes
      const registeredInMonth = allPatients.filter((patient: any) => {
        if (!patient.fecha_registro) return false;
        const regDate = parseISO(patient.fecha_registro);
        return regDate >= monthStart && regDate < nextMonth;
      }).length;

      // Pacientes operados en el mes
      const operatedInMonth = allPatients.filter((patient: any) => {
        if (patient.estado_paciente !== 'OPERADO' || !patient.fecha_cirugia_programada) return false;
        const opDate = parseISO(patient.fecha_cirugia_programada);
        return opDate >= monthStart && opDate < nextMonth;
      }).length;

      // Citas/consultas en el mes
      const consultedInMonth = allAppointments?.filter((appointment: any) => {
        if (!appointment.fecha_hora_cita) return false;
        const consultDate = parseISO(appointment.fecha_hora_cita);
        return consultDate >= monthStart && consultDate < nextMonth;
      }).length || 0;

      return {
        month: label,
        registered: registeredInMonth,
        operated: operatedInMonth,
        consulted: consultedInMonth,
        monthKey: key
      };
    });
  }, [allPatients, allAppointments]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((pld: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: pld.color }}
              />
              <span className="text-sm">
                {pld.dataKey === 'registered' && 'Pacientes Registrados: '}
                {pld.dataKey === 'operated' && 'Pacientes Operados: '}
                {pld.dataKey === 'consulted' && 'Consultas Realizadas: '}
                <span className="font-semibold">{pld.value}</span>
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolución Temporal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.length || chartData.every(d => d.registered === 0 && d.operated === 0 && d.consulted === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolución Temporal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p>No hay suficientes datos temporales disponibles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determinar si mostrar líneas o barras basado en la densidad de datos
  const totalActivity = chartData.reduce((sum, d) => sum + d.registered + d.operated + d.consulted, 0);
  const useBarChart = totalActivity < 10; // Si hay poca actividad, usar barras

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Evolución Temporal
          <span className="text-sm font-normal text-gray-500">
            (Últimos 6 meses)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {useBarChart ? (
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="registered" 
                fill="#3b82f6" 
                name="Registrados"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="operated" 
                fill="#22c55e" 
                name="Operados"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="consulted" 
                fill="#f59e0b" 
                name="Consultas"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="registered" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Registrados"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="operated" 
                stroke="#22c55e" 
                strokeWidth={3}
                name="Operados"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="consulted" 
                stroke="#f59e0b" 
                strokeWidth={3}
                name="Consultas"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
