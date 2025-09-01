import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppointmentStatusEnum } from '@/lib/types';

// Spy-able hook mock
const mockedHook: any = vi.fn();

// Mock dynamic to always render the loading fallback (or nothing)
vi.mock('next/dynamic', () => ({
  default: (_loader: any, options?: { loading?: React.ComponentType }) => {
    return function DynamicStub() {
      const Loading = options?.loading;
      return Loading ? <Loading /> : null;
    };
  },
}));

// Mock toast to avoid side effects
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock PatientModal dynamic import target to just render the trigger
vi.mock('@/components/patient-admision/patient-modal', () => ({
  PatientModal: ({ trigger }: { trigger?: React.ReactNode }) => <>{trigger ?? null}</>,
}));

// Mock the admission appointments hook
vi.mock('@/hooks/use-admission-appointments', () => ({
  useAdmissionAppointments: (...args: any[]) => mockedHook(...args),
}));

// Import after mocks
import PatientAdmission from '@/components/patient-admision/patient-admission';

function makeAppointment(overrides: Partial<any> = {}) {
  return {
    id: 'a-' + Math.random().toString(36).slice(2),
    patient_id: 'p-' + Math.random().toString(36).slice(2),
    fecha_hora_cita: new Date().toISOString(),
    motivos_consulta: ['DOLOR_ABDOMINAL'],
    estado_cita: AppointmentStatusEnum.PROGRAMADA,
    es_primera_vez: false,
    notas_breves: 'Nota breve',
    patients: {
      id: 'p1',
      nombre: 'Juan',
      apellidos: 'Pérez',
      telefono: '5551234567',
      email: 'juan@example.com',
      edad: 35,
      estado_paciente: 'ACTIVO',
      diagnostico_principal: 'HERNIA_UMBILICAL',
    },
    ...overrides,
  };
}

describe('PatientAdmission (integration)', () => {
  beforeEach(() => {
    mockedHook.mockReset();
    mockedHook.mockReturnValue({
      appointments: {
        today: [makeAppointment({ id: 'a1' }), makeAppointment({ id: 'a2' })],
        future: [makeAppointment({ id: 'a3' })],
        past: [makeAppointment({ id: 'a4', estado_cita: AppointmentStatusEnum.COMPLETADA })],
      },
      stats: { today: 2, pending: 1, completed: 1 },
      rescheduledCount: 2,
      isLoading: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('renders header, stats and tab counts; shows rescheduled badge', async () => {
    render(<PatientAdmission />);

    // Header
    expect(screen.getByText('Admisión de Pacientes')).toBeInTheDocument();

    // Stats labels
    expect(screen.getByText('Citas Hoy')).toBeInTheDocument();
    expect(screen.getByText('Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Completadas')).toBeInTheDocument();

    // Tab counts (some environments render duplicate triggers, so use *AllBy*)
    expect(screen.getAllByRole('tab', { name: /Hoy \(2\)/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('tab', { name: /Próximas \(1\)/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('tab', { name: /Anteriores \(1\)/i }).length).toBeGreaterThan(0);

    // Rescheduled badge
    expect(screen.getByText('Reagendadas: 2')).toBeInTheDocument();
  });

  it('switches tabs via user interaction', async () => {
    const user = userEvent.setup();
    render(<PatientAdmission />);

    const tablist = screen.getAllByRole('tablist')[0];
    const todayTab = within(tablist).getAllByRole('tab', { name: /Hoy \(2\)/i })[0];
    const futureTab = within(tablist).getAllByRole('tab', { name: /Próximas \(1\)/i })[0];

    // Initially, "Hoy" should be selected (at least one trigger)
    expect(within(tablist).getAllByRole('tab', { name: /Hoy \(2\)/i }).some(el => el.getAttribute('aria-selected') === 'true')).toBe(true);

    await user.click(futureTab);

    await waitFor(() => {
      const futureMatches = within(tablist).getAllByRole('tab', { name: /Próximas \(1\)/i });
      expect(futureMatches.some(el => el.getAttribute('aria-selected') === 'true')).toBe(true);
    });

    const todayMatches = within(tablist).getAllByRole('tab', { name: /Hoy \(2\)/i });
    expect(todayMatches.every(el => el.getAttribute('aria-selected') !== 'true')).toBe(true);
  });

  it('updates search after debounce and calls the hook with latest search value', async () => {
    render(<PatientAdmission />);

    const input = screen.getAllByPlaceholderText('Buscar paciente...')[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Ana' } });

    // Wait slightly longer than the 300ms debounce
    await new Promise((r) => setTimeout(r, 400));

    const calls = mockedHook.mock.calls as any[];
    expect(calls.length).toBeGreaterThan(0);
    const lastArgs = calls[calls.length - 1]?.[0];
    expect(lastArgs).toBeTruthy();
    expect(lastArgs.search).toBe('Ana');
  });
});
