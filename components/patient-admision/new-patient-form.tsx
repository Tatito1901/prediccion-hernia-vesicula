// components/patient-admision/new-patient-form.tsx

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
} from 'lucide-react';

// ✅ IMPORTS CORREGIDOS - usando tipos unificados
import type { 
  NewPatientFormProps, 
  AdmissionPayload
} from './admision-types';
import { 
  DIAGNOSIS_DISPLAY_VALUES,
  type DiagnosisDisplay,
  DiagnosisDisplayToDbMap,
  DiagnosisDbToDisplayMap,
  type DbDiagnosis
} from '@/lib/validation/enums';

// ✅ Schema importado como valor para zodResolver
import { NewPatientSchema } from './admision-types';

// ✅ Hook corregido para admisión
import { useAdmitPatient } from './actions';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { useAppointmentsByDate } from '@/hooks/use-appointments';
import { useLeads } from '@/hooks/use-leads';
import { useUnifiedPatientData } from '@/hooks/use-unified-patient-data';
import { useDebounce } from '@/hooks/use-debounce';
import type { Patient, Lead } from '@/lib/types';

// ==================== CONFIGURACIÓN ====================

// ✅ Opciones de diagnóstico centralizadas desde enums (display values)
const diagnosisOptions = DIAGNOSIS_DISPLAY_VALUES.map((value) => ({ value, label: value }));

// ✅ Horarios disponibles (09:00 - 14:30 cada 30 min) — backend valida hour < 15
const TIME_SLOTS = (() => {
  const slots: { value: string; label: string }[] = [];
  let hour = 9;
  let minute = 0;
  while (hour < 15) {
    const hh = hour.toString().padStart(2, '0');
    const mm = minute.toString().padStart(2, '0');
    const time = `${hh}:${mm}`;
    slots.push({ value: time, label: time });
    minute += 30;
    if (minute >= 60) { minute = 0; hour += 1; }
  }
  return slots;
})();

// ==================== TIPOS PARA EL FORMULARIO ====================
// ✅ ACTUALIZADO para incluir todos los campos del nuevo esquema
type FormData = {
  // Campos básicos requeridos
  nombre: string;
  apellidos: string;
  diagnostico_principal: DiagnosisDisplay;
  fechaConsulta: Date;
  horaConsulta: string;
  
  // Campos básicos opcionales
  telefono?: string;
  email?: string;
  edad?: number;
  
  // ✅ NUEVOS CAMPOS DEMOGRÁFICOS
  fecha_nacimiento?: string;
  genero?: 'Masculino' | 'Femenino' | 'Otro';
  
  // ✅ NUEVOS CAMPOS DE UBICACIÓN
  ciudad?: string;
  estado?: string;
  
  // ✅ NUEVOS CAMPOS DE CONTACTO DE EMERGENCIA
  contacto_emergencia_nombre?: string;
  contacto_emergencia_telefono?: string;
  
  // ✅ NUEVOS CAMPOS MÉDICOS Y ADMINISTRATIVOS
  antecedentes_medicos?: string;
  numero_expediente?: string;
  seguro_medico?: string;
  
  // ✅ NUEVOS CAMPOS DE ORIGEN Y MARKETING
  marketing_source?: string;
  creation_source?: string;
  lead_id?: string;
  
  // Campos médicos
  comentarios_registro?: string;
  probabilidad_cirugia?: number;
  doctor_id?: string;
};

// ==================== UTILIDADES ====================
const isValidDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 90); // Máximo 90 días en el futuro
  // ❗️Solo se bloquea domingo. Lunes-Sábado permitido.
  const isPast = isBefore(date, today);
  const isAfterMax = isBefore(maxDate, date);
  return !isPast && !isAfterMax && !isSunday(date);
};

// ==================== COMPONENTE PRINCIPAL ====================
const NewPatientForm: React.FC<NewPatientFormProps> = ({ 
  onSuccess, 
  onCancel, 
  className 
}) => {
  // ✅ ESTADOS LOCALES
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ✅ HOOK DE ADMISIÓN CORREGIDO
  const admissionMutation = useAdmitPatient();

  // ✅ AUTOCOMPLETE: estado y consultas
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const leadsQuery = useLeads({
    page: 1,
    pageSize: 5,
    search: debouncedSearch,
    enabled: debouncedSearch.length >= 2,
  });


  // Nota: este hook no acepta `enabled`, pero es eficiente y devuelve paginados
  const patientSearch = useUnifiedPatientData({
    fetchEssentialData: false,
    page: 1,
    pageSize: 5,
    search: debouncedSearch,
  });

  const isSearching = leadsQuery.isLoading || patientSearch.isLoading;

  type SearchItem = {
    kind: 'patient' | 'lead';
    id: string;
    title: string;
    subtitle?: string;
    data: any;
  };

  const combinedResults = useMemo<SearchItem[]>(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) return [];
    const leads = leadsQuery.data?.data ?? [];
    const patients = patientSearch.paginatedPatients ?? [];

    const patientItems: SearchItem[] = patients.map((p: Patient) => ({
      kind: 'patient',
      id: p.id,
      title: `${p.nombre ?? ''} ${p.apellidos ?? ''}`.trim() || 'Paciente sin nombre',
      subtitle: p.telefono || p.email || undefined,
      data: p,
    }));

    const leadItems: SearchItem[] = leads.map((l: Lead) => ({
      kind: 'lead',
      id: l.id,
      title: l.full_name || 'Lead sin nombre',
      subtitle: l.phone_number || l.email || undefined,
      data: l,
    }));

    // Pacientes primero, luego leads
    return [...patientItems, ...leadItems];
  }, [debouncedSearch, leadsQuery.data, patientSearch.paginatedPatients]);

  

  // ✅ Citas del día seleccionado para bloquear horarios ocupados
  const selectedDateISO = useMemo(() => (
    selectedDate ? selectedDate.toISOString().split('T')[0] : undefined
  ), [selectedDate]);

  const { data: appointmentsForDay = [], isLoading: isLoadingSlots } = useAppointmentsByDate(selectedDateISO);

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

  // ✅ FORMULARIO CON VALIDACIÓN CORREGIDA Y CAMPOS COMPLETOS
  const form = useForm<FormData>({
    resolver: zodResolver(NewPatientSchema),
    defaultValues: {
      // Campos básicos requeridos
      nombre: '',
      apellidos: '',
      diagnostico_principal: 'HERNIA INGUINAL',
      fechaConsulta: undefined,
      horaConsulta: '09:00',
      
      // Campos básicos opcionales
      telefono: '',
      email: '',
      edad: undefined,
      
      // ✅ NUEVOS CAMPOS DEMOGRÁFICOS
      fecha_nacimiento: '',
      genero: undefined,
      
      // ✅ NUEVOS CAMPOS DE UBICACIÓN
      ciudad: '',
      estado: '',
      
      // ✅ NUEVOS CAMPOS DE CONTACTO DE EMERGENCIA
      contacto_emergencia_nombre: '',
      contacto_emergencia_telefono: '',
      
      // ✅ NUEVOS CAMPOS MÉDICOS Y ADMINISTRATIVOS
      antecedentes_medicos: '',
      numero_expediente: '',
      seguro_medico: '',
      
      // ✅ NUEVOS CAMPOS DE ORIGEN Y MARKETING
      marketing_source: '',
      creation_source: 'admision_form', // Valor por defecto
      lead_id: undefined,
      
      // Campos médicos
      comentarios_registro: '',
      probabilidad_cirugia: 0.5,
      doctor_id: undefined,
    },
  });

  // ✅ SUBMIT HANDLER CORREGIDO
  const onSubmit = useCallback(async (data: FormData) => {
    try {
      console.log('📝 [NewPatientForm] Submitting form data:', data);

      // ✅ Transformar datos al formato esperado por la API (COMPLETO con nuevos campos)
      const payload: AdmissionPayload = {
        // Campos básicos requeridos
        nombre: data.nombre.trim(),
        apellidos: data.apellidos.trim(),
        diagnostico_principal: DiagnosisDisplayToDbMap[data.diagnostico_principal],
        fecha_hora_cita: (() => {
          // Construir Date con fecha seleccionada y HH:MM locales, luego serializar a ISO (con zona horaria)
          const [hh, mm] = (data.horaConsulta || '09:00').split(':').map((v) => parseInt(v, 10));
          const d = new Date(data.fechaConsulta);
          d.setHours(hh, mm, 0, 0);
          return d.toISOString();
        })(),
        motivos_consulta: [`Primera consulta - ${diagnosisOptions.find(d => d.value === data.diagnostico_principal)?.label}`],
        
        // Campos básicos opcionales
        telefono: data.telefono?.trim() || undefined,
        email: data.email?.trim() || undefined,
        edad: data.edad,
        
        // ✅ NUEVOS CAMPOS DEMOGRÁFICOS
        fecha_nacimiento: data.fecha_nacimiento?.trim() || undefined,
        genero: data.genero || undefined,
        
        // ✅ NUEVOS CAMPOS DE UBICACIÓN
        ciudad: data.ciudad?.trim() || undefined,
        estado: data.estado?.trim() || undefined,
        
        // ✅ NUEVOS CAMPOS DE CONTACTO DE EMERGENCIA
        contacto_emergencia_nombre: data.contacto_emergencia_nombre?.trim() || undefined,
        contacto_emergencia_telefono: data.contacto_emergencia_telefono?.trim() || undefined,
        
        // ✅ NUEVOS CAMPOS MÉDICOS Y ADMINISTRATIVOS
        antecedentes_medicos: data.antecedentes_medicos?.trim() || undefined,
        numero_expediente: data.numero_expediente?.trim() || undefined,
        seguro_medico: data.seguro_medico?.trim() || undefined,
        
        // ✅ NUEVOS CAMPOS DE ORIGEN Y MARKETING
        marketing_source: data.marketing_source?.trim() || undefined,
        creation_source: data.creation_source?.trim() || 'admision_form',
        lead_id: data.lead_id || undefined,
        
        // Campos médicos y de gestión
        comentarios_registro: data.comentarios_registro?.trim() || undefined,
        probabilidad_cirugia: data.probabilidad_cirugia,
        doctor_id: data.doctor_id,
      };

      console.log('🚀 [NewPatientForm] API payload:', payload);

      // ✅ Enviar datos usando el hook corregido
      const result = await admissionMutation.mutateAsync(payload);
      
      console.log('✅ [NewPatientForm] Admission successful:', result);

      // ✅ Resetear formulario y llamar callback
      form.reset();
      setSelectedDate(undefined);
      onSuccess?.(result);
      
    } catch (error) {
      console.error('❌ [NewPatientForm] Submit error:', error);
      // El error ya se maneja en el hook
    }
  }, [admissionMutation, form, onSuccess]);

  // ✅ HANDLERS OPTIMIZADOS
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date && isValidDate(date)) {
      setSelectedDate(date);
      // Reset horaConsulta al cambiar fecha para evitar mantener horarios inválidos
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

  const handlePhoneChange = useCallback((value: string) => {
    const formatted = formatPhoneNumber(value);
    form.setValue('telefono', formatted, { shouldValidate: true });
  }, [form]);

  // ✅ Callbacks de Autocomplete (debajo de `form` para evitar use-before-declare)
  const fillFromLead = useCallback((lead: Lead) => {
    const parts = (lead.full_name || '').trim().split(/\s+/);
    const nombre = parts[0] || '';
    const apellidos = parts.slice(1).join(' ');

    form.setValue('nombre', nombre, { shouldValidate: true });
    form.setValue('apellidos', apellidos, { shouldValidate: true });
    if (lead.phone_number) form.setValue('telefono', formatPhoneNumber(lead.phone_number), { shouldValidate: true });
    if (lead.email) form.setValue('email', lead.email, { shouldValidate: true });
    // Asociar el lead a la admisión
    form.setValue('lead_id', lead.id, { shouldValidate: true });
    // Opcional: traer notas del lead
    if ((lead as any).notes) {
      form.setValue('comentarios_registro', (lead as any).notes as string, { shouldValidate: false });
    }
  }, [form]);

  const fillFromPatient = useCallback((patient: Patient) => {
    form.setValue('nombre', patient.nombre ?? '', { shouldValidate: true });
    form.setValue('apellidos', patient.apellidos ?? '', { shouldValidate: true });
    if (patient.telefono) form.setValue('telefono', formatPhoneNumber(patient.telefono), { shouldValidate: true });
    if (patient.email) form.setValue('email', patient.email, { shouldValidate: true });
    if (typeof patient.edad === 'number') form.setValue('edad', patient.edad, { shouldValidate: false });
    if (patient.ciudad) form.setValue('ciudad', patient.ciudad, { shouldValidate: false });
    if (patient.estado) form.setValue('estado', patient.estado, { shouldValidate: false });
    if (patient.contacto_emergencia_nombre) form.setValue('contacto_emergencia_nombre', patient.contacto_emergencia_nombre, { shouldValidate: false });
    if (patient.contacto_emergencia_telefono) form.setValue('contacto_emergencia_telefono', formatPhoneNumber(patient.contacto_emergencia_telefono), { shouldValidate: false });
    if (patient.antecedentes_medicos) form.setValue('antecedentes_medicos', patient.antecedentes_medicos, { shouldValidate: false });
    if (patient.seguro_medico) form.setValue('seguro_medico', patient.seguro_medico, { shouldValidate: false });
    if (patient.numero_expediente) form.setValue('numero_expediente', patient.numero_expediente, { shouldValidate: false });
    if (patient.genero as any) form.setValue('genero', patient.genero as any, { shouldValidate: false });
    if (patient.fecha_nacimiento as any) form.setValue('fecha_nacimiento', patient.fecha_nacimiento as any, { shouldValidate: false });
    if (patient.diagnostico_principal as any) {
      const display = DiagnosisDbToDisplayMap[patient.diagnostico_principal as DbDiagnosis];
      if (display) form.setValue('diagnostico_principal', display as DiagnosisDisplay, { shouldValidate: false });
    }
  }, [form]);

  const handleSelectResult = useCallback((item: SearchItem) => {
    try {
      if (item.kind === 'lead') fillFromLead(item.data as Lead);
      if (item.kind === 'patient') fillFromPatient(item.data as Patient);
      setSearchTerm(item.title);
      setShowSearch(false);
    } catch (e) {
      console.error('Error al aplicar selección de autocomplete', e);
    }
  }, [fillFromLead, fillFromPatient]);

  // ✅ VALORES COMPUTADOS
  const isLoading = admissionMutation.isPending;
  const hasErrors = Object.keys(form.formState.errors).length > 0;

  return (
    <Card className={cn("w-full max-w-4xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Registro de Nuevo Paciente
        </CardTitle>
        <p className="text-muted-foreground">
          Complete la información del paciente y programe su primera consulta
        </p>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 🔎 BÚSQUEDA RÁPIDA PACIENTE/LEAD */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">Buscar paciente o lead</h3>
                <Badge variant="secondary">Autocomplete</Badge>
              </div>
              <div className="relative">
                <Input
                  placeholder="Nombre, teléfono o email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  onBlur={() => setTimeout(() => setShowSearch(false), 150)}
                />
                {showSearch && debouncedSearch.length >= 2 && (
                  <div className="absolute z-50 mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow">
                    {isSearching ? (
                      <div className="p-3 flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                      </div>
                    ) : combinedResults.length > 0 ? (
                      <ul className="max-h-64 overflow-auto divide-y">
                        {combinedResults.map((item) => (
                          <li
                            key={`${item.kind}:${item.id}`}
                            className="p-3 hover:bg-accent cursor-pointer"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectResult(item);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{item.title}</div>
                                {item.subtitle && (
                                  <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                                )}
                              </div>
                              <Badge variant={item.kind === 'patient' ? 'default' : 'outline'}>
                                {item.kind === 'patient' ? 'Paciente' : 'Lead'}
                              </Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground">Sin resultados</div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Escribe al menos 2 caracteres para buscar en pacientes y leads.</p>
            </div>

            
            {/* ✅ INFORMACIÓN PERSONAL */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <h3 className="text-lg font-medium">Información Personal</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Juan" 
                          {...field}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apellidos"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Apellidos *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Pérez González" 
                          {...field}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(555) 123-4567" 
                          {...field}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="juan@email.com" 
                          {...field}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="edad"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="35" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ✅ INFORMACIÓN DEMOGRÁFICA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-purple-600" />
                <h3 className="text-lg font-medium">Información Demográfica</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fecha_nacimiento"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Fecha de Nacimiento</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="genero"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Género</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={fieldState.error ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Seleccione género" />
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

            {/* ✅ INFORMACIÓN DE UBICACIÓN */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-orange-600" />
                <h3 className="text-lg font-medium">Información de Ubicación</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ciudad"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ciudad de residencia" 
                          {...field}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Estado/Provincia</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Estado o provincia" 
                          {...field}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ✅ CONTACTO DE EMERGENCIA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-red-600" />
                <h3 className="text-lg font-medium">Contacto de Emergencia</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contacto_emergencia_nombre"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Nombre del Contacto</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nombre completo del contacto" 
                          {...field}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contacto_emergencia_telefono"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Teléfono de Contacto</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(555) 123-4567" 
                          {...field}
                          onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            field.onChange(formatted);
                          }}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ✅ INFORMACIÓN MÉDICA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <h3 className="text-lg font-medium">Información Médica</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="diagnostico_principal"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Diagnóstico Principal *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={fieldState.error ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Seleccione diagnóstico" />
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
                  render={({ field, fieldState }) => (
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
                          className={fieldState.error ? 'border-red-500' : ''}
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
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Comentarios Adicionales</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notas adicionales sobre el paciente o la condición..." 
                        {...field}
                        className={cn("min-h-[80px]", fieldState.error && 'border-red-500')}
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
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Antecedentes Médicos</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Historial médico relevante..." 
                          {...field}
                          className={cn("min-h-[60px]", fieldState.error && 'border-red-500')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seguro_medico"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Seguro Médico</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Nombre del seguro médico" 
                          {...field}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="numero_expediente"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Número de Expediente</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Número de expediente médico" 
                        {...field}
                        className={fieldState.error ? 'border-red-500' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ✅ INFORMACIÓN DE ORIGEN Y MARKETING */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <h3 className="text-lg font-medium">Información de Origen y Marketing</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="marketing_source"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Fuente de Marketing</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Cómo conoció sobre nosotros" 
                          {...field}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creation_source"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Fuente de Creación</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Sistema de origen" 
                          {...field}
                          disabled
                          className={cn("bg-muted", fieldState.error && 'border-red-500')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ✅ PROGRAMACIÓN DE CITA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-purple-600" />
                <h3 className="text-lg font-medium">Programar Primera Consulta</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fechaConsulta"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Consulta *</FormLabel>
                      <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                                fieldState.error && "border-red-500"
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
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Hora de Consulta *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={fieldState.error ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Seleccionar hora" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIME_SLOTS.map((slot) => {
                            const disabled = occupiedTimes.has(slot.value);
                            return (
                              <SelectItem key={slot.value} value={slot.value} disabled={disabled}>
                                <div className={cn('flex items-center gap-2', disabled && 'opacity-50') }>
                                  <Clock className="h-3 w-3" />
                                  {slot.label}{disabled ? ' (Ocupado)' : ''}
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

            {/* ✅ ERRORES Y ACCIONES */}
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
                className="sm:flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
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