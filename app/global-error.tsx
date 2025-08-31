'use client';

import Link from 'next/link';
import { normalizeError, toUserMessage } from '@/lib/errors';
import { logSyncError } from '@/lib/debug-config';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const normalized = normalizeError(error);
  const message = toUserMessage(normalized);

  try {
    logSyncError('Global (root layout) error', error, { digest: error?.digest });
  } catch (_) {
    // no-op
  }

  return (
    <html lang="es">
      <body>
        <div className="min-h-screen w-full flex items-center justify-center p-6">
          <div className="max-w-lg w-full border rounded-lg p-6 bg-background text-foreground shadow-sm">
            <div className="mb-2 text-sm font-medium text-red-600">Error crítico de aplicación</div>
            <h2 className="text-xl font-semibold mb-2">No pudimos cargar la aplicación</h2>
            <p className="text-sm text-muted-foreground mb-4">{message}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
              >
                Reintentar
              </button>
              <Link
                href="/"
                className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-accent"
              >
                Ir al inicio
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
