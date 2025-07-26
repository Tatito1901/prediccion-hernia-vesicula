// components/patient-admision/patient-admission.tsx
'use client';

import React, { useState, useCallback, memo, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import {
  CalendarCheck,
  CalendarClock,
  History,
  UserPlus,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  Loader2,
  TrendingUp,
  Clock,
} from 'lucide-react';

// ✅ IMPORTS CORREGIDOS - usando tipos unificados
import type { 
  TabType, 
  AdmissionAction, 
  AppointmentWithPatient,
  AdmissionDBResponse 
} from './admision-types';

// ✅ Hooks corregidos
import { useAdmissionData, useRefreshAdmissionData } from '@/hooks/use-admission-data';

// ✅ Componentes corregidos
import AppointmentsList from './appointments-list';
import NewPatientForm from './new-patient-form';
import PatientCard from './patient-card';

// ==================== CONFIGURACIÓN DE TABS ====================
const TAB_CONFIG = [
  {
    key: 'newPatient' as TabType,
    label: 'Nuevo Paciente',
    shortLabel: 'Nuevo',
    icon: UserPlus,
    description: 'Registrar un nuevo paciente y agendar su primera cita',
    color: 'blue',
  },
  {
    key: 'today' as TabType,
    label: 'Citas de Hoy',
    shortLabel: 'Hoy',
    icon: CalendarCheck,
    description: 'Citas programadas para el día de hoy',
    color: 'green',
  },
  {
    key: 'future' as TabType,
    label: 'Próximas Citas',
    shortLabel: 'Próximas',
    icon: CalendarClock,
    description: 'Citas programadas para fechas futuras',
    color: 'purple',
  },
  {
    key: 'past' as TabType,
    label: 'Historial',
    shortLabel: 'Historial',
    icon: History,
    description: 'Historial de citas pasadas y completadas',
    color: 'gray',
  },
] as const;

// ==================== COMPONENTES INTERNOS MEMOIZADOS ====================

// ✅ Tab de navegación optimizado con tipos corregidos
const TabNavigation = memo<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: Record<TabType, number>;
  isLoading: boolean;
}>(({ activeTab, onTabChange, counts, isLoading }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
    {TAB_CONFIG.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.key;
      const count = counts[tab.key] || 0;
      
      return (
        <Button
          key={tab.key}
          variant={isActive ? 'default' : 'outline'}
          onClick={() => onTabChange(tab.key)}
          disabled={isLoading}
          className={`
            relative h-auto p-4 flex-col items-start text-left
            ${isActive ? `bg-${tab.color}-600 hover:bg-${tab.color}-700 text-white` : ''}
          `}
        >
          <div className="flex items-center justify-between w-full mb-2">
            <Icon className={`h-5 w-5 ${isActive ? 'text-white' : `text-${tab.color}-600`}`} />
            <Badge variant={isActive ? 'secondary' : 'outline'} className="ml-2">
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                count
              )}
            </Badge>
          </div>
          <div>
            <div className="font-semibold text-sm sm:text-base">
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </div>
            <p className={`text-xs mt-1 hidden sm:block ${
              isActive ? 'text-white/80' : 'text-muted-foreground'
            }`}>
              {tab.description}
            </p>
          </div>
        </Button>
      );
    })}
  </div>
));

TabNavigation.displayName = "TabNavigation";

// ✅ Header optimizado con indicadores de estado
const AdmissionHeader = memo<{
  isOnline: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}>(({ isOnline, isRefreshing, onRefresh }) => {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarCheck className="h-6 w-6 text-blue-600" />
              Admisión de Pacientes
            </CardTitle>
            <p className="text-muted-foreground mt-1">
              Gestione las citas y el flujo de pacientes de manera eficiente
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Indicador de conexión */}
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                {isOnline ? 'En línea' : 'Sin conexión'}
              </span>
            </div>

            {/* Botón de actualizar */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isRefreshing ? 'Actualizando...' : 'Actualizar'}
              </span>
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
});

AdmissionHeader.displayName = "AdmissionHeader";

// ✅ Lista de citas optimizada
const AppointmentsSection = memo<{
  appointments: AppointmentWithPatient[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onAppointmentAction: (action: AdmissionAction, appointmentId: string) => void;
  emptyMessage: string;
}>(({ 
  appointments, 
  isLoading, 
  isLoadingMore, 
  hasMore, 
  onLoadMore, 
  onAppointmentAction,
  emptyMessage 
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="flex items-center space-x-3">
                <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <CalendarClock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {emptyMessage}
          </h3>
          <p className="text-gray-500">
            Las citas aparecerán aquí una vez que sean programadas.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <PatientCard
          key={appointment.id}
          appointment={appointment}
          onAction={onAppointmentAction}
        />
      ))}
      
      {/* Botón para cargar más */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="gap-2"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Cargar más citas
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
});

AppointmentsSection.displayName = "AppointmentsSection";

// ==================== COMPONENTE PRINCIPAL ====================
const PatientAdmission: React.FC = () => {
  // ✅ ESTADOS LOCALES
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // ✅ HOOKS CORREGIDOS con tipos unificados
  const {
    appointments,
    counts,
    isLoading,
    isLoadingMore,
    hasMore,
    isError,
    error,
    loadMore,
    refresh,
  } = useAdmissionData(activeTab);

  const { refreshAll } = useRefreshAdmissionData();

  // ✅ EFECTOS para estado de conexión
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ✅ HANDLERS OPTIMIZADOS
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshAll();
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [refreshAll]);

  const handleAppointmentAction = useCallback((action: AdmissionAction, appointmentId: string) => {
    console.log(`🎯 [PatientAdmission] Action ${action} for appointment ${appointmentId}`);
    // La acción se maneja en el PatientCard directamente
  }, []);

  const handleNewPatientSuccess = useCallback((result: AdmissionDBResponse) => {
    console.log('✅ [PatientAdmission] New patient created:', result);
    // Cambiar a la tab de hoy para ver la nueva cita
    setActiveTab('today');
    // Refrescar datos
    refresh();
  }, [refresh]);

  // ✅ MENSAJES PARA ESTADOS VACÍOS
  const emptyMessages = useMemo(() => ({
    newPatient: 'Complete el formulario para registrar un nuevo paciente',
    today: 'No hay citas programadas para hoy',
    future: 'No hay citas futuras programadas',
    past: 'No hay historial de citas disponible',
  }), []);

  // ✅ RENDERIZADO CONDICIONAL DEL CONTENIDO
  const renderTabContent = () => {
    if (activeTab === 'newPatient') {
      return (
        <NewPatientForm
          onSuccess={handleNewPatientSuccess}
          onCancel={() => setActiveTab('today')}
        />
      );
    }

    return (
      <AppointmentsSection
        appointments={appointments}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onAppointmentAction={handleAppointmentAction}
        emptyMessage={emptyMessages[activeTab]}
      />
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* ✅ HEADER CON INDICADORES */}
      <AdmissionHeader
        isOnline={isOnline}
        isRefreshing={isLoading}
        onRefresh={handleRefresh}
      />

      {/* ✅ ALERTA DE ERROR */}
      {isError && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar datos: {error.message}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="ml-2"
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ✅ NAVEGACIÓN DE TABS */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={counts}
        isLoading={isLoading}
      />

      {/* ✅ CONTENIDO PRINCIPAL */}
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default PatientAdmission;