import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';
import { renderWithQueryClient, screen, waitFor } from './utils/test-utils';
import userEvent from '@testing-library/user-event';
import NewPatientForm from '@/components/patient-admision/new-patient-form';

// Mock sonner toast
vi.mock('sonner', () => {
  return {
    toast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock Clinic context used by the form
vi.mock('@/contexts/clinic-data-provider', () => {
  return {
    useClinic: () => ({
      fetchSpecificAppointments: vi.fn(async () => ({ data: [] })),
      fetchLeads: vi.fn(async () => ({ data: [] })),
    }),
  };
});

// Simplify Radix Select for testing
vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  const Ctx = React.createContext<{ onValueChange?: (v: string) => void } | undefined>(undefined);
  const Select = ({ onValueChange, children }: any) => (
    <Ctx.Provider value={{ onValueChange }}>{children}</Ctx.Provider>
  );
  const SelectTrigger = ({ children }: any) => <div>{children}</div>;
  const SelectContent = ({ children }: any) => <div>{children}</div>;
  const SelectItem = ({ value, disabled, children }: any) => {
    const ctx = React.useContext(Ctx);
    return (
      <button type="button" disabled={disabled} onClick={() => ctx?.onValueChange?.(value)}>
        {children}
      </button>
    );
  };
  const SelectValue = ({ placeholder }: any) => <span>{placeholder ?? null}</span>;
  return { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
});

// Simplify Popover wrappers
vi.mock('@/components/ui/popover', () => {
  const Pass = ({ children }: any) => <>{children}</>;
  return { Popover: Pass, PopoverTrigger: Pass, PopoverContent: Pass };
});

// Auto-select a date when Calendar mounts
vi.mock('@/components/ui/calendar', async () => {
  const React = await import('react');
  const Calendar = ({ onSelect }: { onSelect: (d: Date) => void }) => {
    const selectedRef = React.useRef(false);
    React.useEffect(() => {
      if (!selectedRef.current) {
        selectedRef.current = true;
        onSelect(new Date('2025-08-20T00:00:00'));
      }
    }, [onSelect]);
    return <div data-testid="calendar-mock" />;
  };
  return { Calendar };
});

// Helper to stub fetch responses
function okJson(data: any, init?: Partial<ResponseInit>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('NewPatientForm (integration)', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.restoreAllMocks();
    // Default fetch mock
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/patient-admission') && init?.method === 'POST') {
        return Promise.resolve(okJson({ success: true, id: 'adm_1' }));
      }
      if (url.includes('/api/patients')) {
        return Promise.resolve(okJson({ data: [] }));
      }
      return Promise.resolve(okJson({ ok: true }));
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('registra un nuevo paciente (happy path)', async () => {
    const onSuccess = vi.fn();

    renderWithQueryClient(<NewPatientForm onSuccess={onSuccess} />);

    // Rellena campos requeridos
    await user.type(screen.getByPlaceholderText('Nombre'), 'Juan');
    await user.type(screen.getByPlaceholderText('Apellidos'), 'Perez');

    // Calendar mock selecciona una fecha automáticamente
    await screen.findByTestId('calendar-mock');

    // Selecciona hora disponible
    const horaBtn = await screen.findByRole('button', { name: /09:30/i });
    await user.click(horaBtn);

    // Envía el formulario
    const submitBtn = screen.getByRole('button', { name: /Registrar Paciente/i });
    await user.click(submitBtn);

    // Aserciones
    const { toast } = await import('sonner');

    await waitFor(() => {
      // onSuccess del hook y toast de éxito
      expect(onSuccess).toHaveBeenCalled();
      expect((toast as any).success).toHaveBeenCalled();
    });

    // Verifica llamada al endpoint correcto con método POST y payload esperado
    const calls = ((global.fetch as any)?.mock?.calls ?? []) as any[];
    const postCall = calls.find(([url, init]) => String(url).includes('/api/patient-admission') && init?.method === 'POST');
    expect(postCall).toBeTruthy();
    const body = JSON.parse(postCall[1].body);
    expect(body.nombre).toBe('Juan');
    expect(body.apellidos).toBe('Perez');
    expect(typeof body.fecha_hora_cita).toBe('string');
  });
});
