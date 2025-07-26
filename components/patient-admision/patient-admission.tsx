// components/admission/patient-admission.tsx - COMPONENTE PRINCIPAL OPTIMIZADO
'use client';

import React, { useState, useCallback, memo, Suspense, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
} from 'lucide-react';

// Types and hooks
import type { 
  TabType, 
  AdmissionAction, 
  AppointmentWithPatient,
  AppointmentUpdatePayload,
} from './admision-types';
import { useAdmissionData } from '@/hooks/use-admission-data';
import { useAdmissionRealtime } from '@/hooks/use-admission-realtime';
import { validateAction, ACTION_TO_STATUS_MAP } from '@/lib/admission-business-rules';

// Components
import { AppointmentsList } from './appointments-list';
import { NewPatientForm } from './new-patient-form';

// ==================== CONFIGURACIÓN DE TABS ====================
const TAB_CONFIG = [
  {
    key: 'newPatient' as TabType,
    label: 'Nuevo Paciente',
    shortLabel: 'Nuevo',
    icon: UserPlus,
    description: 'Registrar un nuevo paciente y agendar su primera cita',
  },
  {
    key: 'today' as TabType,
    label: 'Citas de Hoy',
    shortLabel: 'Hoy',
    icon: CalendarCheck,
    description: 'Citas programadas para el día de hoy',
  },
  {
    key: 'future' as TabType,
    label: 'Próximas Citas',
    shortLabel: 'Próximas',
    icon: CalendarClock,
    description: 'Citas programadas para fechas futuras',
  },
  {
    key: 'past' as TabType,
    label: 'Historial',
    shortLabel: 'Historial',
    icon: History,
    description: 'Historial de citas pasadas y completadas',
  },
] as const;

// ==================== COMPONENTES INTERNOS ====================

// Tab de navegación con contadores y estados
const TabNavigation = memo<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: Record<TabType, number>;
  isLoading: boolean;
}>(({ activeTab, onTabChange, counts, isLoading }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
    {TAB_CONFIG.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.key;
      const count = counts[tab.key] || 0;
      
      return (
        <Button
          key={tab.key}
          variant={isActive ? 'default' : 'outline'}
          className={`
            h-auto p-4 flex-col items-center space-y-2 relative
            transition-all duration-200 hover:scale-[1.02]
            ${isActive ? 'shadow-md' : 'hover:shadow-sm'}
          `}
          onClick={() => onTabChange(tab.key)}
          disabled={isLoading}
        >
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5" />
            <span className="font-medium hidden sm:inline">{tab.label}</span>
            <span className="font-medium sm:hidden">{tab.shortLabel}</span>
          </div>
          
          {tab.key !== 'newPatient' && (
            <Badge 
              variant={isActive ? 'secondary' : 'outline'} 
              className="text-xs min-w-[20px] h-5"
            >
              {isLoading ? '...' : count}
            </Badge>
          )}
          
          <p className="text-xs text-muted-foreground hidden lg:block text-center">
            {tab.description}
          </p>
        </Button>
      );
    })}
  </div>
));

// Header con información de conexión y controles
const AdmissionHeader = memo<{
  isConnected: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}>(({ isConnected, onRefresh, isRefreshing }) => (
  <Card className="mb-6">
    <CardHeader className="pb-4">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-2xl font-bold">Admisión de Pacientes</CardTitle>
          <p className="text-muted-foreground mt-1">
            Gestione pacientes y citas desde un solo lugar
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Indicador de conexión real-time */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600 hidden sm:inline">En línea</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-600 hidden sm:inline">Sin conexión</span>
              </>
            )}
          </div>
          
          {/* Botón de refresh manual */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>
    </CardHeader>
  </Card>
));

// Modal de confirmación para acciones
const ActionConfirmationModal = memo<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: AdmissionAction | null;
  appointment: AppointmentWithPatient | null;
  isLoading: boolean;
}>(({ isOpen, onClose, onConfirm, action, appointment, isLoading }) => {
  const actionLabels: Record<AdmissionAction, { title: string; description: string; variant: 'default' | 'destructive' }> = {
    checkIn: {
      title: 'Marcar Presente',
      description: 'El paciente será marcado como presente y podrá iniciar la consulta.',
      variant: 'default',
    },
    startConsult: {
      title: 'Iniciar Consulta',
      description: 'La consulta será iniciada y el paciente pasará a estar en consulta.',
      variant: 'default',
    },
    complete: {
      title: 'Completar Consulta',
      description: 'La consulta será marcada como completada exitosamente.',
      variant: 'default',
    },
    cancel: {
      title: 'Cancelar Cita',
      description: 'La cita será cancelada y el horario quedará liberado.',
      variant: 'destructive',
    },
    noShow: {
      title: 'Marcar No Asistió',
      description: 'Se registrará que el paciente no se presentó a la cita.',
      variant: 'destructive',
    },
    reschedule: {
      title: 'Reagendar Cita',
      description: 'La cita será reagendada a una nueva fecha y hora.',
      variant: 'default',
    },
    viewHistory: {
      title: 'Ver Historial',
      description: 'Se abrirá el historial completo del paciente.',
      variant: 'default',
    },
  };
  
  if (!action || !appointment) return null;
  
  const config = actionLabels[action];
  const patientName = `${appointment.patients.nombre} ${appointment.patients.apellidos}`.trim();
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p><strong>Paciente:</strong> {patientName}</p>
            <p><strong>Cita:</strong> {new Date(appointment.fecha_hora_cita).toLocaleString()}</p>
            <p>{config.description}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={config.variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

// ==================== COMPONENTE PRINCIPAL ====================
export const PatientAdmission: React.FC = () => {
  // ==================== STATE ====================
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    action: AdmissionAction | null;
    appointment: AppointmentWithPatient | null;
  }>({
    isOpen: false,
    action: null,
    appointment: null,
  });
  
  // ==================== HOOKS ====================
  const {
    appointments,
    counts,
    isLoading,
    isError,
    error,
    isLoadingMore,
    hasMore,
    isUpdating,
    loadMore,
    refreshCurrentTab,
    updateAppointment,
  } = useAdmissionData(activeTab);
  
  const { isConnected, manualRefresh } = useAdmissionRealtime({
    enableToasts: true,
    enableSounds: false,
    autoRefresh: true,
  });
  
  // ==================== HANDLERS ====================
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);
  
  const handleAction = useCallback((action: AdmissionAction, appointment: AppointmentWithPatient) => {
    // Validar acción según business rules
    const validation = validateAction(action, appointment);
    
    if (!validation.valid) {
      // Mostrar error de validación
      return;
    }
    
    if (action === 'viewHistory') {
      // Abrir modal de historial directamente
      // TODO: Implementar modal de historial
      return;
    }
    
    if (action === 'reschedule') {
      // Abrir modal de reagendamiento
      // TODO: Implementar modal de reagendamiento
      return;
    }
    
    // Para otras acciones, mostrar confirmación
    setConfirmationModal({
      isOpen: true,
      action,
      appointment,
    });
  }, []);
  
  const handleConfirmAction = useCallback(() => {
    const { action, appointment } = confirmationModal;
    
    if (!action || !appointment) return;
    
    const newStatus = ACTION_TO_STATUS_MAP[action];
    
    if (!newStatus) return;
    
    const payload: AppointmentUpdatePayload = {
      appointmentId: appointment.id,
      newStatus,
      motivo_cambio: `Acción realizada desde admisión: ${action}`,
    };
    
    updateAppointment(payload);
    
    setConfirmationModal({
      isOpen: false,
      action: null,
      appointment: null,
    });
  }, [confirmationModal, updateAppointment]);
  
  const handleCloseConfirmation = useCallback(() => {
    setConfirmationModal({
      isOpen: false,
      action: null,
      appointment: null,
    });
  }, []);
  
  const handleRefresh = useCallback(() => {
    refreshCurrentTab();
    manualRefresh();
  }, [refreshCurrentTab, manualRefresh]);
  
  const handleNewPatientSuccess = useCallback(() => {
    // Cambiar a tab de hoy después de crear paciente
    setActiveTab('today');
    refreshCurrentTab();
  }, [refreshCurrentTab]);
  
  // ==================== RENDER CONTENT ====================
  const renderContent = useMemo(() => {
    if (isError) {
      return (
        <EmptyState
          icon={AlertCircle}
          title="Error al cargar datos"
          description={error?.message || 'Ocurrió un problema al cargar la información.'}
          action={
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          }
        />
      );
    }
    
    switch (activeTab) {
      case 'newPatient':
        return (
          <Suspense fallback={<div className="animate-pulse">Cargando formulario...</div>}>
            <NewPatientForm onSuccess={handleNewPatientSuccess} />
          </Suspense>
        );
      
      case 'today':
      case 'future':
      case 'past':
        return (
          <AppointmentsList
            appointments={appointments}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onAction={handleAction}
            onLoadMore={loadMore}
            emptyStateConfig={{
              today: {
                icon: CalendarCheck,
                title: 'No hay citas para hoy',
                description: 'Las citas programadas para hoy aparecerán aquí.',
              },
              future: {
                icon: CalendarClock,
                title: 'No hay citas próximas',
                description: 'Las citas futuras se mostrarán en esta sección.',
              },
              past: {
                icon: History,
                title: 'No hay historial',
                description: 'El historial de citas aparecerá aquí.',
              },
            }[activeTab]}
          />
        );
      
      default:
        return null;
    }
  }, [
    activeTab,
    appointments,
    isLoading,
    isLoadingMore,
    hasMore,
    isError,
    error,
    handleAction,
    loadMore,
    handleRefresh,
    handleNewPatientSuccess,
  ]);
  
  // ==================== RENDER ====================
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <AdmissionHeader
        isConnected={isConnected}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />
      
      {/* Navigation Tabs */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={counts}
        isLoading={isLoading}
      />
      
      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          {renderContent}
        </CardContent>
      </Card>
      
      {/* Confirmation Modal */}
      <ActionConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={handleCloseConfirmation}
        onConfirm={handleConfirmAction}
        action={confirmationModal.action}
        appointment={confirmationModal.appointment}
        isLoading={isUpdating}
      />
    </div>
  );
};

export default memo(PatientAdmission);