'use client';

import React from 'react';
import Link from 'next/link';
import { normalizeError, toUserMessage } from '@/lib/errors';
import { logSyncError } from '@/lib/debug-config';

export interface AppErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  boundaryName?: string;
  onError?: (error: unknown) => void;
  onReset?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: unknown | null;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    const name = this.props.boundaryName || 'AppErrorBoundary';
    // Deshabilitado para evitar bucle de logging con Next.js
    // try {
    //   logSyncError(`${name} caught error`, error, { errorInfo });
    // } catch (_) {
    //   // no-op if logging fails
    // }
    if (this.props.onError) this.props.onError(error);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const normalized = normalizeError(this.state.error ?? '');
    const message = toUserMessage(normalized);

    return (
      <div className="min-h-[40vh] w-full flex items-center justify-center p-6">
        <div className="max-w-lg w-full border rounded-lg p-6 bg-background text-foreground shadow-sm">
          <div className="mb-2 text-sm font-medium text-red-600">Ha ocurrido un error</div>
          <h2 className="text-xl font-semibold mb-2">No pudimos renderizar esta vista</h2>
          <p className="text-sm text-muted-foreground mb-4">{message}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={this.handleReset}
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
    );
  }
}
