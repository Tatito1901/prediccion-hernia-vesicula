import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithQueryClient, screen, waitFor, cleanup } from './utils/test-utils';
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

// Mock Clinic context used by the form with stable references
vi.mock('@/contexts/clinic-data-provider', () => {
  const fetchSpecificAppointments = vi.fn(async () => ({ data: [] }));
  return {
    useClinic: () => ({
      fetchSpecificAppointments,
      // Otros campos del contexto no usados en estos tests pueden omitirse
    }),
  };
});

// Simplify Radix Select for testing
vi.mock('@/components/ui/select', () => {
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

// Auto-select a date when Calendar mounts (once)
vi.mock('@/components/ui/calendar', () => {
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

function json(data: any, init?: Partial<ResponseInit>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('NewPatientForm - errores', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.restoreAllMocks();
    vi.spyOn(global, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/patients')) {
        return Promise.resolve(json({ data: [] }));
      }
      return Promise.resolve(json({ ok: true }));
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('no envía si faltan campos requeridos', async () => {
    renderWithQueryClient(<NewPatientForm onSuccess={vi.fn()} />);

    // Avanzar hasta la última pestaña usando "Siguiente"
    await user.click(screen.getByRole('button', { name: /Siguiente/i }));
    await user.click(screen.getByRole('button', { name: /Siguiente/i }));

    const submitBtn = screen.getByRole('button', { name: /Registrar Paciente/i });
    await user.click(submitBtn);

    await waitFor(() => {
      const calls = ((global.fetch as any)?.mock?.calls ?? []) as any[];
      const postCall = calls.find(([url, init]) => String(url).includes('/api/patient-admission') && init?.method === 'POST');
      expect(postCall).toBeFalsy();
    });
  });

  it('muestra toast.error si el servidor responde 409 Conflicto de horario', async () => {
    // Override POST behavior
    (global.fetch as any).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/api/patient-admission') && init?.method === 'POST') {
        return Promise.resolve(json({ message: 'Conflicto de horario' }, { status: 409 }));
      }
      if (url.includes('/api/patients')) {
        return Promise.resolve(json({ data: [] }));
      }
      return Promise.resolve(json({ ok: true }));
    });

    const onSuccess = vi.fn();
    renderWithQueryClient(<NewPatientForm onSuccess={onSuccess} />);

    // Completar datos personales requeridos antes de ir a Cita
    await user.type(await screen.findByPlaceholderText('Nombre del paciente'), 'Ana');
    await user.type(screen.getByPlaceholderText('Apellidos del paciente'), 'Gomez');

    // Avanzar hasta la última pestaña usando "Siguiente"
    await user.click(screen.getByRole('button', { name: /Siguiente/i }));
    await user.click(screen.getByRole('button', { name: /Siguiente/i }));

    const horaBtn = screen.getByRole('button', { name: /09:30/i });
    await user.click(horaBtn);

    const submitBtn = await screen.findByRole('button', { name: /Registrar Paciente/i });
    await user.click(submitBtn);

    const { toast } = await import('sonner');

    await waitFor(() => {
      expect(onSuccess).not.toHaveBeenCalled();
      expect((toast as any).error).toHaveBeenCalled();
    });
  });
});

