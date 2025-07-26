// components/admission/appointments-list.tsx - LISTA DE CITAS OPTIMIZADA
import React, { memo, useCallback, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Icons
import {
  MoreHorizontal,
  Clock,
  User,
  Phone,
  Calendar,
  MapPin,
  CheckCircle,
  PlayCircle,
  XCircle,
  RotateCcw,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

// Types and utilities
import type { 
  AppointmentWithPatient, 
  AdmissionAction, 
  AppointmentStatus
} from './admision-types';
import { STATUS_CONFIG } from './admision-types';
import { 
  validateAction, 
  getAvailableActions, 
  getNextSuggestedAction 
} from '@/lib/admission-business-rules';
import { format, formatDistanceToNow, isToday, isFuture, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

// ==================== TIPOS ====================

// Definición del tipo para la configuración de acciones para mejorar la seguridad de tipos
type ActionConfig = Record<AdmissionAction, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: 'default' | 'destructive';
}>;

interface AppointmentsListProps {
  appointments: AppointmentWithPatient[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onAction: (action: AdmissionAction, appointment: AppointmentWithPatient) => void;
  onLoadMore: () => void;
  emptyStateConfig?: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  };
}

interface AppointmentCardProps {
  appointment: AppointmentWithPatient;
  onAction: (action: AdmissionAction) => void;
  isHighlighted?: boolean;
}

// ==================== HELPERS ====================
const getAppointmentTimeInfo = (fechaHora: string) => {
  const date = new Date(fechaHora);
  const now = new Date();
  
  return {
    date,
    dateStr: format(date, 'dd/MM/yyyy', { locale: es }),
    timeStr: format(date, 'HH:mm'),
    relativeTime: formatDistanceToNow(date, { addSuffix: true, locale: es }),
    isToday: isToday(date),
    isFuture: isFuture(date),
    isPast: isPast(date),
    urgency: getTimeUrgency(date, now),
  };
};

const getTimeUrgency = (appointmentDate: Date, currentDate: Date): 'urgent' | 'soon' | 'normal' | 'late' => {
  const diffMinutes = (appointmentDate.getTime() - currentDate.getTime()) / (1000 * 60);
  
  if (diffMinutes < -30) return 'late';
  if (diffMinutes < 15) return 'urgent';
  if (diffMinutes < 60) return 'soon';
  return 'normal';
};

const getPatientInitials = (nombre: string, apellidos: string): string => {
  const firstInitial = (nombre || '').charAt(0).toUpperCase();
  const lastInitial = (apellidos || '').charAt(0).toUpperCase();
  return `${firstInitial}${lastInitial}` || 'P';
};

const getAvatarColor = (status: AppointmentStatus): string => {
  const colorMap: Record<AppointmentStatus, string> = {
    'PROGRAMADA': 'bg-blue-100 text-blue-700',
    'CONFIRMADA': 'bg-green-100 text-green-700',
    'EN_SALA': 'bg-yellow-100 text-yellow-700',
    'EN_CONSULTA': 'bg-orange-100 text-orange-700',
    'COMPLETADA': 'bg-emerald-100 text-emerald-700',
    'CANCELADA': 'bg-red-100 text-red-700',
    'NO_ASISTIO': 'bg-gray-100 text-gray-700',
    'REAGENDADA': 'bg-purple-100 text-purple-700',
  };
  
  return colorMap[status] || 'bg-gray-100 text-gray-700';
};

// ==================== COMPONENTES INTERNOS ====================

// Skeleton para loading states
const AppointmentCardSkeleton = memo(() => (
  <Card className="mb-3">
    <CardContent className="p-4">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-[200px]" />
          <Skeleton className="h-3 w-[150px]" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-6 w-[80px]" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </CardContent>
  </Card>
));

// Badge de estado con colores y animaciones
const StatusBadge = memo<{ status: AppointmentStatus; isLoading?: boolean }>(
  ({ status, isLoading }) => {
    const config = STATUS_CONFIG[status];
    
    return (
      <Badge 
        variant={config.color} 
        className={`
          flex items-center space-x-1 transition-all duration-200
          ${isLoading ? 'opacity-50' : ''}
        `}
      >
        {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        <span>{config.label}</span>
      </Badge>
    );
  }
);

// Información del paciente y cita
const AppointmentInfo = memo<{ 
  appointment: AppointmentWithPatient; 
  timeInfo: ReturnType<typeof getAppointmentTimeInfo>;
}>(({ appointment, timeInfo }) => {
  const patientName = `${appointment.patients.nombre} ${appointment.patients.apellidos}`.trim();
  
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center space-x-2 mb-1">
        <h3 className="font-medium text-sm truncate">{patientName}</h3>
        {appointment.es_primera_vez && (
          <Badge variant="outline" className="text-xs">Primera vez</Badge>
        )}
      </div>
      
      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>{timeInfo.timeStr}</span>
          {timeInfo.isToday && (
            <span className="text-blue-600 font-medium">
              ({timeInfo.relativeTime})
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <FileText className="h-3 w-3" />
          <span className="truncate">{appointment.motivo_cita}</span>
        </div>
        
        {appointment.patients.telefono && (
          <div className="flex items-center space-x-1">
            <Phone className="h-3 w-3" />
            <span>{appointment.patients.telefono}</span>
          </div>
        )}
      </div>
    </div>
  );
});

// Menú de acciones con validación de business rules
const ActionsMenu = memo<{
  appointment: AppointmentWithPatient;
  onAction: (action: AdmissionAction) => void;
  isLoading?: boolean;
}>(({ appointment, onAction, isLoading }) => {
  const availableActions = useMemo(
    () => getAvailableActions(appointment),
    [appointment]
  );
  
  const suggestedAction = useMemo(
    () => getNextSuggestedAction(appointment),
    [appointment]
  );
  
  const actionConfig: ActionConfig = {
    checkIn: { icon: CheckCircle, label: 'Marcar presente' },
    startConsult: { icon: PlayCircle, label: 'Iniciar consulta' },
    complete: { icon: CheckCircle, label: 'Completar' },
    cancel: { icon: XCircle, label: 'Cancelar', variant: 'destructive' },
    noShow: { icon: AlertTriangle, label: 'No asistió', variant: 'destructive' },
    reschedule: { icon: RotateCcw, label: 'Reagendar' },
    viewHistory: { icon: FileText, label: 'Ver historial' },
  };
  
  const handleAction = useCallback((action: AdmissionAction) => {
    const validation = validateAction(action, appointment);
    
    if (!validation.valid) {
      // TODO: Mostrar toast con error de validación
      console.warn('Action not valid:', validation.reason);
      return;
    }
    
    onAction(action);
  }, [appointment, onAction]);
  
  if (availableActions.length === 0) {
    return null;
  }
  
  // Si hay una acción sugerida y es la única disponible, mostrarla como botón principal
  if (availableActions.length === 1 && suggestedAction && availableActions.includes(suggestedAction)) {
    const config = actionConfig[suggestedAction as AdmissionAction];
    const Icon = config.icon;
    
    return (
      <Button
        size="sm"
        variant={config.variant || 'default'}
        onClick={() => handleAction(suggestedAction)}
        disabled={isLoading}
        className="flex items-center space-x-1"
      >
        <Icon className="h-3 w-3" />
        <span className="hidden sm:inline">{config.label}</span>
      </Button>
    );
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={isLoading}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menú de acciones</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-48">
        {/* Acción sugerida primero */}
        {suggestedAction && availableActions.includes(suggestedAction) && (
          <>
            {(() => {
              const config = actionConfig[suggestedAction as AdmissionAction];
              const Icon = config.icon;
              return (
                <DropdownMenuItem
                  onClick={() => handleAction(suggestedAction)}
                  className="flex items-center space-x-2 font-medium"
                >
                  <Icon className="h-4 w-4" />
                  <span>{config.label}</span>
                  <Badge variant="outline" className="ml-auto text-xs">
                    Sugerido
                  </Badge>
                </DropdownMenuItem>
              );
            })()}
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Otras acciones */}
        {availableActions
          .filter(action => action !== suggestedAction)
          .map((action: AdmissionAction) => {
            const config = actionConfig[action];
            const Icon = config.icon;
            
            return (
              <DropdownMenuItem
                key={action}
                onClick={() => handleAction(action)}
                className={`
                  flex items-center space-x-2
                  ${config.variant === 'destructive' ? 'text-destructive' : ''}
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{config.label}</span>
              </DropdownMenuItem>
            );
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

// Card individual de cita
const AppointmentCard = memo<AppointmentCardProps>(({ appointment, onAction, isHighlighted }) => {
  const timeInfo = useMemo(
    () => getAppointmentTimeInfo(appointment.fecha_hora_cita),
    [appointment.fecha_hora_cita]
  );
  
  const initials = useMemo(
    () => getPatientInitials(appointment.patients.nombre, appointment.patients.apellidos),
    [appointment.patients.nombre, appointment.patients.apellidos]
  );
  
  const avatarColor = useMemo(
    () => getAvatarColor(appointment.estado_cita),
    [appointment.estado_cita]
  );
  
  const urgencyStyle = useMemo(() => {
    switch (timeInfo.urgency) {
      case 'urgent':
        return 'border-l-4 border-l-red-500 bg-red-50/50';
      case 'soon':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50/50';
      case 'late':
        return 'border-l-4 border-l-gray-500 bg-gray-50/50';
      default:
        return '';
    }
  }, [timeInfo.urgency]);
  
  return (
    <Card className={`
      mb-3 transition-all duration-200 hover:shadow-md
      ${isHighlighted ? 'ring-2 ring-blue-500 shadow-md' : ''}
      ${urgencyStyle}
    `}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <Avatar className={`h-12 w-12 ${avatarColor}`}>
            <AvatarFallback className="text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          {/* Información */}
          <AppointmentInfo appointment={appointment} timeInfo={timeInfo} />
          
          {/* Estado y acciones */}
          <div className="flex flex-col items-end space-y-2">
            <StatusBadge status={appointment.estado_cita} />
            <ActionsMenu
              appointment={appointment}
              onAction={onAction}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// ==================== COMPONENTE PRINCIPAL ====================
export const AppointmentsList: React.FC<AppointmentsListProps> = memo(({
  appointments,
  isLoading,
  isLoadingMore,
  hasMore,
  onAction,
  onLoadMore,
  emptyStateConfig,
}) => {
  const handleAction = useCallback((action: AdmissionAction, appointment: AppointmentWithPatient) => {
    onAction(action, appointment);
  }, [onAction]);
  
  // Loading inicial
  if (isLoading && appointments.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <AppointmentCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  // Estado vacío
  if (!isLoading && appointments.length === 0) {
    return emptyStateConfig ? (
      <EmptyState
        icon={emptyStateConfig.icon}
        title={emptyStateConfig.title}
        description={emptyStateConfig.description}
      />
    ) : (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No hay citas para mostrar</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Lista de citas */}
      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onAction={(action) => handleAction(action, appointment)}
        />
      ))}
      
      {/* Botón de cargar más */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center space-x-2"
          >
            {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{isLoadingMore ? 'Cargando...' : 'Cargar más'}</span>
          </Button>
        </div>
      )}
      
      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <AppointmentCardSkeleton key={`loading-${i}`} />
          ))}
        </div>
      )}
    </div>
  );
});

AppointmentsList.displayName = 'AppointmentsList';
export default AppointmentsList;