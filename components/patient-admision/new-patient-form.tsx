// components/patient-admission/new-patient-form.tsx
'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, isSunday, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  FormDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// Icons
import {
  CalendarIcon,
  Clock,
  User2,
  Phone,
  Mail,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Search,
  MapPin,
  Heart,
  Shield,
  Stethoscope,
  UserPlus,
  ChevronRight,
  Info,
  Sparkles,
  X
} from 'lucide-react';

// Types & Imports
import type { NewPatientFormProps, AdmissionPayload } from './admision-types';
import { DIAGNOSIS_DB_VALUES, type DbDiagnosis, dbDiagnosisToDisplay } from '@/lib/validation/enums';
import { NewPatientSchema } from './admision-types';
import { useAdmitPatient } from '@/hooks/use-patient';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import type { Patient } from '@/lib/types';
import { useClinic } from '@/contexts/clinic-data-provider';
import { AppointmentStatusEnum } from '@/lib/types';

// Constants - moved outside component for better performance
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const minute = (i % 2) * 30;
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
    label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  };
});

// Utility functions
const isValidDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 90);
  return !isBefore(date, today) && !isBefore(maxDate, date) && !isSunday(date);
};

// Sub-components
const FormProgress: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  const percentage = (currentStep / totalSteps) * 100;
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="font-medium">Paso {currentStep} de {totalSteps}</span>
        <span className="text-muted-foreground">{Math.round(percentage)}% completado</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};

const SearchResultCard: React.FC<{
  item: { type: 'patient'; data: Patient };
  onSelect: () => void;
}> = ({ item, onSelect }) => {
  const data = item.data as any;
  const name = `${data.nombre || ''} ${data.apellidos || ''}`.trim();
  
  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-3 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors rounded-lg border border-transparent hover:border-sky-200 dark:hover:border-sky-800"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{name || 'Sin nombre'}</div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {data.telefono && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {data.telefono}
              </span>
            )}
            {data.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3" />
                {data.email}
              </span>
            )}
          </div>
        </div>
        <Badge variant={"default"} className="text-xs shrink-0">
          Paciente
        </Badge>
      </div>
    </button>
  );
};

// Tab Components
const PersonalInfoTab: React.FC<{ form: any }> = ({ form }) => (
  <div className="space-y-6">
    {/* Información Personal */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <User2 className="h-5 w-5 text-muted-foreground" />
        Información Personal
      </h3>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre *</FormLabel>
              <FormControl>
                <Input placeholder="Nombre del paciente" {...field} />
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
                <Input placeholder="Apellidos del paciente" {...field} />
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
                  inputMode="numeric"
                  min={0}
                  max={120}
                  placeholder="Edad"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === '' ? undefined : parseInt(value, 10));
                  }}
                />
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
                    <SelectValue placeholder="Seleccionar género" />
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
        
        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="555-123-4567"
                    className="pl-10"
                    {...field}
                    onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                  />
                </div>
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
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="email" 
                    placeholder="correo@ejemplo.com"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>

    <Separator />

    {/* Ubicación */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        Ubicación
      </h3>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="ciudad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ciudad</FormLabel>
              <FormControl>
                <Input placeholder="Ciudad de residencia" {...field} />
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
                <Input placeholder="Estado o provincia" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>

    <Separator />

    {/* Contacto de Emergencia */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Heart className="h-5 w-5 text-muted-foreground" />
        Contacto de Emergencia
      </h3>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="contacto_emergencia_nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Contacto</FormLabel>
              <FormControl>
                <Input placeholder="Nombre completo" {...field} />
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
              <FormLabel>Teléfono del Contacto</FormLabel>
              <FormControl>
                <Input 
                  placeholder="555-123-4567"
                  {...field}
                  onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  </div>
);

const MedicalInfoTab: React.FC<{ form: any }> = ({ form }) => (
  <div className="space-y-6">
    {/* Información Médica */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-muted-foreground" />
        Información Clínica
      </h3>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="diagnostico_principal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Diagnóstico Principal *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar diagnóstico" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DIAGNOSIS_DB_VALUES.map((diagnosis) => (
                    <SelectItem key={diagnosis} value={diagnosis}>
                      {dbDiagnosisToDisplay(diagnosis)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Diagnóstico principal del paciente
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="probabilidad_cirugia"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Probabilidad de Cirugía</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <Input 
                    type="number"
                    min="0"
                    max="100"
                    placeholder="50"
                    value={field.value ? Math.round(field.value * 100) : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value ? parseFloat(value) / 100 : undefined);
                    }}
                  />
                  <Progress value={(field.value || 0) * 100} className="h-2" />
                </div>
              </FormControl>
              <FormDescription>
                Porcentaje estimado (0-100%)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <FormField
        control={form.control}
        name="antecedentes_medicos"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Antecedentes Médicos</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Describa los antecedentes médicos relevantes..."
                className="min-h-[100px] resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="comentarios_registro"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Observaciones</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Observaciones adicionales..."
                className="min-h-[80px] resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <Separator />

    {/* Información Administrativa */}
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Shield className="h-5 w-5 text-muted-foreground" />
        Información Administrativa
      </h3>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="numero_expediente"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Expediente</FormLabel>
              <FormControl>
                <Input placeholder="EXP-00000" {...field} />
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
                <Input placeholder="Nombre del seguro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  </div>
);

const AppointmentTab: React.FC<{ 
  form: any; 
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  occupiedTimes: Set<string>;
}> = ({ form, selectedDate, setSelectedDate, occupiedTimes }) => (
  <div className="space-y-6">
    <h3 className="text-lg font-semibold flex items-center gap-2">
      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
      Programar Primera Consulta
    </h3>
    
    <Alert className="border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30">
      <Info className="h-4 w-4" />
      <AlertDescription>
        Seleccione la fecha y hora para la primera consulta del paciente
      </AlertDescription>
    </Alert>
    
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="fechaConsulta"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Fecha de Consulta *</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? (
                      format(field.value, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={(date) => {
                    field.onChange(date);
                    setSelectedDate(date);
                  }}
                  disabled={(date) => !isValidDate(date)}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            <FormDescription>
              Días laborales, hasta 90 días en adelante
            </FormDescription>
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
                  <SelectValue placeholder={selectedDate ? "Seleccionar hora" : "Seleccione fecha primero"} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TIME_SLOTS.map((slot) => {
                  const isOccupied = occupiedTimes.has(slot.value);
                  return (
                    <SelectItem 
                      key={slot.value} 
                      value={slot.value} 
                      disabled={isOccupied}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{slot.label}</span>
                        {isOccupied && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Ocupado
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <FormDescription>
              Horarios disponibles de 9:00 a 14:30
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
    
    {selectedDate && form.watch('horaConsulta') && (
      <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertDescription>
          <strong>Cita programada:</strong> {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} a las {form.watch('horaConsulta')}
        </AlertDescription>
      </Alert>
    )}
  </div>
);

// Main Component
const NewPatientForm: React.FC<NewPatientFormProps> = ({ 
  onSuccess, 
  onCancel, 
  className 
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'personal' | 'medical' | 'appointment'>('personal');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showSearch, setShowSearch] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Patient | null>(null);
  const [searchResults, setSearchResults] = useState<{ patients: Patient[] }>({ 
    patients: []
  });
  const [isSearching, setIsSearching] = useState(false);
  const [occupiedTimes, setOccupiedTimes] = useState<Set<string>>(new Set());
  
  const debouncedSearch = useDebounce(searchTerm, 300);
  const admissionMutation = useAdmitPatient();
  const { fetchSpecificAppointments } = useClinic();

  // Form setup
  const form = useForm<z.infer<typeof NewPatientSchema>>({
    resolver: zodResolver(NewPatientSchema),
    defaultValues: {
      nombre: '',
      apellidos: '',
      diagnostico_principal: 'HERNIA_INGUINAL' as DbDiagnosis,
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
      comentarios_registro: '',
      probabilidad_cirugia: 0.5,
    },
  });

  // Search functionality
  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2) {
      setSearchResults({ patients: [] });
      return;
    }

    const searchData = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/patients?search=${debouncedSearch}&pageSize=3`);
        const patientsData = await res.json();
        setSearchResults({ patients: patientsData?.data || [] });
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    searchData();
  }, [debouncedSearch]);

  // Load occupied time slots
  useEffect(() => {
    if (!selectedDate) return;
    
    const loadAppointments = async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      try {
        const res = await fetchSpecificAppointments({
          dateFilter: 'range',
          startDate: dateStr,
          endDate: dateStr,
          pageSize: 100,
        });
        
        const occupied = new Set<string>();
        res.data?.forEach((apt: any) => {
          if ([
            AppointmentStatusEnum.PROGRAMADA,
            AppointmentStatusEnum.CONFIRMADA,
            AppointmentStatusEnum.PRESENTE,
          ].includes(apt.estado_cita)) {
            const time = format(new Date(apt.fecha_hora_cita), 'HH:mm');
            occupied.add(time);
          }
        });
        
        setOccupiedTimes(occupied);
      } catch (err) {
        console.error('Error loading appointments:', err);
      }
    };

    loadAppointments();
  }, [selectedDate, fetchSpecificAppointments]);

  // Handlers
  const handleSelectRecord = (patient: Patient) => {
    setSelectedRecord(patient);
    form.setValue('nombre', patient.nombre || '');
    form.setValue('apellidos', patient.apellidos || '');
    form.setValue('telefono', patient.telefono || '');
    form.setValue('email', patient.email || '');
    form.setValue('edad', patient.edad as number | undefined);
    form.setValue('ciudad', patient.ciudad || '');
    form.setValue('estado', patient.estado || '');
    form.setValue('genero', patient.genero as any);
    form.setValue('fecha_nacimiento', patient.fecha_nacimiento || '');
    form.setValue('contacto_emergencia_nombre', patient.contacto_emergencia_nombre || '');
    form.setValue('contacto_emergencia_telefono', patient.contacto_emergencia_telefono || '');
    form.setValue('antecedentes_medicos', patient.antecedentes_medicos || '');
    form.setValue('seguro_medico', patient.seguro_medico || '');
    form.setValue('numero_expediente', patient.numero_expediente || '');
    setSearchTerm('');
    setShowSearch(false);
  };

  const onSubmit = async (data: z.infer<typeof NewPatientSchema>) => {
    try {
      const [hh, mm] = data.horaConsulta.split(':').map(Number);
      const appointmentDate = new Date(data.fechaConsulta);
      appointmentDate.setHours(hh, mm, 0, 0);

      const payload: AdmissionPayload = {
        nombre: data.nombre.trim(),
        apellidos: data.apellidos.trim(),
        diagnostico_principal: data.diagnostico_principal,
        fecha_hora_cita: appointmentDate.toISOString(),
        motivos_consulta: [data.diagnostico_principal],
        telefono: data.telefono?.trim(),
        email: data.email?.trim(),
        edad: data.edad,
        fecha_nacimiento: data.fecha_nacimiento,
        genero: data.genero,
        ciudad: data.ciudad?.trim(),
        estado: data.estado?.trim(),
        contacto_emergencia_nombre: data.contacto_emergencia_nombre?.trim(),
        contacto_emergencia_telefono: data.contacto_emergencia_telefono?.trim(),
        antecedentes_medicos: data.antecedentes_medicos?.trim(),
        numero_expediente: data.numero_expediente?.trim(),
        seguro_medico: data.seguro_medico?.trim(),
        comentarios_registro: data.comentarios_registro?.trim(),
        probabilidad_cirugia: data.probabilidad_cirugia,
        creation_source: 'admission_form_complete',
      };
      
      const result = await admissionMutation.mutateAsync(payload);
      form.reset();
      setSelectedDate(undefined);
      setSelectedRecord(null);
      onSuccess?.();
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handleCancel = () => {
    form.reset();
    setSelectedDate(undefined);
    setSelectedRecord(null);
    onCancel?.();
  };

  // Computed values
  const isLoading = admissionMutation.isPending;
  const hasErrors = Object.keys(form.formState.errors).length > 0;
  
  const [nombre, apellidos, diagnostico_principal, fechaConsulta, horaConsulta] = form.watch([
    'nombre',
    'apellidos',
    'diagnostico_principal',
    'fechaConsulta',
    'horaConsulta',
  ]);
  const formProgress = [
    nombre,
    apellidos,
    diagnostico_principal,
    fechaConsulta,
    horaConsulta,
  ].filter(Boolean).length;
  
  const tabs = ['personal', 'medical', 'appointment'] as const;

  return (
    <Card className={cn("w-full max-w-5xl mx-auto shadow-xl", className)}>
      <CardHeader className="bg-gradient-to-r from-sky-50 to-teal-50 dark:from-sky-950/20 dark:to-teal-950/20 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm shrink-0">
              <UserPlus className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xl sm:text-2xl">Registro Completo de Paciente</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Clínica Hernia y Vesícula - Dr. Luis Ángel Medina
              </CardDescription>
            </div>
          </div>
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 sm:p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Progress Indicator */}
            <FormProgress currentStep={formProgress} totalSteps={5} />

            {/* Search Section */}
            <div className="space-y-4 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-lg border border-sky-200 dark:border-sky-800">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-sky-600 shrink-0" />
                <h3 className="font-semibold text-sky-900 dark:text-sky-100">
                  Búsqueda Rápida
                </h3>
                <Badge variant="secondary" className="text-xs">Opcional</Badge>
              </div>
              
              <div className="relative">
                <Input
                  placeholder="Buscar paciente existente..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearch(true);
                  }}
                  onFocus={() => setShowSearch(true)}
                  className="pr-10"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {showSearch && debouncedSearch.length >= 2 && (
                <Card className="border-sky-200 dark:border-sky-800">
                  <ScrollArea className="max-h-64">
                    <div className="p-2 space-y-1">
                      {searchResults.patients.length === 0 && !isSearching ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No se encontraron resultados
                        </p>
                      ) : (
                        <>
                          {searchResults.patients.map((patient) => (
                            <SearchResultCard
                              key={patient.id}
                              item={{ type: 'patient', data: patient }}
                              onSelect={() => handleSelectRecord(patient)}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              )}

              {selectedRecord && (
                <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertDescription>
                    Datos cargados de paciente existente
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Tabs for form sections */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal" className="gap-2 text-xs sm:text-sm">
                  <User2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Personal</span>
                </TabsTrigger>
                <TabsTrigger value="medical" className="gap-2 text-xs sm:text-sm">
                  <Stethoscope className="h-4 w-4" />
                  <span className="hidden sm:inline">Médico</span>
                </TabsTrigger>
                <TabsTrigger value="appointment" className="gap-2 text-xs sm:text-sm">
                  <CalendarIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Cita</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-6">
                <PersonalInfoTab form={form} />
              </TabsContent>

              <TabsContent value="medical" className="mt-6">
                <MedicalInfoTab form={form} />
              </TabsContent>

              <TabsContent value="appointment" className="mt-6">
                <AppointmentTab 
                  form={form}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  occupiedTimes={occupiedTimes}
                />
              </TabsContent>
            </Tabs>

            {/* Error Summary */}
            {hasErrors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Por favor, corrija los errores marcados en el formulario antes de continuar.
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <div className="flex-1 hidden sm:block" />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex > 0) {
                      setActiveTab(tabs[currentIndex - 1]);
                    }
                  }}
                  disabled={activeTab === 'personal' || isLoading}
                  className="flex-1 sm:flex-initial"
                >
                  Anterior
                </Button>
                {activeTab !== 'appointment' ? (
                  <Button
                    type="button"
                    onClick={() => {
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex < tabs.length - 1) {
                        setActiveTab(tabs[currentIndex + 1]);
                      }
                    }}
                    className="gap-2 flex-1 sm:flex-initial"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isLoading || hasErrors}
                    className="gap-2 bg-sky-600 hover:bg-sky-700 flex-1 sm:flex-initial"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Registrando...</span>
                        <span className="sm:hidden">Guardando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Registrar Paciente</span>
                        <span className="sm:hidden">Registrar</span>
                        <Sparkles className="h-3.5 w-3.5 hidden sm:inline" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default NewPatientForm;