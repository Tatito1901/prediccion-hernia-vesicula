"use client";

import React, { useState, FC, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus } from 'lucide-react';
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useAppContext } from "@/lib/context/app-context";
import type { PatientData, DiagnosisType, PatientStatus } from "@/app/dashboard/data-model";
import { useIsMobile } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";

// Default user ID until auth is implemented
const DEFAULT_USER_ID = "5e4d29a2-5eec-49ee-ac0f-8d349d5660ed";

// Normalize ID
const normalizeId = (id: any): string => {
  if (id === null || id === undefined) return "";
  return String(id);
};

// Validation schema for patient data only
const newPatientOnlySchema = z.object({
  nombre: z.string()
    .min(2, "Nombre debe tener al menos 2 caracteres.")
    .max(50, "Nombre no puede exceder 50 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Nombre solo debe contener letras."),
  apellidos: z.string()
    .min(2, "Apellidos deben tener al menos 2 caracteres.")
    .max(100, "Apellidos no pueden exceder 100 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Apellidos solo deben contener letras."),
  edad: z.number().optional(),
  telefono: z.string()
    .min(10, "Teléfono debe tener al menos 10 dígitos.")
    .max(15, "Teléfono no puede exceder 15 dígitos.")
    .regex(/^\d+$/, "Teléfono solo debe contener números."),
  email: z.string()
    .email("Email inválido.")
    .optional()
    .or(z.literal("")),
  diagnostico_principal: z.string().optional() as z.ZodType<DiagnosisType | undefined>,
  comentarios_registro: z.string().max(500, "Comentarios no pueden exceder 500 caracteres.").optional(),
});

type NewPatientOnlyFormValues = z.infer<typeof newPatientOnlySchema>;

interface NewPatientOnlyFormProps {
  onSuccess?: (newPatient: PatientData) => void;
  className?: string;
  buttonVariant?: "default" | "secondary" | "outline" | "ghost" | "link" | null | undefined;
  buttonLabel?: string;
}

export const NewPatientOnlyForm: FC<NewPatientOnlyFormProps> = ({
  onSuccess,
  className = "",
  buttonVariant = "secondary",
  buttonLabel = "Registrar Paciente",
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addPatient } = useAppContext();

  // Check if context functions are available
  useEffect(() => {
    if (!addPatient) {
      console.error("[NewPatientOnlyForm] addPatient function not available");
      toast.error("Error de configuración", { 
        description: "La función necesaria no está disponible. Por favor, recarga la página." 
      });
    }
  }, [addPatient]);

  const form = useForm<NewPatientOnlyFormValues>({
    resolver: zodResolver(newPatientOnlySchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      edad: undefined,
      telefono: "",
      email: "",
      diagnostico_principal: undefined,
      comentarios_registro: "",
    },
  });

  const onSubmit = async (values: NewPatientOnlyFormValues) => {
    // Validate context functions
    if (!addPatient) {
      toast.error("Error de configuración", { 
        description: "La función necesaria no está disponible." 
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Use default user ID
      const currentUserId = DEFAULT_USER_ID;

      // Format registration date
      const fechaRegistro = new Date().toISOString().split('T')[0];

      // Build patient payload
      const patientPayload = {
        nombre: values.nombre.trim(),
        apellidos: values.apellidos.trim(),
        edad: values.edad,
        telefono: values.telefono.trim(),
        email: values.email?.trim() || undefined,
        estado_paciente: "PENDIENTE DE CONSULTA" as PatientStatus,
        diagnostico_principal: values.diagnostico_principal,
        comentarios_registro: values.comentarios_registro?.trim(),
        creado_por_id: currentUserId,
        fecha_registro: fechaRegistro,
      };

      // Create patient
      const newPatientResponse = await addPatient(patientPayload);

      if (!newPatientResponse) {
        throw new Error("No se pudo crear el paciente");
      }

      // Extract patient ID from response
      let patientId: string;
      let newPatient: PatientData;

      if (typeof newPatientResponse === 'number' || typeof newPatientResponse === 'string') {
        // Response is just an ID
        patientId = normalizeId(newPatientResponse);
        
        // Build complete patient object
        newPatient = {
          id: patientId,
          ...patientPayload,
          estado: patientPayload.estado_paciente,
          probabilidadCirugia: 0,
          timestampRegistro: new Date().toISOString(),
          ultimoContacto: fechaRegistro,
        } as PatientData;
      } else if (typeof newPatientResponse === 'object' && newPatientResponse.id) {
        // Response is a complete object
        patientId = normalizeId(newPatientResponse.id);
        newPatient = newPatientResponse as PatientData;
      } else {
        throw new Error("Respuesta inesperada al crear paciente");
      }
      
      toast.success("Paciente registrado con éxito", {
        description: `${values.nombre} ${values.apellidos} ha sido registrado. Ahora puedes asignarle una cita.`,
      });
      
      setOpen(false);
      form.reset();
      
      if (onSuccess) {
        onSuccess(newPatient);
      }
      
    } catch (error: any) {
      console.error("[NewPatientOnlyForm] Error completo:", error);
      
      // Improved error handling
      let errorMessage = "Ocurrió un problema al registrar.";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error("Error al registrar", { 
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Diagnosis options
  const diagnosticoOptions: DiagnosisType[] = [
    "HERNIA INGUINAL", "HERNIA UMBILICAL", "COLECISTITIS", "COLEDOCOLITIASIS",
    "COLANGITIS", "APENDICITIS", "HERNIA HIATAL", "LIPOMA GRANDE",
    "HERNIA INGUINAL RECIDIVANTE", "QUISTE SEBACEO INFECTADO",
    "EVENTRACION ABDOMINAL", "VESICULA (COLECISTITIS CRONICA)", "OTRO"
  ];
  
  // Display map for diagnoses
  const diagnosticoDisplayMap: Record<DiagnosisType, string> = {
    "HERNIA INGUINAL": "Hernia inguinal",
    "HERNIA UMBILICAL": "Hernia umbilical",
    "COLECISTITIS": "Colecistitis",
    "COLEDOCOLITIASIS": "Coledocolitiasis",
    "COLANGITIS": "Colangitis",
    "APENDICITIS": "Apendicitis",
    "HERNIA HIATAL": "Hernia hiatal",
    "LIPOMA GRANDE": "Lipoma grande",
    "HERNIA INGUINAL RECIDIVANTE": "Hernia inguinal recidivante",
    "QUISTE SEBACEO INFECTADO": "Quiste sebáceo infectado",
    "EVENTRACION ABDOMINAL": "Eventración abdominal",
    "VESICULA (COLECISTITIS CRONICA)": "Vesícula (Colecistitis crónica)",
    "OTRO": "Otro"
  };

  // Reset form when opening dialog
  const handleOpenDialog = () => {
    form.reset({
      nombre: "",
      apellidos: "",
      edad: undefined,
      telefono: "",
      email: "",
      diagnostico_principal: undefined,
      comentarios_registro: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(newOpenState) => {
      setOpen(newOpenState);
      if (newOpenState) {
        handleOpenDialog();
      }
    }}>
      <DialogTrigger asChild>
        <Button
          variant={buttonVariant || "secondary"}
          size="sm"
          className={cn("flex items-center gap-2", className)}
          data-component="NewPatientOnlyForm"
        >
          <Plus className="h-4 w-4" />
          <span>{buttonLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(
        "sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6",
        isMobile ? 'w-[95vw]' : ''
      )}>
        <DialogHeader>
          <DialogTitle className={isMobile ? "text-xl" : "text-2xl"}>
            Registrar Nuevo Paciente
          </DialogTitle>
          <DialogDescription className={isMobile ? "text-sm" : ""}>
            Completa la información del paciente. Podrás agendar una cita posteriormente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre(s) <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej. Juan Alberto" 
                        {...field} 
                      />
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
                    <FormLabel>Apellidos <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej. Pérez González" 
                        {...field} 
                      />
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
                      <Input 
                        type="number" 
                        placeholder="Ej. 45" 
                        onChange={(e) => {
                          // Convert value to number or undefined if empty
                          const value = e.target.value === "" ? undefined : Number(e.target.value);
                          field.onChange(value);
                        }}
                        value={field.value ?? ""}
                      />
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
                    <FormLabel>Teléfono <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej. 5512345678" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="ejemplo@correo.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="diagnostico_principal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnóstico Preliminar</FormLabel>
                  <FormControl>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar diagnóstico (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {diagnosticoOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {diagnosticoDisplayMap[option]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Si ya conoces el posible diagnóstico, selecciónalo. Puedes cambiarlo después.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comentarios_registro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notas adicionales sobre el paciente..." 
                      {...field} 
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registrando..." : "Registrar Paciente"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
