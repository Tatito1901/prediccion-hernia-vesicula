import { z } from "zod";
import { DiagnosisEnum } from "@/lib/types";

// Esquema de validación del formulario, ahora centralizado.
export const AdmissionFormSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es requerido."),
  apellidos: z.string().trim().min(2, "Los apellidos son requeridos."),
  edad: z.coerce.number().int().min(0).max(120).nullable(),
  telefono: z.string().trim().min(10, "El teléfono debe tener al menos 10 dígitos."),
  motivoConsulta: z.enum(Object.values(DiagnosisEnum) as [DiagnosisEnum, ...DiagnosisEnum[]], {
    required_error: "Seleccione un motivo de consulta.",
  }),
  fechaConsulta: z.date({
    required_error: "La fecha de la cita es requerida.",
  }),
  horaConsulta: z.string({
    required_error: "La hora de la cita es requerida.",
  }),
  notas: z.string().max(500, "Las notas no pueden exceder los 500 caracteres.").optional(),
});

// Tipo inferido del esquema para usar en los componentes.
export type TAdmissionForm = z.infer<typeof AdmissionFormSchema>;

// Tipo para los datos que se enviarán a la API.
export interface AdmissionPayload {
  nombre: string;
  apellidos: string;
  telefono: string;
  edad: number | null;
  diagnostico_principal: string;
  comentarios_registro?: string;
  fecha_hora_cita: string; // ISO String
  motivo_cita: string;
  doctor_id?: string | null;
}
