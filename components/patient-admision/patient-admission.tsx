// components/patient-admision/patient-admission-optimized.tsx
'use client';

import React, { useState, useCallback, memo, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

// Hooks optimizados
import { 
  useAdmissionData, 
  useAppointmentActions,
  useRefreshAdmissionData 
} from '@/hooks/use-admission-data';

// Components optimizados
import AppointmentsList from './appointments-list';
import NewPatientForm from './new-patient-form';

// ==================== TIPOS ====================
type TabType = 'newPatient' | 'today' | 'future' | 'past';

type AppointmentAction = 
  | 'checkIn'
  | 'startConsult' 
  | 'complete'
  | 'cancel'
  | 'noShow'
  | 'reschedule'
  | 'viewHistory';

interface ConfirmationModal {
  isOpen: boolean;
  action: AppointmentAction | null;
  appointmentId: string | null;
  patientName: string;
}

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

// ==================== COMPONENTES INTERNOS ====================

// ✅ Tab de navegación optimizado
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
          className={`
            h-auto p-4 flex-col items-center space-y-2 relative
            transition-all duration-200 hover:scale-[1.02]
            ${isActive ? 'shadow-md ring-2 ring-offset-2' : 'hover:shadow-sm'}
            ${isActive ? `ring-${tab.color}-200` : ''}
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
              className={`text-xs min-w-[24px] h-6 ${isActive ? 'bg-white/20' : ''}`}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                count
              )}
            </Badge>
          )}
          
          <p className="text-xs text-muted-foreground hidden lg:block text-center leading-tight">
            {tab.description}
          </p>
        </Button>
      );
    })}
  </div>
));
TabNavigation.displayName = "TabNavigation";

// ✅ Header con información de conexión optimizado
const AdmissionHeader = memo<{
  onRefresh: () => void;
  isRefreshing: boolean;
  totalCounts: Record<TabType, number>;
}>(({ onRefresh, isRefreshing, totalCounts }) => {
  const totalAppointments = totalCounts.today + totalCounts.future + totalCounts.past;
  
  return (
    <Card className="mb-6 border-l-4 border-l-blue-500">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarCheck className="h-6 w-6 text-blue-600" />
              </div>
              Admisión de Pacientes
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              Gestione pacientes y citas desde un solo lugar
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* ✅ Estadísticas rápidas */}
            <div className="hidden md:flex items-center space-x-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg text-green-600">{totalCounts.today}</div>
                <div className="text-muted-foreground">Hoy</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-purple-600">{totalCounts.future}</div>
                <div className="text-muted-foreground">Próximas</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-blue-600">{totalAppointments}</div>
                <div className="text-muted-foreground">Total</div>
              </div>
            </div>
            
            {/* ✅ Botón de refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2"
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

// ✅ Modal de confirmación optimizado
const ActionConfirmationModal = memo<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: AppointmentAction | null;
  patientName: string;
  isLoading: boolean;
}>(({ isOpen, onClose, onConfirm, action, patientName, isLoading }) => {
  const actionConfig = useMemo(() => {
    const configs = {
      checkIn: {
        title: 'Marcar como Presente',
        description: 'El paciente será marcado como presente y podrá ser llamado para consulta.',
        confirmText: 'Marcar Presente',
        variant: 'default' as const,
      },
      startConsult: {
        title: 'Iniciar Consulta',
        description: 'Se iniciará la consulta médica para este paciente.',
        confirmText: 'Iniciar Consulta',
        variant: 'default' as const,
      },
      complete: {
        title: 'Completar Consulta',
        description: 'La consulta será marcada como completada.',
        confirmText: 'Completar',
        variant: 'default' as const,
      },
      cancel: {
        title: 'Cancelar Cita',
        description: 'Esta acción cancelará la cita médica. Esta acción no se puede deshacer.',
        confirmText: 'Cancelar Cita',
        variant: 'destructive' as const,
      },
      reschedule: {
        title: 'Reagendar Cita',
        description: 'Se abrirá el diálogo para reagendar esta cita.',
        confirmText: 'Reagendar',
        variant: 'default' as const,
      },
    };
    
    return action ? configs[action as keyof typeof configs] : null;
  }, [action]);

  if (!actionConfig) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{actionConfig.title}</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{patientName}</strong>
            <br />
            {actionConfig.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={actionConfig.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              actionConfig.confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
ActionConfirmationModal.displayName = "ActionConfirmationModal";

// ==================== COMPONENTE PRINCIPAL ====================
const PatientAdmission: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>({
    isOpen: false,
    action: null,
    appointmentId: null,
    patientName: '',
  });

  // ✅ Hooks optimizados
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

  const appointmentActions = useAppointmentActions();
  const { refreshAll } = useRefreshAdmissionData();

  // ==================== HANDLERS ====================
  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (activeTab === 'newPatient') {
      await refreshAll();
    } else {
      await refresh();
    }
  }, [activeTab, refresh, refreshAll]);

  const handleAction = useCallback((action: AppointmentAction, appointmentId: string) => {
    const appointment = appointments.find(app => app.id === appointmentId);
    const patientName = appointment?.patients 
      ? `${appointment.patients.nombre || ''} ${appointment.patients.apellidos || ''}`.trim()
      : 'Paciente';

    // ✅ Acciones que requieren confirmación
    const needsConfirmation = ['cancel', 'complete', 'checkIn'];
    
    if (needsConfirmation.includes(action)) {
      setConfirmationModal({
        isOpen: true,
        action,
        appointmentId,
        patientName,
      });
    } else {
      // ✅ Acciones directas
      executeAction(action, appointmentId);
    }
  }, [appointments]);

  const executeAction = useCallback(async (action: AppointmentAction, appointmentId: string) => {
    try {
      const statusMap = {
        checkIn: 'PRESENTE',
        startConsult: 'EN_CONSULTA', 
        complete: 'COMPLETADA',
        cancel: 'CANCELADA',
        noShow: 'NO_ASISTIO',
      };

      const newStatus = statusMap[action as keyof typeof statusMap];
      
      if (newStatus) {
        await appointmentActions.mutateAsync({
          appointmentId,
          newStatus,
          motivo_cambio: `Acción: ${action}`,
        });
      }
    } catch (error) {
      console.error('Error executing action:', error);
    }
  }, [appointmentActions]);

  const handleConfirmAction = useCallback(async () => {
    if (confirmationModal.action && confirmationModal.appointmentId) {
      await executeAction(confirmationModal.action, confirmationModal.appointmentId);
      setConfirmationModal({
        isOpen: false,
        action: null,
        appointmentId: null,
        patientName: '',
      });
    }
  }, [confirmationModal, executeAction]);

  const handleCloseConfirmation = useCallback(() => {
    setConfirmationModal({
      isOpen: false,
      action: null,
      appointmentId: null,
      patientName: '',
    });
  }, []);

  const handleNewPatientSuccess = useCallback(() => {
    // ✅ Cambiar a tab "today" después del éxito
    setActiveTab('today');
  }, []);

  // ==================== CONFIGURACIÓN DE EMPTY STATES ====================
  const emptyStateConfigs = useMemo(() => ({
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
  }), []);

  // ==================== RENDER CONTENT ====================
  const renderContent = useMemo(() => {
    switch (activeTab) {
      case 'newPatient':
        return (
          <NewPatientForm 
            onSuccess={handleNewPatientSuccess}
            onCancel={() => setActiveTab('today')}
          />
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
            onRefresh={refresh}
            emptyStateConfig={emptyStateConfigs[activeTab]}
            error={error}
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
    handleAction,
    loadMore,
    refresh,
    error,
    handleNewPatientSuccess,
    emptyStateConfigs,
  ]);
  
  // ==================== RENDER ====================
  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      {/* ✅ Header optimizado */}
      <AdmissionHeader
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        totalCounts={counts}
      />
      
      {/* ✅ Navigation Tabs optimizado */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={counts}
        isLoading={isLoading}
      />
      
      {/* ✅ Error global */}
      {isError && activeTab !== 'newPatient' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar los datos. 
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
      
      {/* ✅ Main Content */}
      <Card className="min-h-[600px]">
        <CardContent className="p-6">
          {renderContent}
        </CardContent>
      </Card>
      
      {/* ✅ Confirmation Modal optimizado */}
      <ActionConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={handleCloseConfirmation}
        onConfirm={handleConfirmAction}
        action={confirmationModal.action}
        patientName={confirmationModal.patientName}
        isLoading={appointmentActions.isPending}
      />
    </div>
  );
};

export default memo(PatientAdmission);