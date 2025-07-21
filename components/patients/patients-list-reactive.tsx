// components/patients/patients-list-reactive.tsx - COMPONENTE REACTIVO BACKEND-FIRST
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useSpecificPatients } from '@/contexts/clinic-data-provider-new';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Filter, ChevronLeft, ChevronRight, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ==================== TIPOS ====================
interface PatientsListReactiveProps {
  initialPageSize?: number;
  showSearch?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
  showStats?: boolean;
}

// ==================== COMPONENTE REACTIVO ====================
export function PatientsListReactive({
  initialPageSize = 15,
  showSearch = true,
  showFilters = true,
  showPagination = true,
  showStats = true,
}: PatientsListReactiveProps) {
  // 🎯 Estados locales para filtros (NO datos)
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [sortBy, setSortBy] = useState<'created_at' | 'nombre' | 'apellidos'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 🎯 FETCH ESPECÍFICO - Solo datos necesarios desde backend
  const {
    data: patientsResponse,
    isLoading,
    error,
    refetch,
  } = useSpecificPatients({
    search: search.trim() || undefined,
    status: status === 'all' ? undefined : status,
    page,
    pageSize,
    sortBy,
    sortOrder,
    includeStats: showStats,
  });

  // 🎯 Datos memoizados (NO filtrado local)
  const patients = useMemo(() => 
    patientsResponse?.data || [], 
    [patientsResponse?.data]
  );

  const pagination = useMemo(() => 
    patientsResponse?.pagination || {
      page: 1,
      pageSize: initialPageSize,
      total: 0,
      totalPages: 0,
      hasMore: false,
    }, 
    [patientsResponse?.pagination, initialPageSize]
  );

  const stats = useMemo(() => 
    patientsResponse?.stats, 
    [patientsResponse?.stats]
  );

  // 🎯 Handlers para cambios de filtros
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1); // Reset a página 1
  }, []);

  const handleStatusChange = useCallback((statusValue: string) => {
    setStatus(statusValue);
    setPage(1); // Reset a página 1
  }, []);

  const handleSortChange = useCallback((field: typeof sortBy, order: typeof sortOrder) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1); // Reset a página 1
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 🎯 Función para obtener badge de estado
  const getStatusBadge = (estado: string) => {
    const statusConfig = {
      activo: { label: 'Activo', variant: 'default' as const },
      inactivo: { label: 'Inactivo', variant: 'secondary' as const },
      operado: { label: 'Operado', variant: 'default' as const },
      seguimiento: { label: 'Seguimiento', variant: 'default' as const },
    };

    const config = statusConfig[estado as keyof typeof statusConfig] || {
      label: estado,
      variant: 'secondary' as const,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // 🎯 Calcular edad
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // 🎯 Renderizado de loading
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pacientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
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
            <Users className="h-5 w-5" />
            Error al cargar pacientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {error.message || 'Ocurrió un error al cargar los pacientes'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🎯 ESTADÍSTICAS */}
      {showStats && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.totalPatients}</div>
              <div className="text-sm text-muted-foreground">Total Pacientes</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.surveyRate}%</div>
              <div className="text-sm text-muted-foreground">Tasa Encuestas</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.pendingConsults}</div>
              <div className="text-sm text-muted-foreground">Consultas Pendientes</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.operatedPatients}</div>
              <div className="text-sm text-muted-foreground">Operados</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 🎯 LISTA PRINCIPAL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pacientes
            <Badge variant="secondary">
              {pagination.total} total
            </Badge>
          </CardTitle>
          
          {/* 🎯 CONTROLES DE FILTRADO */}
          {(showSearch || showFilters) && (
            <div className="flex flex-col sm:flex-row gap-4">
              {showSearch && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, teléfono, email..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}
              
              {showFilters && (
                <div className="flex gap-2">
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="operado">Operado</option>
                    <option value="seguimiento">Seguimiento</option>
                  </select>
                  
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      handleSortChange(field as typeof sortBy, order as typeof sortOrder);
                    }}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="created_at-desc">Más recientes</option>
                    <option value="created_at-asc">Más antiguos</option>
                    <option value="nombre-asc">Nombre A-Z</option>
                    <option value="nombre-desc">Nombre Z-A</option>
                    <option value="apellidos-asc">Apellido A-Z</option>
                    <option value="apellidos-desc">Apellido Z-A</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          {/* 🎯 LISTA DE PACIENTES */}
          {patients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron pacientes con los filtros seleccionados</p>
            </div>
          ) : (
            <div className="space-y-4">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">
                        {patient.nombre} {patient.apellidos}
                      </h4>
                      {getStatusBadge(patient.estado_paciente)}
                      {patient.es_primera_vez && (
                        <Badge variant="outline">Primera vez</Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-4">
                        <span>
                          🎂 {calculateAge(patient.fecha_nacimiento)} años
                        </span>
                        {patient.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {patient.telefono}
                          </span>
                        )}
                        {patient.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {patient.email}
                          </span>
                        )}
                      </div>
                      
                      {patient.diagnostico_principal && (
                        <p>📋 {patient.diagnostico_principal}</p>
                      )}
                      
                      <p>
                        📅 Registrado: {format(new Date(patient.created_at), 'PPP', { locale: es })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Ver perfil
                    </Button>
                    <Button variant="outline" size="sm">
                      Nueva cita
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
                ({pagination.total} pacientes total)
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
    </div>
  );
}
