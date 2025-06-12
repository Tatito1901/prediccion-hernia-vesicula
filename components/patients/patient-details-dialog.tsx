"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppointmentHistory } from "@/components/patient-admision/appointment-history";
import type { PatientData } from "@/app/dashboard/data-model";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PatientStatusEnum } from "@/app/dashboard/data-model";

interface PatientDetailsDialogProps {
  isOpen: boolean;
  patient: PatientData;
  onClose: () => void;
}

export default function PatientDetailsDialog({ isOpen, patient, onClose }: PatientDetailsDialogProps) {
  const {
    nombre,
    apellidos,
    edad,
    telefono,
    email,
    fecha_registro,
    estado_paciente,
    diagnostico_principal,
    notas_paciente,
    id,
  } = patient;

  const fullName = `${nombre} ${apellidos}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Detalles del Paciente</DialogTitle>
          <DialogDescription>Información general y citas de {fullName}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-2">
          {/* Datos básicos */}
          <section className="space-y-1 text-sm mb-4">
            <p>
              <strong>Nombre:</strong> {fullName}
            </p>
            {edad !== undefined && (
              <p>
                <strong>Edad:</strong> {edad}
              </p>
            )}
            {telefono && (
              <p>
                <strong>Teléfono:</strong> {telefono}
              </p>
            )}
            {email && (
              <p>
                <strong>Email:</strong> {email}
              </p>
            )}
            <p>
              <strong>Fecha registro:</strong> {format(new Date(fecha_registro), "dd MMM yyyy", { locale: es })}
            </p>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Estado:</span>
              <Badge variant="outline">{estado_paciente ?? PatientStatusEnum.PENDIENTE_DE_CONSULTA}</Badge>
            </div>
            {diagnostico_principal && (
              <p>
                <strong>Diagnóstico principal:</strong> {diagnostico_principal}
              </p>
            )}
            {notas_paciente && (
              <p>
                <strong>Notas:</strong> {notas_paciente}
              </p>
            )}
          </section>
          <Separator className="my-4" />

          {/* Historial de Citas */}
          <div className="space-y-2">
            <h3 className="font-medium text-base">Historial de Citas</h3>
            <AppointmentHistory patientId={id} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
