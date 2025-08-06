// components/appointments/appointments-list-reactive.tsx - COMPONENTE REACTIVO BACKEND-FIRST
'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useClinic } from '@/contexts/clinic-data-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ==================== TIPOS ====================
interface AppointmentsListReactiveProps {
  initialDateFilter?: 'today' | 'future' | 'past' | 'all';
  initialPageSize?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
}

// ==================== COMPONENTE REACTIVO ====================
export function AppointmentsListReactive({
  initialDateFilter = 'today',
  initialPageSize = 20,
  showSearch = true,
  showFilters = true,
  showPagination = true,
}: AppointmentsListReactiveProps) {
  // 🎯 Estados locales para filtros (NO datos)
  const [dateFilter, setDateFilter] = useState(initialDateFilter);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);

  // 🎯 FETCH ESPECÍFICO - Solo datos necesarios desde backend
  const clinic = useClinic();
  const [appointmentsResponse, setAppointmentsResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Función para cargar los datos
  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await clinic.fetchSpecificAppointments({
        dateFilter: dateFilter === 'all' ? undefined : dateFilter,
        search: search.trim() || undefined,
        // El parámetro 'status' no es aceptado por fetchSpecificAppointments
        // pero mantenemos el filtro local para la UI
        pageSize,
      });
      setAppointmentsResponse(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error al cargar citas'));
      console.error('Error fetching appointments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clinic, dateFilter, search, status, pageSize]);
  
  // Efecto para cargar los datos cuando cambian los filtros
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments, page]);
  
  // Función para refrescar los datos
  const refetch = useCallback(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // 🎯 Datos memoizados (NO filtrado local)
  const appointments = useMemo<any[]>(() => 
    appointmentsResponse?.data || [], 
    [appointmentsResponse?.data]
  );

  const pagination = useMemo(() => 
    appointmentsResponse?.pagination || {
      page: 1,
      pageSize: initialPageSize,
      total: 0,
      totalPages: 0,
      hasMore: false,
    }, 
    [appointmentsResponse?.pagination, initialPageSize]
  );

  const summary = useMemo(() => 
    appointmentsResponse?.summary, 
    [appointmentsResponse?.summary]
  );

  // 🎯 Handlers para cambios de filtros
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1); // Reset a página 1
  }, []);

  const handleDateFilterChange = useCallback((filter: typeof dateFilter) => {
    setDateFilter(filter);
    setPage(1); // Reset a página 1
  }, []);

  const handleStatusChange = useCallback((statusValue: string) => {
    setStatus(statusValue);
    setPage(1); // Reset a página 1
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 🎯 Función para obtener badge de estado
  const getStatusBadge = (estado: string) => {
    const statusConfig = {
      programada: { label: 'Programada', variant: 'secondary' as const },
      confirmada: { label: 'Confirmada', variant: 'default' as const },
      en_curso: { label: 'En Curso', variant: 'default' as const },
      completada: { label: 'Completada', variant: 'default' as const },
      cancelada: { label: 'Cancelada', variant: 'destructive' as const },
      no_asistio: { label: 'No Asistió', variant: 'destructive' as const },
    };

    const config = statusConfig[estado as keyof typeof statusConfig] || {
      label: estado,
      variant: 'secondary' as const,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 🎯 Renderizado de loading
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Citas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // 🎯 Renderizado de error
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Calendar className="h-5 w-5" />
            Error al cargar citas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {error.message || 'Ocurrió un error al cargar las citas'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Citas
          {summary && (
            <Badge variant="secondary">
              {dateFilter === 'today' && `${summary.today_count} hoy`}
              {dateFilter === 'future' && `${summary.future_count} futuras`}
              {dateFilter === 'past' && `${summary.past_count} pasadas`}
              {dateFilter === 'all' && `${summary.total_appointments} total`}
            </Badge>
          )}
        </CardTitle>
        
        {/* 🎯 CONTROLES DE FILTRADO */}
        {(showSearch || showFilters) && (
          <div className="flex flex-col sm:flex-row gap-4">
            {showSearch && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, motivo..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
            
            {showFilters && (
              <div className="flex gap-2">
                <select
                  value={dateFilter}
                  onChange={(e) => handleDateFilterChange(e.target.value as typeof dateFilter)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="today">Hoy</option>
                  <option value="future">Futuras</option>
                  <option value="past">Pasadas</option>
                  <option value="all">Todas</option>
                </select>
                
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Todos los estados</option>
                  <option value="programada">Programada</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {/* 🎯 LISTA DE CITAS */}
        {appointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se encontraron citas con los filtros seleccionados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">
                      {appointment.patients?.nombre} {appointment.patients?.apellidos}
                    </h4>
                    {getStatusBadge(appointment.estado_cita)}
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      📅 {format(new Date(appointment.fecha_hora_cita), 'PPP p', { locale: es })}
                    </p>
                    <p>📋 {Array.isArray(appointment.motivos_consulta) ? appointment.motivos_consulta.join(', ') : 'Sin especificar'}</p>
                    {appointment.doctor?.full_name && (
                      <p>👨‍⚕️ Dr. {appointment.doctor.full_name}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Ver detalles
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 🎯 PAGINACIÓN */}
        {showPagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Página {pagination.page} de {pagination.totalPages} 
              ({pagination.total} citas total)
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasMore}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
