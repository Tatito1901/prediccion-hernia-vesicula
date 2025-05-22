"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { FollowUp, PatientData } from "@/app/dashboard/data-model"

// Schema for form validation
const followUpSchema = z.object({
  fecha: z.date({
    required_error: "La fecha es requerida",
  }),
  tipo: z.string({
    required_error: "El tipo es requerido",
  }),
  notas: z.string().min(1, "Las notas son requeridas"),
  resultado: z.string({
    required_error: "El resultado es requerido",
  }),
  proximoSeguimiento: z.date().optional(),
  asignadoA: z.string({
    required_error: "El responsable es requerido",
  }),
})

type FollowUpFormValues = z.infer<typeof followUpSchema>

interface FollowUpFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (followUp: Partial<FollowUp>) => void
  followUp?: FollowUp
  patient?: PatientData
  availableAssignees: string[]
}

export function FollowUpForm({ isOpen, onClose, onSave, followUp, patient, availableAssignees }: FollowUpFormProps) {
  // Initialize form with default values or existing follow-up data
  const form = useForm<FollowUpFormValues>({
    resolver: zodResolver(followUpSchema),
    defaultValues: followUp
      ? {
          fecha: new Date(followUp.fecha),
          tipo: followUp.tipo,
          notas: followUp.notas,
          resultado: followUp.resultado,
          proximoSeguimiento: followUp.proximoSeguimiento ? new Date(followUp.proximoSeguimiento) : undefined,
          asignadoA: followUp.asignadoA,
        }
      : {
          fecha: new Date(),
          tipo: "Llamada",
          notas: "",
          resultado: "Interesado",
          proximoSeguimiento: undefined,
          asignadoA: availableAssignees[0] || "",
        },
  })

  // Handle form submission
  const onSubmit = (values: FollowUpFormValues) => {
    try {
      // Prepare data for saving
      const followUpData: Partial<FollowUp> = {
        ...values,
        fecha: values.fecha.toISOString(),
        proximoSeguimiento: values.proximoSeguimiento?.toISOString(),
        estado: "Programado",
        patientId: patient?.id || followUp?.patientId,
        id: followUp?.id,
      }

      // Save the follow-up
      onSave(followUpData)

      // Close the dialog
      onClose()

      // Show success message
      toast.success(followUp ? "Seguimiento actualizado" : "Seguimiento creado")
    } catch (error) {
      console.error("Error saving follow-up:", error)
      toast.error("Error al guardar el seguimiento")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{followUp ? "Editar Seguimiento" : "Nuevo Seguimiento"}</DialogTitle>
          <DialogDescription>
            {patient && `Paciente: ${patient.nombre} ${patient.apellidos}`}
            {!patient && followUp && "Editar detalles del seguimiento"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Llamada">Llamada</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                        <SelectItem value="Consulta">Consulta</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalles del seguimiento..." className="min-h-[100px]" {...field} />
                  </FormControl>
                  <FormDescription>Incluya información relevante sobre la interacción con el paciente.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="resultado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resultado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar resultado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Interesado">Interesado</SelectItem>
                        <SelectItem value="No interesado">No interesado</SelectItem>
                        <SelectItem value="Indeciso">Indeciso</SelectItem>
                        <SelectItem value="No contactado">No contactado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="asignadoA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asignado a</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar responsable" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableAssignees.map((assignee) => (
                          <SelectItem key={assignee} value={assignee}>
                            {assignee}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="proximoSeguimiento"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Próximo seguimiento (opcional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={es}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                      <div className="p-3 border-t">
                        <Button variant="ghost" size="sm" onClick={() => field.onChange(undefined)} type="button">
                          Limpiar
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Fecha para el próximo contacto con el paciente.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">{followUp ? "Actualizar" : "Crear"} Seguimiento</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
