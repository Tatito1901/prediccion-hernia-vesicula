'use client';

import React, { useMemo } from 'react';
import { useClinic } from '@/contexts/clinic-data-provider';
import { AppointmentStatusEnum } from '@/lib/types';
import type { AppointmentStatus, Appointment, ExtendedAppointment } from '@/lib/types';
import { formatClinicMediumDateTime } from '@/lib/timezone';

// Lista reactiva mínima de citas recientes para el Dashboard
// Usa la fuente de verdad unificada del contexto (useClinic)
export function AppointmentsListReactive({ maxItems = 10 }: { maxItems?: number }) {
  const { allAppointments, isLoading, error, refetch } = useClinic();

  const recentAppointments = useMemo<(Appointment | ExtendedAppointment)[]>(() => {
    if (!allAppointments) return [];
    const list = (allAppointments ?? []) as (Appointment | ExtendedAppointment)[];
    // Ordenar por fecha descendente y limitar a maxItems
    return [...list]
      .filter((a) => !!a?.fecha_hora_cita)
      .sort((a, b) => {
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
          <div key={i} className="h-12 w-full bg-muted/60 dark:bg-slate-800/60 animate-pulse rounded-md" />
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
    return (
      <div className="text-sm text-muted-foreground border rounded-md p-6 text-center">
        No hay citas para mostrar.
      </div>
    );
  }

  return (
    <div className="divide-y rounded-md border bg-white dark:bg-slate-900">
      {recentAppointments.map((appt) => {
        const dateLabel = appt?.fecha_hora_cita
          ? (() => {
              try {
                return formatClinicMediumDateTime(appt.fecha_hora_cita);
              } catch {
                return 'Sin fecha';
              }
            })()
          : 'Sin fecha';
        const rawStatusValue = String(appt?.estado_cita ?? '').toUpperCase();
        // Normalizar variantes masculinas/femeninas (p.ej., CANCELADO -> CANCELADA)
        const normalizedStatus: AppointmentStatus =
          rawStatusValue.startsWith('CANCELAD')
            ? AppointmentStatusEnum.CANCELADA
            : (rawStatusValue as AppointmentStatus);
        const status = String(normalizedStatus).replaceAll('_', ' ');
        const name = (() => {
          const p = (appt as ExtendedAppointment).patients;
          const composed = [p?.nombre, p?.apellidos].filter(Boolean).join(' ').trim();
          return composed || 'Paciente';
        })();

        const initial = (name || 'P').trim().charAt(0).toUpperCase();
        const statusClasses = (() => {
          switch (normalizedStatus) {
            case AppointmentStatusEnum.COMPLETADA:
              return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
            case AppointmentStatusEnum.PROGRAMADA:
              return 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300';
            case AppointmentStatusEnum.CANCELADA:
              return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
            case AppointmentStatusEnum.NO_ASISTIO:
              return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
            default:
              return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
          }
        })();

        return (
          <div key={appt?.id ?? dateLabel + Math.random()} className="flex items-center justify-between p-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{name}</p>
                <p className="text-xs text-muted-foreground truncate">{dateLabel}</p>
              </div>
            </div>
            {status && (
              <span className={`text-[10px] md:text-xs px-2 py-1 rounded whitespace-nowrap ${statusClasses}`}>
                {status}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

