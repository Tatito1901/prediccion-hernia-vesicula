"use client"
import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  Activity, 
  FileText, 
  Clock, 
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Share2,
  Stethoscope,
  Users,
  TrendingUp,
  X
} from 'lucide-react';

// ===== SISTEMA DE DISEÑO UNIFICADO =====
const designTokens = {
  colors: {
    primary: {
      50: 'bg-blue-50 dark:bg-blue-950/20',
      100: 'bg-blue-100 dark:bg-blue-900/30',
      500: 'bg-blue-500 dark:bg-blue-600',
      600: 'bg-blue-600 dark:bg-blue-700',
      700: 'bg-blue-700 dark:bg-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800'
    },
    success: {
      50: 'bg-emerald-50 dark:bg-emerald-950/20',
      100: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800'
    },
    warning: {
      50: 'bg-amber-50 dark:bg-amber-950/20',
      100: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800'
    },
    error: {
      50: 'bg-red-50 dark:bg-red-950/20',
      100: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800'
    },
    neutral: {
      50: 'bg-slate-50 dark:bg-slate-800/50',
      100: 'bg-slate-100 dark:bg-slate-800',
      200: 'bg-slate-200 dark:bg-slate-700',
      text: 'text-slate-700 dark:text-slate-300',
      textMuted: 'text-slate-500 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-700'
    }
  },
  spacing: {
    card: 'p-4 lg:p-6',
    section: 'space-y-4 lg:space-y-6',
    element: 'gap-3 lg:gap-4'
  },
  typography: {
    heading: 'text-xl lg:text-2xl font-bold',
    subheading: 'text-base lg:text-lg font-semibold',
    body: 'text-sm lg:text-base',
    caption: 'text-xs lg:text-sm'
  },
  interactive: {
    button: 'h-9 lg:h-10 px-3 lg:px-4 text-sm lg:text-base',
    input: 'h-9 lg:h-10 px-3 text-sm lg:text-base',
    touchTarget: 'min-h-[44px] min-w-[44px]' // Cumple con estándares de accesibilidad
  }
};

// ===== TIPOS Y ENUMS =====
enum PatientStatus {
  PENDING = 'PENDIENTE_DE_CONSULTA',
  CONSULTED = 'CONSULTADO',
  OPERATED = 'OPERADO',
  NOT_OPERATED = 'NO_OPERADO',
  FOLLOW_UP = 'EN_SEGUIMIENTO',
  UNDECIDED = 'INDECISO'
}

interface Patient {
  id: string;
  nombre: string;
  apellidos: string;
  edad?: number;
  telefono?: string;
  email?: string;
  estado: PatientStatus;
  diagnostico?: string;
  fechaRegistro: string;
  encuestaCompletada: boolean;
}

// ===== UTILIDADES CENTRALIZADAS =====
const formatters = {
  name: (text: string) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
  date: (date: string | Date) => {
    if (!date) return 'Sin fecha';
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return 'Fecha inválida';
    
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `${diffDays}d`;
    
    return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  },
  phone: (phone: string) => phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3'),
  initials: (nombre: string, apellidos: string) => `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase()
};

const statusConfig = {
  [PatientStatus.PENDING]: {
    label: 'Pendiente',
    color: 'warning',
    icon: Clock,
    priority: 1
  },
  [PatientStatus.CONSULTED]: {
    label: 'Consultado',
    color: 'primary',
    icon: Stethoscope,
    priority: 3
  },
  [PatientStatus.OPERATED]: {
    label: 'Operado',
    color: 'success', 
    icon: Activity,
    priority: 5
  },
  [PatientStatus.NOT_OPERATED]: {
    label: 'No operado',
    color: 'error',
    icon: X,
    priority: 4
  },
  [PatientStatus.FOLLOW_UP]: {
    label: 'Seguimiento',
    color: 'primary',
    icon: Calendar,
    priority: 2
  },
  [PatientStatus.UNDECIDED]: {
    label: 'Indeciso',
    color: 'neutral',
    icon: Clock,
    priority: 3
  }
} as const;

// ===== COMPONENTES BASE OPTIMIZADOS =====
const Card = memo(({ children, className = '', ...props }: any) => (
  <div 
    className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm ${designTokens.colors.neutral.border} border ${className}`}
    {...props}
  >
    {children}
  </div>
));

const Button = memo(({ 
  variant = 'primary', 
  size = 'default', 
  children, 
  className = '', 
  ...props 
}: any) => {
  const variants = {
    primary: `${designTokens.colors.primary[600]} hover:${designTokens.colors.primary[700]} text-white`,
    secondary: `${designTokens.colors.neutral[100]} hover:${designTokens.colors.neutral[200]} ${designTokens.colors.neutral.text}`,
    ghost: `hover:${designTokens.colors.neutral[100]} ${designTokens.colors.neutral.text}`,
    outline: `border ${designTokens.colors.neutral.border} hover:${designTokens.colors.neutral[50]} ${designTokens.colors.neutral.text}`
  };
  
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    default: designTokens.interactive.button,
    lg: 'h-12 px-6 text-base'
  };
  
  return (
    <button 
      className={`
        inline-flex items-center justify-center rounded-lg font-medium transition-colors
        ${designTokens.interactive.touchTarget} ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
});

const Input = memo(({ className = '', ...props }: any) => (
  <input
    className={`
      ${designTokens.interactive.input} rounded-lg border ${designTokens.colors.neutral.border}
      bg-white dark:bg-slate-900 ${designTokens.colors.neutral.text}
      placeholder:${designTokens.colors.neutral.textMuted}
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      ${className}
    `}
    {...props}
  />
));

const Badge = memo(({ variant = 'default', children, className = '' }: any) => {
  const config = statusConfig[variant] || statusConfig[PatientStatus.PENDING];
  const colorClasses = designTokens.colors[config.color];
  
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
      ${colorClasses[50]} ${colorClasses.text} ${colorClasses.border} border
      ${className}
    `}>
      <config.icon className="w-3 h-3" />
      {children}
    </span>
  );
});

// ===== COMPONENTE PRINCIPAL OPTIMIZADO =====
const PatientManagement = () => {
  // Estado simplificado y optimizado
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PatientStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Datos de ejemplo optimizados
  const mockPatients: Patient[] = useMemo(() => [
    {
      id: '1',
      nombre: 'Juan',
      apellidos: 'Pérez García',
      edad: 45,
      telefono: '5551234567',
      email: 'juan.perez@email.com',
      estado: PatientStatus.PENDING,
      diagnostico: 'Hernia inguinal',
      fechaRegistro: '2024-01-15',
      encuestaCompletada: false
    },
    {
      id: '2',
      nombre: 'María',
      apellidos: 'González López',
      edad: 38,
      telefono: '5559876543',
      email: 'maria.gonzalez@email.com',
      estado: PatientStatus.CONSULTED,
      diagnostico: 'Colelitiasis',
      fechaRegistro: '2024-01-10',
      encuestaCompletada: true
    },
    {
      id: '3',
      nombre: 'Carlos',
      apellidos: 'Rodríguez Martín',
      edad: 52,
      telefono: '5555555555',
      email: 'carlos.rodriguez@email.com',
      estado: PatientStatus.OPERATED,
      diagnostico: 'Apendicitis',
      fechaRegistro: '2024-01-05',
      encuestaCompletada: true
    }
  ], []);
  
  // Filtrado y paginación optimizados con useMemo
  const filteredPatients = useMemo(() => {
    let filtered = mockPatients;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(patient => 
        patient.nombre.toLowerCase().includes(term) ||
        patient.apellidos.toLowerCase().includes(term) ||
        patient.telefono?.includes(term) ||
        patient.email?.toLowerCase().includes(term) ||
        patient.diagnostico?.toLowerCase().includes(term)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(patient => patient.estado === statusFilter);
    }
    
    return filtered;
  }, [mockPatients, searchTerm, statusFilter]);
  
  // Estadísticas optimizadas
  const stats = useMemo(() => {
    const total = mockPatients.length;
    const pending = mockPatients.filter(p => p.estado === PatientStatus.PENDING).length;
    const operated = mockPatients.filter(p => p.estado === PatientStatus.OPERATED).length;
    const surveyCompleted = mockPatients.filter(p => p.encuestaCompletada).length;
    
    return {
      total,
      pending,
      operated,
      surveyRate: total > 0 ? Math.round((surveyCompleted / total) * 100) : 0
    };
  }, [mockPatients]);
  
  // Handlers optimizados con useCallback
  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);
  
  const handleStatusFilter = useCallback((status: PatientStatus | 'all') => {
    setStatusFilter(status);
    setCurrentPage(1);
  }, []);
  
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  }, []);
  
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header con estadísticas */}
      <Card className="overflow-hidden">
        <div className={`${designTokens.spacing.card} bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className={designTokens.typography.heading}>Gestión de Pacientes</h1>
              <p className={`${designTokens.colors.neutral.textMuted} ${designTokens.typography.body} mt-1`}>
                Administra y da seguimiento a tus pacientes de manera eficiente
              </p>
            </div>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Paciente
            </Button>
          </div>
          
          {/* Estadísticas en grid responsivo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <StatCard
              icon={Users}
              label="Total Pacientes"
              value={stats.total}
              color="primary"
            />
            <StatCard
              icon={Clock}
              label="Pendientes"
              value={stats.pending}
              color="warning"
            />
            <StatCard
              icon={Activity}
              label="Operados"
              value={stats.operated}
              color="success"
            />
            <StatCard
              icon={FileText}
              label="Encuestas"
              value={`${stats.surveyRate}%`}
              color="primary"
            />
          </div>
        </div>
      </Card>
      
      {/* Controles de filtrado optimizados */}
      <Card>
        <div className={designTokens.spacing.card}>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Búsqueda principal */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar pacientes..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            
            {/* Filtros */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
                {showFilters ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
              </Button>
              
              <div className={`${showFilters ? 'flex' : 'hidden'} lg:flex gap-2 w-full lg:w-auto`}>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value as PatientStatus | 'all')}
                  className={`${designTokens.interactive.input} border ${designTokens.colors.neutral.border} rounded-lg`}
                >
                  <option value="all">Todos los estados</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                
                {(searchTerm || statusFilter !== 'all') && (
                  <Button variant="ghost" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Lista de pacientes optimizada */}
      <Card>
        <div className={designTokens.spacing.card}>
          {filteredPatients.length === 0 ? (
            <EmptyState onClearFilters={clearFilters} hasFilters={searchTerm || statusFilter !== 'all'} />
          ) : (
            <div className="space-y-4">
              {/* Vista móvil optimizada */}
              <div className="lg:hidden space-y-3">
                {filteredPatients.map((patient) => (
                  <MobilePatientCard
                    key={patient.id}
                    patient={patient}
                    onSelect={setSelectedPatient}
                  />
                ))}
              </div>
              
              {/* Vista desktop optimizada */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${designTokens.colors.neutral.border}`}>
                      <th className="text-left py-3 px-4 font-medium text-sm">Paciente</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Contacto</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Diagnóstico</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Estado</th>
                      <th className="text-left py-3 px-4 font-medium text-sm">Registro</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.map((patient) => (
                      <DesktopPatientRow
                        key={patient.id}
                        patient={patient}
                        onSelect={setSelectedPatient}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Card>
      
      {/* Modal de detalles */}
      {selectedPatient && (
        <PatientDetailsModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}
    </div>
  );
};

// ===== COMPONENTES AUXILIARES OPTIMIZADOS =====
const StatCard = memo(({ icon: Icon, label, value, color }: any) => {
  const colorClasses = designTokens.colors[color];
  
  return (
    <div className={`${colorClasses[50]} rounded-lg p-4 border ${colorClasses.border}`}>
      <div className="flex items-center justify-between">
        <div className={`${colorClasses[100]} p-2 rounded-lg`}>
          <Icon className={`w-4 h-4 ${colorClasses.text}`} />
        </div>
        <TrendingUp className="w-3 h-3 text-green-500" />
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold">{value}</div>
        <div className={`${designTokens.colors.neutral.textMuted} text-sm`}>{label}</div>
      </div>
    </div>
  );
});

const MobilePatientCard = memo(({ patient, onSelect }: any) => (
  <div 
    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    onClick={() => onSelect(patient)}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${designTokens.colors.primary[100]} flex items-center justify-center text-sm font-medium ${designTokens.colors.primary.text}`}>
          {formatters.initials(patient.nombre, patient.apellidos)}
        </div>
        <div>
          <div className="font-medium">{formatters.name(`${patient.nombre} ${patient.apellidos}`)}</div>
          <div className={`${designTokens.colors.neutral.textMuted} text-sm`}>
            {patient.edad ? `${patient.edad} años` : 'Edad no especificada'}
          </div>
        </div>
      </div>
      <Badge variant={patient.estado}>
        {statusConfig[patient.estado].label}
      </Badge>
    </div>
    
    <div className="space-y-2">
      {patient.telefono && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-slate-400" />
          <span>{formatters.phone(patient.telefono)}</span>
        </div>
      )}
      {patient.diagnostico && (
        <div className="flex items-center gap-2 text-sm">
          <Stethoscope className="w-4 h-4 text-slate-400" />
          <span>{patient.diagnostico}</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="w-4 h-4 text-slate-400" />
        <span>{formatters.date(patient.fechaRegistro)}</span>
      </div>
    </div>
  </div>
));

const DesktopPatientRow = memo(({ patient, onSelect }: any) => (
  <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
    <td className="py-4 px-4">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full ${designTokens.colors.primary[100]} flex items-center justify-center text-xs font-medium ${designTokens.colors.primary.text}`}>
          {formatters.initials(patient.nombre, patient.apellidos)}
        </div>
        <div>
          <div className="font-medium">{formatters.name(`${patient.nombre} ${patient.apellidos}`)}</div>
          <div className={`${designTokens.colors.neutral.textMuted} text-sm`}>
            {patient.edad ? `${patient.edad} años` : 'Edad no especificada'}
          </div>
        </div>
      </div>
    </td>
    <td className="py-4 px-4">
      <div className="space-y-1">
        {patient.telefono && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{formatters.phone(patient.telefono)}</span>
          </div>
        )}
        {patient.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-3 h-3 text-slate-400" />
            <span className="truncate max-w-[200px]">{patient.email}</span>
          </div>
        )}
      </div>
    </td>
    <td className="py-4 px-4">
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${designTokens.colors.neutral[100]} ${designTokens.colors.neutral.text}`}>
        <Stethoscope className="w-3 h-3" />
        {patient.diagnostico || 'Sin diagnóstico'}
      </span>
    </td>
    <td className="py-4 px-4">
      <Badge variant={patient.estado}>
        {statusConfig[patient.estado].label}
      </Badge>
    </td>
    <td className="py-4 px-4 text-sm">
      {formatters.date(patient.fechaRegistro)}
    </td>
    <td className="py-4 px-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => onSelect(patient)}>
          <Eye className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
    </td>
  </tr>
));

const EmptyState = memo(({ onClearFilters, hasFilters }: any) => (
  <div className="text-center py-12">
    <div className={`w-16 h-16 mx-auto ${designTokens.colors.neutral[100]} rounded-full flex items-center justify-center mb-4`}>
      <Users className={`w-8 h-8 ${designTokens.colors.neutral.textMuted}`} />
    </div>
    <h3 className="text-lg font-medium mb-2">
      {hasFilters ? 'No se encontraron pacientes' : 'No hay pacientes registrados'}
    </h3>
    <p className={`${designTokens.colors.neutral.textMuted} mb-4`}>
      {hasFilters 
        ? 'Intenta ajustar los filtros de búsqueda'
        : 'Comienza agregando tu primer paciente'
      }
    </p>
    {hasFilters ? (
      <Button variant="outline" onClick={onClearFilters}>
        Limpiar Filtros
      </Button>
    ) : (
      <Button>
        <Plus className="w-4 h-4 mr-2" />
        Agregar Paciente
      </Button>
    )}
  </div>
));

const PatientDetailsModal = memo(({ patient, onClose }: any) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Detalles del Paciente</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-6">
          {/* Información básica */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full ${designTokens.colors.primary[100]} flex items-center justify-center text-lg font-bold ${designTokens.colors.primary.text}`}>
              {formatters.initials(patient.nombre, patient.apellidos)}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {formatters.name(`${patient.nombre} ${patient.apellidos}`)}
              </h3>
              <p className={designTokens.colors.neutral.textMuted}>
                {patient.edad ? `${patient.edad} años` : 'Edad no especificada'}
              </p>
            </div>
          </div>
          
          {/* Información de contacto */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{patient.telefono ? formatters.phone(patient.telefono) : 'No especificado'}</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="truncate">{patient.email || 'No especificado'}</span>
              </div>
            </div>
          </div>
          
          {/* Información médica */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Estado</label>
              <div className="mt-1">
                <Badge variant={patient.estado}>
                  {statusConfig[patient.estado].label}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Diagnóstico</label>
              <p className="mt-1">{patient.diagnostico || 'Sin diagnóstico'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Fecha de Registro</label>
              <p className="mt-1">{formatters.date(patient.fechaRegistro)}</p>
            </div>
          </div>
          
          {/* Acciones */}
          <div className="flex gap-3 pt-4 border-t">
            <Button className="flex-1">
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline" className="flex-1">
              <Share2 className="w-4 h-4 mr-2" />
              Compartir
            </Button>
            <Button variant="outline" className="flex-1">
              <Calendar className="w-4 h-4 mr-2" />
              Agendar
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
));

export default PatientManagement;