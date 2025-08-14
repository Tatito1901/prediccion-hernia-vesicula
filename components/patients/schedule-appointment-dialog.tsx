import { useState, memo, useCallback, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  FileText, 
  AlertCircle,
  Check,
  Info
} from "lucide-react"
import { format, isBefore, startOfDay, isWeekend, setHours, setMinutes, addDays } from "date-fns"
import { es } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateAppointment } from "@/hooks/use-appointments"
import { EnrichedPatient } from "@/lib/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// 🎨 Configuración de tema
const THEME = {
  primary: "from-teal-500 to-blue-600",
  success: "from-emerald-500 to-green-600",
  warning: "from-amber-500 to-orange-600",
  info: "from-blue-500 to-indigo-600"
}

// ✅ Horarios disponibles optimizados
const TIME_SLOTS = [
  { value: "09:00", label: "9:00 AM", period: "morning" },
  { value: "09:30", label: "9:30 AM", period: "morning" },
  { value: "10:00", label: "10:00 AM", period: "morning" },
  { value: "10:30", label: "10:30 AM", period: "morning" },
  { value: "11:00", label: "11:00 AM", period: "morning" },
  { value: "11:30", label: "11:30 AM", period: "morning" },
  { value: "12:00", label: "12:00 PM", period: "afternoon" },
  { value: "12:30", label: "12:30 PM", period: "afternoon" },
  { value: "13:00", label: "1:00 PM", period: "afternoon" },
  { value: "13:30", label: "1:30 PM", period: "afternoon" },
  { value: "14:00", label: "2:00 PM", period: "afternoon" },
  { value: "14:30", label: "2:30 PM", period: "afternoon" },
  { value: "15:00", label: "3:00 PM", period: "afternoon" }
] as const

// ✅ Cache para formateo
const dateDisplayCache = new Map<string, string>()
const formatDisplayDate = (date: Date | null): string => {
  if (!date) return "Seleccionar fecha"
  
  const key = date.toISOString()
  if (dateDisplayCache.has(key)) return dateDisplayCache.get(key)!
  
  try {
    const formatted = format(date, "EEEE, d 'de' MMMM yyyy", { locale: es })
    const capitalizedFormatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)
    dateDisplayCache.set(key, capitalizedFormatted)
    return capitalizedFormatted
  } catch {
    return "Error de formato"
  }
}

interface ScheduleAppointmentDialogProps {
  isOpen: boolean
  patient: EnrichedPatient | null
  onClose: () => void
}

interface FormState {
  fechaConsulta: Date
  horaConsulta: string
  motivoConsulta: string
  notas: string
}

// 🚀 Componente principal optimizado
const ScheduleAppointmentDialog = memo(function ScheduleAppointmentDialog({ 
  isOpen, 
  patient, 
  onClose 
}: ScheduleAppointmentDialogProps) {
  const { mutateAsync: addAppointment, isPending } = useCreateAppointment()
  
  // Estado inicial optimizado
  const initialDate = useMemo(() => {
    const tomorrow = addDays(new Date(), 1)
    return isWeekend(tomorrow) ? addDays(tomorrow, 2) : tomorrow
  }, [])
  
  const [formData, setFormData] = useState<FormState>({
    fechaConsulta: initialDate,
    horaConsulta: "09:00",
    motivoConsulta: "",
    notas: "",
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // ✅ Validación optimizada
  const validateField = useCallback((field: keyof FormState, value: any): string | null => {
    switch (field) {
      case 'fechaConsulta':
        if (!value) return "Selecciona una fecha"
        if (isBefore(value, startOfDay(new Date()))) return "No puedes agendar en fechas pasadas"
        if (isWeekend(value)) return "Solo disponible de lunes a sábado"
        return null
        
      case 'horaConsulta':
        if (!value) return "Selecciona una hora"
        return null
        
      case 'motivoConsulta':
        if (!value || value.trim() === '') return "El motivo es requerido"
        if (value.length < 3) return "Mínimo 3 caracteres"
        if (value.length > 200) return "Máximo 200 caracteres"
        return null
        
      default:
        return null
    }
  }, [])

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}
    
    Object.keys(formData).forEach(key => {
      const error = validateField(key as keyof FormState, formData[key as keyof FormState])
      if (error) newErrors[key] = error
    })
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData, validateField])

  // ✅ Actualización de campos con validación en tiempo real
  const updateFormData = useCallback((field: keyof FormState, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    if (touched[field]) {
      const error = validateField(field, value)
      setErrors(prev => {
        if (error) {
          return { ...prev, [field]: error }
        } else {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        }
      })
    }
  }, [touched, validateField])

  const handleBlur = useCallback((field: keyof FormState) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, formData[field])
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }))
    }
  }, [formData, validateField])

  // ✅ Envío del formulario
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Marcar todos los campos como tocados
    setTouched({ 
      fechaConsulta: true, 
      horaConsulta: true, 
      motivoConsulta: true,
      notas: true 
    })
    
    if (!patient || !validateForm()) return

    const promise = addAppointment({
      patient_id: patient.id,
      fecha_hora_cita: `${format(formData.fechaConsulta, "yyyy-MM-dd")}T${formData.horaConsulta}:00`,
      estado_cita: "PROGRAMADA",
      motivos_consulta: [formData.motivoConsulta.trim()],
      notas_breves: formData.notas.trim() || "",
      doctor_id: "default-doctor",
      es_primera_vez: false,
    })

    toast.promise(promise, {
      loading: "Agendando cita...",
      success: () => {
        onClose()
        // Reset form
        setFormData({
          fechaConsulta: initialDate,
          horaConsulta: "09:00",
          motivoConsulta: "",
          notas: "",
        })
        setErrors({})
        setTouched({})
        return `Cita agendada para ${patient.nombre} ${patient.apellidos}`
      },
      error: (err) => err.message || "Error al agendar la cita",
    })
  }, [patient, validateForm, addAppointment, formData, onClose, initialDate])
  
  // ✅ Validación de fechas
  const disabledDates = useCallback((date: Date) => {
    return isBefore(date, startOfDay(new Date())) || isWeekend(date)
  }, [])
  
  // ✅ Texto del botón de fecha memoizado
  const dateButtonText = useMemo(() => {
    return formatDisplayDate(formData.fechaConsulta)
  }, [formData.fechaConsulta])

  const isFormValid = useMemo(() => {
    return formData.motivoConsulta.trim() !== '' && 
           formData.fechaConsulta && 
           formData.horaConsulta
  }, [formData])

  if (!patient) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header profesional */}
        <div className="relative bg-slate-800 dark:bg-slate-900 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <CalendarIcon className="h-5 w-5" />
              </div>
              Agendar Cita Médica
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3 flex items-center gap-2 text-white/80 text-sm">
            <User className="h-4 w-4" />
            <span className="font-medium">{patient.nombre} {patient.apellidos}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white dark:bg-slate-950">
          {/* Info Alert */}
          <Alert className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
            <Info className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <AlertDescription className="text-slate-700 dark:text-slate-300 text-sm">
              Horario de atención: Lunes a Sábado, 9:00 AM - 3:00 PM
            </AlertDescription>
          </Alert>

          {/* Campo de Fecha */}
          <div className="space-y-2">
            <Label htmlFor="fecha" className="text-sm font-medium flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-slate-500" />
              Fecha de la cita
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  id="fecha"
                  variant="outline" 
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    "hover:bg-slate-50 dark:hover:bg-slate-800",
                    errors.fechaConsulta && touched.fechaConsulta && "border-red-500 focus:ring-red-500"
                  )}
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-60" />
                  {dateButtonText}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.fechaConsulta}
                  onSelect={(date) => date && updateFormData("fechaConsulta", date)}
                  locale={es}
                  disabled={disabledDates}
                  initialFocus
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
            {errors.fechaConsulta && touched.fechaConsulta && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {errors.fechaConsulta}
              </p>
            )}
          </div>

          {/* Campo de Hora */}
          <div className="space-y-2">
            <Label htmlFor="hora" className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Hora de la cita
            </Label>
            <Select
              value={formData.horaConsulta}
              onValueChange={(value) => updateFormData("horaConsulta", value)}
            >
              <SelectTrigger 
                id="hora"
                className={cn(
                  "w-full",
                  errors.horaConsulta && touched.horaConsulta && "border-red-500 focus:ring-red-500"
                )}
              >
                <SelectValue placeholder="Seleccionar hora" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Mañana
                </div>
                {TIME_SLOTS.filter(slot => slot.period === 'morning').map((slot) => (
                  <SelectItem 
                    key={slot.value} 
                    value={slot.value}
                    className="pl-4"
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 opacity-60" />
                      {slot.label}
                    </span>
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Tarde
                </div>
                {TIME_SLOTS.filter(slot => slot.period === 'afternoon').map((slot) => (
                  <SelectItem 
                    key={slot.value} 
                    value={slot.value}
                    className="pl-4"
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 opacity-60" />
                      {slot.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.horaConsulta && touched.horaConsulta && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {errors.horaConsulta}
              </p>
            )}
          </div>

          {/* Campo de Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              Motivo de la consulta
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="motivo"
              type="text"
              value={formData.motivoConsulta}
              onChange={(e) => updateFormData("motivoConsulta", e.target.value)}
              onBlur={() => handleBlur("motivoConsulta")}
              placeholder="Ej: Consulta de seguimiento, dolor abdominal..."
              className={cn(
                "transition-colors",
                errors.motivoConsulta && touched.motivoConsulta && "border-red-500 focus:ring-red-500"
              )}
              maxLength={200}
            />
            <div className="flex items-center justify-between">
              {errors.motivoConsulta && touched.motivoConsulta ? (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.motivoConsulta}
                </p>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Describe brevemente el motivo
                </span>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formData.motivoConsulta.length}/200
              </span>
            </div>
          </div>

          {/* Campo de Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas" className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              Notas adicionales
              <span className="text-xs text-slate-500">(Opcional)</span>
            </Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => updateFormData("notas", e.target.value)}
              placeholder="Información adicional relevante para la cita..."
              className="min-h-[80px] resize-none transition-colors"
              maxLength={500}
            />
            <div className="flex justify-end">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formData.notas.length}/500
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || !isFormValid}
              className={cn(
                "flex-1 text-white shadow-sm transition-all",
                "bg-slate-800 hover:bg-slate-900",
                "dark:bg-slate-700 dark:hover:bg-slate-600",
                "disabled:bg-slate-400 disabled:dark:bg-slate-800"
              )}
            >
              {isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Agendar Cita
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
})

export default ScheduleAppointmentDialog