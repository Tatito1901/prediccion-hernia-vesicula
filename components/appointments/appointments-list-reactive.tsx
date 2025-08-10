'use client';

import React, { useMemo } from 'react';
import { useClinic } from '@/contexts/clinic-data-provider';

// Lista reactiva mínima de citas recientes para el Dashboard
// Usa la fuente de verdad unificada del contexto (useClinic)
export function AppointmentsListReactive({ maxItems = 10 }: { maxItems?: number }) {
  const { allAppointments, isLoading, error, refetch } = useClinic();

  const recentAppointments = useMemo(() => {
    if (!allAppointments) return [] as any[];
    // Ordenar por fecha descendente y limitar a maxItems
    return [...allAppointments]
      .filter((a: any) => !!a?.fecha_hora_cita)
      .sort((a: any, b: any) => {
        const da = new Date(a.fecha_hora_cita).getTime();
        const db = new Date(b.fecha_hora_cita).getTime();
        return db - da;
      })
      .slice(0, maxItems);
  }, [allAppointments, maxItems]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Ocurrió un error al cargar las citas.
        <button className="ml-2 underline" onClick={() => refetch()}>Reintentar</button>
      </div>
    );
  }

  if (!recentAppointments.length) {
    return <div className="text-muted-foreground">No hay citas para mostrar.</div>;
  }

  return (
    <div className="space-y-2">
      {recentAppointments.map((appt: any) => {
        const dateLabel = appt?.fecha_hora_cita
          ? new Date(appt.fecha_hora_cita).toLocaleString('es-MX', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })
          : 'Sin fecha';
        const status = String(appt?.estado_cita ?? '').replaceAll('_', ' ');
        const name =
          appt?.nombreCompletoPaciente ||
          appt?.nombrePaciente ||
          appt?.nombre_paciente ||
          appt?.paciente_nombre ||
          appt?.paciente?.nombre ||
          'Paciente';

        return (
          <div key={appt?.id ?? dateLabel + Math.random()} className="flex items-center justify-between p-3 border rounded-md">
            <div className="min-w-0">
              <p className="font-medium truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{dateLabel}</p>
            </div>
            {status && (
              <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 truncate max-w-[40%] text-right">
                {status}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
