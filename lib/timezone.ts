// lib/timezone.ts
// Utilidades centralizadas para formateo y conversión de fechas usando la zona horaria de la clínica

import { CLINIC_TIMEZONE } from '@/lib/admission-business-rules';

function toDate(input: Date | string): Date {
  return input instanceof Date ? input : new Date(input);
}

function pad2(n: number): string { return n.toString().padStart(2, '0'); }

// Obtiene el offset (ms) de una fecha para una zona horaria dada usando Intl
export function getTimeZoneOffsetMs(date: Date, timeZone: string = CLINIC_TIMEZONE): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUTC = new Date(`${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}.000Z`);
  return asUTC.getTime() - date.getTime();
}

// Construye un ISO (UTC) a partir de fecha (día) y HH:mm en la zona de la clínica
export function toClinicIsoFromDateAndTime(date: Date, time: string, timeZone: string = CLINIC_TIMEZONE): string {
  const [h, m] = time.split(':').map(Number);
  // Obtener Y-M-D según la zona horaria de la clínica
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const year = Number(parts.find(p => p.type === 'year')?.value ?? '1970');
  const month = Number(parts.find(p => p.type === 'month')?.value ?? '01');
  const day = Number(parts.find(p => p.type === 'day')?.value ?? '01');
  const base = new Date(Date.UTC(year, month - 1, day, h, m, 0, 0));
  const offsetMs = getTimeZoneOffsetMs(base, timeZone);
  return new Date(base.getTime() - offsetMs).toISOString();
}

// Formato "HH:mm" en zona clínica
export function formatClinicTime(date: Date | string, timeZone: string = CLINIC_TIMEZONE): string {
  const d = toDate(date);
  return new Intl.DateTimeFormat('es-MX', {
    timeZone,
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}

// Formato "EEEE d 'de' MMMM" (capitalizado) en zona clínica
export function formatClinicDate(date: Date | string, timeZone: string = CLINIC_TIMEZONE): string {
  const d = toDate(date);
  const parts = new Intl.DateTimeFormat('es-MX', {
    timeZone,
    weekday: 'long', day: 'numeric', month: 'long',
  }).formatToParts(d);
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? '';
  const day = parts.find(p => p.type === 'day')?.value ?? '';
  const month = parts.find(p => p.type === 'month')?.value ?? '';
  const text = `${weekday} ${day} de ${month}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Formato "dd/MM/yyyy 'a las' HH:mm" en zona clínica
export function formatClinicDateTime(date: Date | string, timeZone: string = CLINIC_TIMEZONE): string {
  const d = toDate(date);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value ?? '0000';
  const month = parts.find(p => p.type === 'month')?.value ?? '00';
  const day = parts.find(p => p.type === 'day')?.value ?? '00';
  const time = formatClinicTime(d, timeZone);
  return `${day}/${month}/${year} a las ${time}`;
}

// Identificador de día "yyyy-MM-dd" en zona clínica (útil para comparaciones por fecha)
export function clinicDayId(date: Date | string, timeZone: string = CLINIC_TIMEZONE): string {
  const d = toDate(date);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value ?? '0000';
  const month = parts.find(p => p.type === 'month')?.value ?? '00';
  const day = parts.find(p => p.type === 'day')?.value ?? '00';
  return `${year}-${month}-${day}`;
}

// Formato "dd/MM/yyyy" en zona clínica
export function formatClinicShortDate(date: Date | string, timeZone: string = CLINIC_TIMEZONE): string {
  const d = toDate(date);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const year = parts.find(p => p.type === 'year')?.value ?? '0000';
  const month = parts.find(p => p.type === 'month')?.value ?? '00';
  const day = parts.find(p => p.type === 'day')?.value ?? '00';
  return `${day}/${month}/${year}`;
}

// Formato largo "EEEE, d de MMMM de yyyy" (capitalizado) en zona clínica
export function formatClinicLongDate(date: Date | string, timeZone: string = CLINIC_TIMEZONE): string {
  const d = toDate(date);
  const parts = new Intl.DateTimeFormat('es-MX', {
    timeZone,
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).formatToParts(d);
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? '';
  const day = parts.find(p => p.type === 'day')?.value ?? '';
  const month = parts.find(p => p.type === 'month')?.value ?? '';
  const year = parts.find(p => p.type === 'year')?.value ?? '';
  const text = `${weekday}, ${day} de ${month} de ${year}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Formato local amigable usando Intl: dateStyle medium + timeStyle short en zona clínica
export function formatClinicMediumDateTime(date: Date | string, timeZone: string = CLINIC_TIMEZONE): string {
  const d = toDate(date);
  return new Intl.DateTimeFormat('es-MX', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

// Formato mes corto y año 2 dígitos (ej: "ago 25") en zona clínica
export function formatClinicMonthShortYear(date: Date | string, timeZone: string = CLINIC_TIMEZONE): string {
  const d = toDate(date);
  return new Intl.DateTimeFormat('es-MX', {
    timeZone,
    month: 'short',
    year: '2-digit',
  }).format(d);
}
