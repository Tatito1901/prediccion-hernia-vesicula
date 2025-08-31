// lib/client-errors.ts - UI notifications for errors (client-only)
import { toast } from 'sonner';
import { normalizeError, toUserMessage, type AppError } from '@/lib/errors';

export interface NotifyContext {
  prefix?: string; // e.g. 'Citas', 'Pacientes'
  duration?: number; // ms
}

export function notifyError(err: unknown, ctx?: NotifyContext): AppError {
  const n = normalizeError(err);
  const msg = ctx?.prefix ? `${ctx.prefix}: ${toUserMessage(n)}` : toUserMessage(n);
  toast.error(msg, { duration: ctx?.duration ?? 3500 });
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[UI Error]', n);
  }
  return n;
}

export function notifySuccess(message: string, ctx?: { duration?: number }) {
  toast.success(message, { duration: ctx?.duration ?? 2500 });
}
