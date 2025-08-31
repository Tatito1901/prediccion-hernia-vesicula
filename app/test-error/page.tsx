'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TestErrorPage() {
  const [mode, setMode] = useState<'none' | 'render' | 'effect'>('none');

  if (mode === 'render') {
    // Simula un error durante el render (lo captura el ErrorBoundary)
    throw new Error('Error de prueba: lanzado durante el render');
  }

  useEffect(() => {
    if (mode === 'effect') {
      // Simula un error en un efecto (también lo captura el ErrorBoundary)
      throw new Error('Error de prueba: lanzado dentro de useEffect');
    }
  }, [mode]);

  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center p-6">
      <div className="max-w-xl w-full border rounded-lg p-6 bg-background text-foreground shadow-sm space-y-4">
        <h1 className="text-2xl font-semibold">Página de prueba de errores</h1>
        <p className="text-sm text-muted-foreground">
          Usa los botones para lanzar errores y validar el comportamiento de los Error Boundaries.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setMode('render')}
            className="px-3 py-2 rounded-md bg-red-600 text-white hover:opacity-90"
          >
            Lanzar error en render
          </button>
          <button
            type="button"
            onClick={() => setMode('effect')}
            className="px-3 py-2 rounded-md bg-amber-600 text-white hover:opacity-90"
          >
            Lanzar error en useEffect
          </button>
          <button
            type="button"
            onClick={() => setMode('none')}
            className="px-3 py-2 rounded-md border hover:bg-accent"
          >
            Reset local
          </button>
        </div>
        <div className="pt-4 border-t">
          <Link href="/" className="text-sm underline">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
