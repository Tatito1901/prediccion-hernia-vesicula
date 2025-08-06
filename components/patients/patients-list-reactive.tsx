// components/patients/patients-list-reactive.tsx - COMPONENTE REACTIVO BACKEND-FIRST
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useClinic } from '@/contexts/clinic-data-provider';
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

  // 🎯 FETCH desde contexto centralizado
  const {
    allPatients: allPatientsData,
    isLoading,
    error,
    refetch,
  } = useClinic();

  // 🎯 Filtrado y paginación local
  const filteredAndPaginatedData = useMemo(() => {
    if (!allPatientsData) return { data: [], total: 0, stats: null };

    let filtered = [...allPatientsData];

    // Filtro por búsqueda
    if (search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      filtered = filtered.filter(patient => 
        patient.nombre?.toLowerCase().includes(searchTerm) ||
        patient.apellidos?.toLowerCase().includes(searchTerm) ||
        patient.email?.toLowerCase().includes(searchTerm) ||
        patient.telefono?.includes(searchTerm)
      );
    }

    // Filtro por estado
    if (status !== 'all') {
      filtered = filtered.filter(patient => patient.estado_paciente === status);
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof typeof a] || '';
      const bValue = b[sortBy as keyof typeof b] || '';
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Paginación
    const total = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedData = filtered.slice(startIndex, startIndex + pageSize);

    // Stats básicas si se requieren
    const stats = showStats ? {
      total,
      active: filtered.filter(p => ['PENDIENTE DE CONSULTA', 'CONSULTADO', 'EN SEGUIMIENTO'].includes(p.estado_paciente || '')).length,
      completed: filtered.filter(p => p.estado_paciente === 'OPERADO').length,
      // Propiedades esperadas por el componente
      totalPatients: total,
      surveyRate: 0, // No tenemos datos de encuestas en el contexto actual
      pendingConsults: filtered.filter(p => p.estado_paciente === 'PENDIENTE DE CONSULTA').length,
      operatedPatients: filtered.filter(p => p.estado_paciente === 'OPERADO').length
    } : null;

    return { data: paginatedData, total, stats };
  }, [allPatientsData, search, status, page, pageSize, sortBy, sortOrder, showStats]);

  // 🎯 Datos memoizados para el componente
  const patients = filteredAndPaginatedData.data;
  const totalPatients = filteredAndPaginatedData.total;
  const patientsStats = filteredAndPaginatedData.stats;

  const pagination = useMemo(() => ({
    page,
    pageSize,
    total: totalPatients,
    totalPages: Math.ceil(totalPatients / pageSize),
    hasMore: page < Math.ceil(totalPatients / pageSize),
  }), [page, pageSize, totalPatients]);

  const stats = patientsStats;

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
  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return 'N/A';
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
                      {/* Badge removed - es_primera_vez property doesn't exist in current schema */}
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-4">
                        <span>
                          🎂 {patient.fecha_nacimiento ? calculateAge(patient.fecha_nacimiento) : 'N/A'} años
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
                        📅 Registrado: {patient.fecha_registro ? format(new Date(patient.fecha_registro), 'PPP', { locale: es }) : 'N/A'}
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
