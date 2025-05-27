"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Users, UserPlus, RefreshCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

import { useAppContext } from "@/lib/context/app-context";
import { NewPatientOnlyForm } from "./new-patient-only-form";
import { AppointmentForm } from "./appointment-form";
import type { PatientData } from "@/app/dashboard/data-model";

export function PendingPatientsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const { patients, appointments, fetchPatients, isLoadingPatients } = useAppContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter patients that are pending consultation and without assigned appointments
  const pendingPatients = useMemo(() => {
    if (!patients || !Array.isArray(patients)) return [];

    return patients.filter(patient => {
      // Check if patient has "PENDIENTE DE CONSULTA" status
      if (patient.estado_paciente !== "PENDIENTE DE CONSULTA") {
        return false;
      }

      // Check if patient has no appointments, or if all appointments are canceled or rescheduled
      const patientAppointments = appointments?.filter(app => String(app.patientId) === String(patient.id)) || [];
      
      // If no appointments, patient is pending
      if (patientAppointments.length === 0) {
        return true;
      }
      
      // If all appointments are canceled or rescheduled, patient is also pending
      return patientAppointments.every(app => 
        app.estado === "CANCELADA" || 
        app.estado === "REAGENDADA"
      );
    });
  }, [patients, appointments]);

  // Filter by search
  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return pendingPatients;
    
    const searchLower = searchTerm.toLowerCase().trim();
    return pendingPatients.filter(patient => {
      const fullName = `${patient.nombre} ${patient.apellidos}`.toLowerCase();
      const hasPhone = patient.telefono && patient.telefono.includes(searchTerm);
      
      return fullName.includes(searchLower) || hasPhone;
    });
  }, [pendingPatients, searchTerm]);

  // Refresh patients
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchPatients();
      toast.success("Lista de pacientes actualizada");
    } catch (error) {
      console.error("[PendingPatientsList] Error refreshing:", error);
      toast.error("Error al actualizar la lista");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load patients when component mounts
  useEffect(() => {
    if (fetchPatients) {
      fetchPatients().catch(err => {
        console.error("[PendingPatientsList] Error loading patients:", err);
      });
    }
  }, [fetchPatients]);

  // Callback when a new patient is created
  const handleNewPatientSuccess = (newPatient: PatientData) => {
    console.log("[PendingPatientsList] New patient created:", newPatient.id);
    // Refresh patient list
    handleRefresh();
  };

  // Callback when an appointment is assigned to a patient
  const handleAppointmentSuccess = () => {
    console.log("[PendingPatientsList] Appointment assigned to patient");
    // Refresh list so patient no longer appears as pending
    handleRefresh();
  };

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-700">
      <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-950">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pacientes sin Cita Asignada
            </CardTitle>
            <CardDescription>
              {pendingPatients.length} pacientes pendientes de asignar cita
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <NewPatientOnlyForm 
              buttonVariant="outline"
              buttonLabel="Nuevo Paciente"
              onSuccess={handleNewPatientSuccess}
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1"
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar paciente por nombre o teléfono..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoadingPatients ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        ) : filteredPatients.length > 0 ? (
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-2">
              {filteredPatients.map((patient) => (
                <div 
                  key={patient.id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {patient.nombre} {patient.apellidos}
                      <Badge variant="outline" className="font-normal text-xs">
                        Pendiente
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {patient.telefono || "Sin teléfono"}
                      {patient.edad && ` • ${patient.edad} años`}
                    </div>
                  </div>
                  <AppointmentForm
                    patient={patient}
                    onSuccess={handleAppointmentSuccess}
                    buttonLabel="Agendar Cita"
                    buttonVariant="default"
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400 border border-dashed rounded-md">
            {searchTerm ? (
              <p className="flex flex-col items-center gap-2">
                <Search className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                No se encontraron pacientes que coincidan con "{searchTerm}"
              </p>
            ) : (
              <p className="flex flex-col items-center gap-2">
                <UserPlus className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                No hay pacientes pendientes de asignar cita
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => document.querySelector<HTMLButtonElement>('[data-component="NewPatientOnlyForm"] button')?.click()}
                >
                  Registrar un nuevo paciente
                </Button>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
