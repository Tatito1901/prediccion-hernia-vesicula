"use client"

import { useState, useEffect, useCallback } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/src/lib/utils"
import { useAppContext } from "@/src/lib/context/app-context"
import type { PatientData } from "@/app/dashboard/data-model"

// Esquema de validación para el formulario
const formSchema = z.object({
  nombre: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  apellidos: z.string().min(2, {
    message: "Los apellidos deben tener al menos 2 caracteres.",
  }),
  edad: z.coerce.number().min(1, {
    message: "La edad debe ser mayor a 0.",
  }),
  telefono: z
    .string()
    .min(10, {
      message: "El teléfono debe tener al menos 10 dígitos.",
    })
    .optional(),
  diagnostico: z.string({
    required_error: "Por favor seleccione un diagnóstico.",
  }),
  estado: z.string({
    required_error: "Por favor seleccione un estado.",
  }),
  fechaConsulta: z.date({
    required_error: "Por favor seleccione una fecha para la consulta.",
  }),
  notas: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface EditPatientFormProps {
  isOpen: boolean
  onClose: () => void
  patientId: number | null
}

export function EditPatientForm({ isOpen, onClose, patientId }: EditPatientFormProps) {
  const { getPatientById, updatePatient } = useAppContext()
  const [patient, setPatient] = useState<PatientData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Cargar datos del paciente cuando cambia el ID
  useEffect(() => {
    if (patientId) {
      const patientData = getPatientById(patientId)
      if (patientData) {
        setPatient(patientData)
      }
    } else {
      setPatient(null)
    }
  }, [patientId, getPatientById])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      edad: 0,
      telefono: "",
      diagnostico: "",
      estado: "",
      notas: "",
    },
  })

  // Actualizar el formulario cuando se carga el paciente
  useEffect(() => {
    if (patient) {
      form.reset({
        nombre: patient.nombre,
        apellidos: patient.apellidos,
        edad: patient.edad,
        telefono: patient.encuesta?.telefono || "",
        diagnostico: patient.diagnostico,
        estado: patient.estado,
        fechaConsulta: new Date(patient.fechaConsulta),
        notas: patient.notaClinica || "",
      })
    }
  }, [patient, form])

  // Manejar cierre del diálogo
  const handleDialogClose = useCallback(() => {
    if (!isLoading) {
      form.reset()
      onClose()
    }
  }, [isLoading, form, onClose])

  // Manejar envío del formulario
  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!patientId) return

      setIsLoading(true)
      try {
        // Simular una operación asíncrona
        await new Promise((resolve) => setTimeout(resolve, 500))

        // Actualizar paciente
        updatePatient(patientId, {
          nombre: values.nombre,
          apellidos: values.apellidos,
          edad: values.edad,
          fechaConsulta: values.fechaConsulta.toISOString().split("T")[0],
          diagnostico: values.diagnostico as any,
          estado: values.estado as any,
          notaClinica: values.notas,
        })

        toast.success("Paciente actualizado correctamente")
        handleDialogClose()
      } catch (error) {
        console.error("Error al actualizar paciente:", error)
        toast.error("Error al actualizar paciente")
      } finally {
        setIsLoading(false)
      }
    },
    [patientId, updatePatient, handleDialogClose],
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Paciente</DialogTitle>
          <DialogDescription>Actualice la información del paciente</DialogDescription>
        </DialogHeader>
        {patient ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
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
                      <FormLabel>Apellidos</FormLabel>
                      <FormControl>
                        <Input placeholder="Apellidos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="edad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Edad" {...field} />
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
                        <Input placeholder="Teléfono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="diagnostico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diagnóstico</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un diagnóstico" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Hernia Inguinal">Hernia Inguinal</SelectItem>
                          <SelectItem value="Hernia Umbilical">Hernia Umbilical</SelectItem>
                          <SelectItem value="Hernia Incisional">Hernia Incisional</SelectItem>
                          <SelectItem value="Vesícula">Vesícula</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pendiente de consulta">Pendiente de consulta</SelectItem>
                          <SelectItem value="Operado">Operado</SelectItem>
                          <SelectItem value="No Operado">No Operado</SelectItem>
                          <SelectItem value="Seguimiento">Seguimiento</SelectItem>
                          <SelectItem value="Cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fechaConsulta"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de consulta</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccione una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
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
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notas adicionales sobre el paciente" className="resize-none" {...field} />
                    </FormControl>
                    <FormDescription>Información adicional relevante para el paciente</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="py-6 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Cargando datos del paciente...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
