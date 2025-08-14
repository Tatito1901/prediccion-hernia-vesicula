// hooks/use-chart-data.tsx - Minimal replacement for chart data processing
import { useMemo } from 'react';
import type { Patient, Appointment } from '@/lib/types';

// Basic types for chart data
export interface AppointmentFilters {
  dateRange?: 'week' | 'month' | 'year';
  patientId?: string;
  doctorId?: string;
  estado?: string;
  motiveFilter?: string;
  statusFilter?: string[];
  timeRange?: [number, number];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface ChartSeries {
  name: string;
  data: number[];
}

interface ChartData {
  series: ChartSeries[];
  categories: string[];
}

interface UseChartDataProps extends AppointmentFilters {
  patients: Patient[];
  appointments: Appointment[];
}

/**
 * Minimal hook for processing chart data from patients and appointments
 * Replaces the removed use-chart-data hook with essential functionality only
 */
export function useChartData({
  patients,
  appointments,
  dateRange = 'month',
  estado = 'todos'
}: UseChartDataProps) {
  
  const chart = useMemo((): ChartData => {
    if (!patients || !appointments) {
      return {
        series: [],
        categories: []
      };
    }

    // Simple chart data processing
    const now = new Date();
    const timeframe = dateRange === 'week' ? 7 : dateRange === 'year' ? 365 : 30;
    const startDate = new Date(now.getTime() - (timeframe * 24 * 60 * 60 * 1000));
    
    // Filter appointments by date range
    const filteredAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.fecha_hora_cita);
      return aptDate >= startDate && aptDate <= now;
    });

    // Group by day/week/month depending on dateRange
    const groupedData: { [key: string]: { consultas: number; operados: number } } = {};
    
    filteredAppointments.forEach(apt => {
      const date = new Date(apt.fecha_hora_cita);
      const key = dateRange === 'week' 
        ? date.toISOString().split('T')[0] // Daily for week view
        : dateRange === 'year'
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` // Monthly for year view  
        : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; // Daily for month view
      
      if (!groupedData[key]) {
        groupedData[key] = { consultas: 0, operados: 0 };
      }
      
      groupedData[key].consultas += 1;
      
      // Check if patient was operated (simplified logic)
      const patient = patients.find(p => p.id === apt.patient_id);
      if (patient && patient.estado_paciente === 'operado') {
        groupedData[key].operados += 1;
      }
    });

    const categories = Object.keys(groupedData).sort();
    const consultasData = categories.map(key => groupedData[key]?.consultas || 0);
    const operadosData = categories.map(key => groupedData[key]?.operados || 0);

    return {
      series: [
        { name: 'Consultas', data: consultasData },
        { name: 'Operados', data: operadosData }
      ],
      categories
    };
  }, [patients, appointments, dateRange]);

  return {
    chart,
    // Additional processed data that might be needed
    transformedPatients: patients,
    filteredAppointments: appointments,
    isLoading: false,
    error: null
  };
}
