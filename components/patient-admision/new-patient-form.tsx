// components/patient-admission/new-patient-form.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addDays, isSunday, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
// Icons
import {
  CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle,
  Loader2,
  AlertCircle,
  FileText,
  Search,
} from 'lucide-react';
// Imports
import type { 
  NewPatientFormProps, 
  AdmissionPayload
} from './admision-types';
import { 
  DIAGNOSIS_DISPLAY_VALUES,
  type DiagnosisDisplay,
  DiagnosisDisplayToDbMap,
} from '@/lib/validation/enums';
import { NewPatientSchema } from './admision-types';
import { useAdmitPatient } from './actions';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { useAppointmentsByDate } from '@/hooks/use-appointments';
import { useLeads } from '@/hooks/use-leads';
import { useUnifiedPatientData } from '@/hooks/use-unified-patient-data';
import { useDebounce } from '@/hooks/use-debounce';
import type { Patient, Lead } from '@/lib/types';

// Configuration
const diagnosisOptions = DIAGNOSIS_DISPLAY_VALUES.map((value) => ({ value, label: value }));

const TIME_SLOTS = [
  { value: '09:00', label: '09:00' },
  { value: '09:30', label: '09:30' },
  { value: '10:00', label: '10:00' },
  { value: '10:30', label: '10:30' },
  { value: '11:00', label: '11:00' },
  { value: '11:30', label: '11:30' },
  { value: '12:00', label: '12:00' },
  { value: '12:30', label: '12:30' },
  { value: '13:00', label: '13:00' },
  { value: '13:30', label: '13:30' },
  { value: '14:00', label: '14:00' },
  { value: '14:30', label: '14:30' },
];

type FormData = {
  // Required fields
  nombre: string;
  apellidos: string;
  diagnostico_principal: DiagnosisDisplay;
  fechaConsulta: Date;
  horaConsulta: string;
  // Optional fields
  telefono?: string;
  email?: string;
  edad?: number;
  // Demographics
  fecha_nacimiento?: string;
  genero?: 'Masculino' | 'Femenino' | 'Otro';
  // Location
  ciudad?: string;
  estado?: string;
  // Emergency contact
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  // Medical/Admin
  antecedentes_medicos?: string;
  numero_expediente?: string;
  seguro_medico?: string;
  // Marketing/Origin
  marketing_source?: string;
  creation_source?: string;
  lead_id?: string;
  // Medical fields
  comentarios_registro?: string;
  probabilidad_cirugia?: number;
  doctor_id?: string;
};

// Utilities
const isValidDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 90);
  const isPast = isBefore(date, today);
  const isAfterMax = isBefore(maxDate, date);
  return !isPast && !isAfterMax && !isSunday(date);
};

// Section Header Component
const SectionHeader = ({ icon: Icon, title, badge }: { 
  icon: React.ElementType; 
  title: string; 
  badge?: React.ReactNode;
}) => (
  <div className="flex items-center gap-2 py-2">
    <Icon className="h-4 w-4" />
    <h3 className="text-lg font-medium">{title}</h3>
    {badge}
  </div>
);

// Search Result Item
const SearchResultItem = ({ 
  item, 
  onSelect 
}: { 
  item: { 
    kind: 'patient' | 'lead'; 
    id: string; 
    title: string; 
    subtitle?: string 
  }; 
  onSelect: () => void;
}) => (
  <div
    className="p-3 hover:bg-accent cursor-pointer rounded-sm"
    onMouseDown={(e) => {
      e.preventDefault();
      onSelect();
    }}
  >
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium text-sm">{item.title}</div>
        {item.subtitle && (
          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
        )}
      </div>
      <Badge variant={item.kind === 'patient' ? 'default' : 'outline'} className="text-xs">
        {item.kind === 'patient' ? 'Paciente' : 'Lead'}
      </Badge>
    </div>
  </div>
);

const NewPatientForm: React.FC<NewPatientFormProps> = ({ 
  onSuccess, 
  onCancel, 
  className 
}) => {
  // Local states
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const admissionMutation = useAdmitPatient();
  
  // Autocomplete states and queries
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const leadsQuery = useLeads({
    page: 1,
    pageSize: 5,
    search: debouncedSearch,
    enabled: debouncedSearch.length >= 2,
  });
  
  const patientSearch = useUnifiedPatientData({
    fetchEssentialData: false,
    page: 1,
    pageSize: 5,
    search: debouncedSearch,
  });
  
  const isSearching = leadsQuery.isLoading || patientSearch.isLoading;
  
  const combinedResults = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) return [];
    
    const leads = leadsQuery.data?.data ?? [];
    const patients = patientSearch.paginatedPatients ?? [];
    
    const patientItems = patients.map((p: Patient) => ({
      kind: 'patient' as const,
      id: p.id,
      title: `${p.nombre ?? ''} ${p.apellidos ?? ''}`.trim() || 'Paciente sin nombre',
      subtitle: p.telefono || p.email || undefined,
      data: p,
    }));
    
    const leadItems = leads.map((l: Lead) => ({
      kind: 'lead' as const,
      id: l.id,
      title: l.full_name || 'Lead sin nombre',
      subtitle: l.phone_number || l.email || undefined,
      data: l,
    }));
    
    return [...patientItems, ...leadItems];
  }, [debouncedSearch, leadsQuery.data, patientSearch.paginatedPatients]);
  
  // Appointments for selected date
  const selectedDateISO = useMemo(() => (
    selectedDate ? selectedDate.toISOString().split('T')[0] : undefined
  ), [selectedDate]);
  
  const { data: appointmentsForDay = [] } = useAppointmentsByDate(selectedDateISO);
  
  const occupiedTimes = useMemo(() => {
    const blocked = new Set<string>();
    const nonBlockingStatuses = new Set(['CANCELADA', 'COMPLETADA', 'NO_ASISTIO']);
    
    appointmentsForDay.forEach((apt: any) => {
      const status = apt?.estado_cita as string | undefined;
      if (!status || nonBlockingStatuses.has(status)) return;
      try {
        const hhmm = format(new Date(apt.fecha_hora_cita), 'HH:mm');
        blocked.add(hhmm);
      } catch { /* ignore parse errors */ }
    });
    
    return blocked;
  }, [appointmentsForDay]);
  
  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(NewPatientSchema),
    defaultValues: {
      nombre: '',
      apellidos: '',
      diagnostico_principal: 'HERNIA INGUINAL',
      fechaConsulta: undefined,
      horaConsulta: '09:00',
      telefono: '',
      email: '',
      edad: undefined,
      fecha_nacimiento: '',
      genero: undefined,
      ciudad: '',
      estado: '',
      contacto_emergencia_nombre: '',
      contacto_emergencia_telefono: '',
      antecedentes_medicos: '',
      numero_expediente: '',
      seguro_medico: '',
      marketing_source: '',
      creation_source: 'admision_form',
      lead_id: undefined,
      comentarios_registro: '',
      probabilidad_cirugia: 0.5,
      doctor_id: undefined,
    },
  });
  
  // Submit handler
  const onSubmit = useCallback(async (data: FormData) => {
    try {
      const payload: AdmissionPayload = {
        nombre: data.nombre.trim(),
        apellidos: data.apellidos.trim(),
        diagnostico_principal: DiagnosisDisplayToDbMap[data.diagnostico_principal],
        fecha_hora_cita: (() => {
          const [hh, mm] = (data.horaConsulta || '09:00').split(':').map(Number);
          const d = new Date(data.fechaConsulta);
          d.setHours(hh, mm, 0, 0);
          return d.toISOString();
        })(),
        motivos_consulta: [`Primera consulta - ${diagnosisOptions.find(d => d.value === data.diagnostico_principal)?.label}`],
        telefono: data.telefono?.trim() || undefined,
        email: data.email?.trim() || undefined,
        edad: data.edad,
        fecha_nacimiento: data.fecha_nacimiento?.trim() || undefined,
        genero: data.genero || undefined,
        ciudad: data.ciudad?.trim() || undefined,
        estado: data.estado?.trim() || undefined,
        contacto_emergencia_nombre: data.contacto_emergencia_nombre?.trim() || undefined,
        contacto_emergencia_telefono: data.contacto_emergencia_telefono?.trim() || undefined,
        antecedentes_medicos: data.antecedentes_medicos?.trim() || undefined,
        numero_expediente: data.numero_expediente?.trim() || undefined,
        seguro_medico: data.seguro_medico?.trim() || undefined,
        marketing_source: data.marketing_source?.trim() || undefined,
        creation_source: data.creation_source?.trim() || 'admision_form',
        lead_id: data.lead_id || undefined,
        comentarios_registro: data.comentarios_registro?.trim() || undefined,
        probabilidad_cirugia: data.probabilidad_cirugia,
        doctor_id: data.doctor_id,
      };
      
      const result = await admissionMutation.mutateAsync(payload);
      form.reset();
      setSelectedDate(undefined);
      onSuccess?.(result);
    } catch (error) {
      console.error('Submit error:', error);
    }
  }, [admissionMutation, form, onSuccess]);
  
  // Handlers
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date && isValidDate(date)) {
      setSelectedDate(date);
      form.setValue('horaConsulta', undefined as any, { shouldValidate: true });
      form.setValue('fechaConsulta', date, { shouldValidate: true });
      setShowDatePicker(false);
    }
  }, [form]);
  
  const handleCancel = useCallback(() => {
    form.reset();
    setSelectedDate(undefined);
    onCancel?.();
  }, [form, onCancel]);
  
  const handlePhoneChange = useCallback((field: any, value: string) => {
    const formatted = formatPhoneNumber(value);
    field.onChange(formatted);
  }, []);
  
  const fillFromLead = useCallback((lead: Lead) => {
    const parts = (lead.full_name || '').trim().split(/\s+/);
    const nombre = parts[0] || '';
    const apellidos = parts.slice(1).join(' ');
    
    form.setValue('nombre', nombre, { shouldValidate: true });
    form.setValue('apellidos', apellidos, { shouldValidate: true });
    if (lead.phone_number) 
      form.setValue('telefono', formatPhoneNumber(lead.phone_number), { shouldValidate: true });
    if (lead.email) 
      form.setValue('email', lead.email, { shouldValidate: true });
    form.setValue('lead_id', lead.id, { shouldValidate: true });
    if ((lead as any).notes) {
      form.setValue('comentarios_registro', (lead as any).notes as string, { shouldValidate: false });
    }
  }, [form]);
  
  const fillFromPatient = useCallback((patient: Patient) => {
    form.setValue('nombre', patient.nombre ?? '', { shouldValidate: true });
    form.setValue('apellidos', patient.apellidos ?? '', { shouldValidate: true });
    if (patient.telefono) 
      form.setValue('telefono', formatPhoneNumber(patient.telefono), { shouldValidate: true });
    if (patient.email) 
      form.setValue('email', patient.email, { shouldValidate: true });
    if (typeof patient.edad === 'number') 
      form.setValue('edad', patient.edad, { shouldValidate: false });
    if (patient.ciudad) 
      form.setValue('ciudad', patient.ciudad, { shouldValidate: false });
    if (patient.estado) 
      form.setValue('estado', patient.estado, { shouldValidate: false });
    if (patient.contacto_emergencia_nombre) 
      form.setValue('contacto_emergencia_nombre', patient.contacto_emergencia_nombre, { shouldValidate: false });
    if (patient.contacto_emergencia_telefono) 
      form.setValue('contacto_emergencia_telefono', formatPhoneNumber(patient.contacto_emergencia_telefono), { shouldValidate: false });
    if (patient.antecedentes_medicos) 
      form.setValue('antecedentes_medicos', patient.antecedentes_medicos, { shouldValidate: false });
    if (patient.seguro_medico) 
      form.setValue('seguro_medico', patient.seguro_medico, { shouldValidate: false });
    if (patient.numero_expediente) 
      form.setValue('numero_expediente', patient.numero_expediente, { shouldValidate: false });
    if (patient.genero) 
      form.setValue('genero', patient.genero as any, { shouldValidate: false });
    if (patient.fecha_nacimiento) 
      form.setValue('fecha_nacimiento', patient.fecha_nacimiento as any, { shouldValidate: false });
  }, [form]);
  
  const handleSelectResult = useCallback((item: any) => {
    try {
      if (item.kind === 'lead') fillFromLead(item.data as Lead);
      if (item.kind === 'patient') fillFromPatient(item.data as Patient);
      setSearchTerm(item.title);
      setShowSearch(false);
    } catch (e) {
      console.error('Error applying selection', e);
    }
  }, [fillFromLead, fillFromPatient]);
  
  // Computed values
  const isLoading = admissionMutation.isPending;
  const hasErrors = Object.keys(form.formState.errors).length > 0;
  
  return (
    <Card className={cn("w-full max-w-4xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          Registro de Nuevo Paciente
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Complete la información del paciente y programe su primera consulta
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Search Section */}
            <div className="space-y-3">
              <SectionHeader 
                icon={Search} 
                title="Buscar paciente o lead" 
                badge={<Badge variant="secondary" className="text-xs">Autocomplete</Badge>} 
              />
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre, teléfono o email"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setShowSearch(true)}
                    onBlur={() => setTimeout(() => setShowSearch(false), 150)}
                    className="pl-10"
                  />
                </div>
                {showSearch && debouncedSearch.length >= 2 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                    {isSearching ? (
                      <div className="p-4 flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" /> 
                        <span>Buscando...</span>
                      </div>
                    ) : combinedResults.length > 0 ? (
                      <ScrollArea className="h-64">
                        <div className="p-1">
                          {combinedResults.map((item) => (
                            <SearchResultItem 
                              key={`${item.kind}:${item.id}`} 
                              item={item} 
                              onSelect={() => handleSelectResult(item)} 
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Sin resultados
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Escribe al menos 2 caracteres para buscar
              </p>
            </div>

            {/* Personal Information */}
            <div className="space-y-4">
              <SectionHeader icon={User} title="Información Personal" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apellidos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellidos *</FormLabel>
                      <FormControl>
                        <Input placeholder="Apellidos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Teléfono"
                          {...field}
                          onChange={(e) => handlePhoneChange(field, e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="edad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="Edad"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Demographics */}
            <div className="space-y-4">
              <SectionHeader icon={User} title="Información Demográfica" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fecha_nacimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="genero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Género</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Género" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Femenino">Femenino</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4">
              <SectionHeader icon={Mail} title="Información de Ubicación" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ciudad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input placeholder="Ciudad" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado/Provincia</FormLabel>
                      <FormControl>
                        <Input placeholder="Estado" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4">
              <SectionHeader icon={Phone} title="Contacto de Emergencia" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contacto_emergencia_nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Contacto</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del contacto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contacto_emergencia_telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono de Contacto</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Teléfono del contacto"
                          {...field}
                          onChange={(e) => handlePhoneChange(field, e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Medical Information */}
            <div className="space-y-4">
              <SectionHeader icon={FileText} title="Información Médica" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="diagnostico_principal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diagnóstico Principal *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Diagnóstico" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {diagnosisOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="probabilidad_cirugia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probabilidad de Cirugía (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          max="100"
                          placeholder="50"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) / 100 : undefined)}
                          value={field.value ? Math.round(field.value * 100) : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="comentarios_registro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentarios Adicionales</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Comentarios..."
                        {...field}
                        className="min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="antecedentes_medicos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Antecedentes Médicos</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Antecedentes..."
                          {...field}
                          className="min-h-[60px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="seguro_medico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seguro Médico</FormLabel>
                      <FormControl>
                        <Input placeholder="Seguro médico" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="numero_expediente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Expediente</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de expediente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Marketing/Origin */}
            <div className="space-y-4">
              <SectionHeader icon={AlertCircle} title="Información de Origen" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="marketing_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuente de Marketing</FormLabel>
                      <FormControl>
                        <Input placeholder="Fuente de marketing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="creation_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuente de Creación</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Fuente de creación"
                          {...field}
                          disabled
                          className="bg-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Appointment Scheduling */}
            <div className="space-y-4">
              <SectionHeader icon={CalendarIcon} title="Programar Primera Consulta" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fechaConsulta"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Consulta *</FormLabel>
                      <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal w-full",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={handleDateSelect}
                            disabled={(date) => !isValidDate(date)}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="horaConsulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Consulta *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedDate}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedDate ? "Seleccionar hora" : "Fecha primero"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIME_SLOTS.map((slot) => {
                            const disabled = occupiedTimes.has(slot.value);
                            return (
                              <SelectItem 
                                key={slot.value} 
                                value={slot.value} 
                                disabled={disabled}
                                className="py-2"
                              >
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  <span>{slot.label}</span>
                                  {disabled && (
                                    <span className="text-xs text-muted-foreground">(Ocupado)</span>
                                  )}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Errors and Actions */}
            {hasErrors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Por favor, corrija los errores antes de continuar.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={isLoading}
                className="sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || hasErrors}
                className="sm:flex-1 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Registrar Paciente
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default NewPatientForm;