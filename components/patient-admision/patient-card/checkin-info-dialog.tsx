"use client";
import React from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, AlertTriangle } from "lucide-react";
import { formatMx } from "@/utils/datetime";
import { Button } from "@/components/ui/button";

export interface CheckInInfoDialogProps {
  open: boolean;
  kind: "tooEarly" | "expired";
  fullName?: string;
  minutes?: number;
  start?: Date;
  end?: Date;
  canNoShow?: boolean;
  canReschedule?: boolean;
  onNoShow?: () => void;
  onReschedule?: () => void;
  onClose: () => void;
}

export function CheckInInfoDialog({
  open,
  kind,
  fullName,
  minutes,
  start,
  end,
  canNoShow,
  canReschedule,
  onNoShow,
  onReschedule,
  onClose,
}: CheckInInfoDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {kind === "tooEarly" ? (
              <>
                <Clock className="h-4 w-4 text-sky-600" />
                Check-in aún no disponible
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Ventana de check-in expirada
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {fullName && (
              <span className="block font-medium text-foreground">{fullName}</span>
            )}
            {kind === "tooEarly" && (
              <span className="block">
                El check-in se habilita 30 minutos antes de la cita
                {start && (
                  <>
                    {" "}(desde {formatMx(start, "HH:mm")}
                    {typeof minutes === "number" && `, faltan ${minutes} min`} ).
                  </>
                )}
              </span>
            )}
            {kind === "expired" && (
              <span className="block">
                La ventana de check-in cerró{end && <> a las {formatMx(end, "HH:mm")}</>}.
                Puedes marcar <strong>No Asistió</strong> o <strong>Reagendar</strong>.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          {kind === "expired" && canNoShow && (
            <Button variant="destructive" onClick={onNoShow}>
              No Asistió
            </Button>
          )}
          {canReschedule && (
            <Button variant="outline" onClick={onReschedule}>
              Reagendar
            </Button>
          )}
          <AlertDialogCancel onClick={onClose}>Cerrar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default CheckInInfoDialog;
