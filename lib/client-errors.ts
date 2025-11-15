// lib/client-errors.ts - UI notifications for errors (client-only)
import { toast } from 'sonner';
import { normalizeError, toUserMessage, type AppError } from '@/lib/errors';

export interface NotifyContext {
  prefix?: string; // e.g. 'Citas', 'Pacientes'
  duration?: number; // ms
}

export function notifyError(err: unknown, ctx?: NotifyContext): AppError {
  const n = normalizeError(err);
  const base = toUserMessage(n);
  // Try to append backend reason if present in the JSON payload
  const reason = (() => {
    try {
      const d = n.details as Record<string, unknown> | undefined;
      const r = typeof d?.reason === 'string' ? d.reason : undefined;
      return r && r !== base ? r : undefined;
    } catch { return undefined; }
  })();
  const full = reason ? `${base}: ${reason}` : base;
  const msg = ctx?.prefix ? `${ctx.prefix}: ${full}` : full;
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
