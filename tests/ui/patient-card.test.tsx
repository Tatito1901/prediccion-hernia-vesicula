import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { AppointmentStatusEnum } from '@/lib/types'
import type { AppointmentWithPatient } from '@/components/patient-admision/admision-types'
import * as datetime from '@/utils/datetime'

// Reuse dynamic mock pattern to avoid loading heavy modals
vi.mock('next/dynamic', () => ({
  default: (_loader: any, options?: { loading?: React.ComponentType }) => {
    return function DynamicStub() {
      const Loading = options?.loading
      return Loading ? <Loading /> : null
    }
  },
}))

// Mock the mutation hook used by PatientCard
const mutateAsync = vi.fn()
vi.mock('@/hooks/use-appointments', () => ({
  useUpdateAppointmentStatus: () => ({ mutateAsync, isPending: false }),
}))

// Import after mocks
import { PatientCard } from '@/components/patient-admision/patient-card'

function makeAppointment(overrides: Partial<AppointmentWithPatient> = {}): AppointmentWithPatient {
  return {
    id: 'appt-1',
    patient_id: 'p-1',
    fecha_hora_cita: '2025-01-15T18:00:00.000Z', // 12:00 MX local in winter
    motivos_consulta: ['DOLOR_ABDOMINAL'],
    estado_cita: AppointmentStatusEnum.PROGRAMADA,
    es_primera_vez: false,
    notas_breves: 'Nota breve',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    patients: {
      id: 'p-1',
      nombre: 'Ana',
      apellidos: 'García',
      telefono: '5550001111',
      email: 'ana@example.com',
      edad: 30,
      estado_paciente: 'activo',
      diagnostico_principal: 'HERNIA_UMBILICAL' as any,
    },
    ...overrides,
  }
}

describe('PatientCard - check-in window UI with mocked mxNow', () => {
  beforeEach(() => {
    mutateAsync.mockReset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows info dialog when too early for check-in', async () => {
    // Now is 17:15Z -> 45 min before appt? For appt at 18:00Z window starts 17:30Z
    vi.spyOn(datetime, 'mxNow').mockReturnValue(new Date('2025-01-15T17:15:00.000Z'))

    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<PatientCard appointment={makeAppointment()} open />)

    // Primary action should be "Registrar Llegada"
    const checkInBtn = await screen.findByRole('button', { name: /Registrar Llegada/i })
    await user.click(checkInBtn)

    // Info dialog for too early
    expect(await screen.findByText('Check-in aún no disponible')).toBeInTheDocument()
    expect(screen.getByText(/El check-in se habilita 30 minutos antes de la cita/i)).toBeInTheDocument()
  })

  it('confirms check-in when window is open', async () => {
    // Now is 17:45Z -> inside window [17:30Z, 18:15Z]
    vi.spyOn(datetime, 'mxNow').mockReturnValue(new Date('2025-01-15T17:45:00.000Z'))

    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const appt = makeAppointment({ id: 'appt-open' })
    render(<PatientCard appointment={appt} open />)

    const checkInBtn = await screen.findByRole('button', { name: /Registrar Llegada/i })
    await user.click(checkInBtn)

    // Confirm dialog appears
    expect(await screen.findByText('Registrar Llegada del Paciente')).toBeInTheDocument()

    const confirmBtn = await screen.findByRole('button', { name: /Confirmar/i })
    mutateAsync.mockResolvedValueOnce({ ...appt, estado_cita: AppointmentStatusEnum.PRESENTE })
    await user.click(confirmBtn)

    expect(mutateAsync).toHaveBeenCalled()
    const payload = mutateAsync.mock.calls[0][0]
    expect(payload).toMatchObject({
      appointmentId: appt.id,
      newStatus: AppointmentStatusEnum.PRESENTE,
    })
  })

  it('shows expired dialog and allows marking no-show', async () => {
    // Now is 18:20Z -> window ended at 18:15Z
    vi.spyOn(datetime, 'mxNow').mockReturnValue(new Date('2025-01-15T18:20:00.000Z'))

    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const appt = makeAppointment({ id: 'appt-expired' })
    render(<PatientCard appointment={appt} open />)

    const checkInBtn = await screen.findByRole('button', { name: /Registrar Llegada/i })
    await user.click(checkInBtn)

    // Expired info dialog
    expect(await screen.findByText('Ventana de check-in expirada')).toBeInTheDocument()

    // Action from the info dialog -> No Asistió -> opens confirm dialog
    const noShowBtn = await screen.findByRole('button', { name: /No Asistió/i })
    await user.click(noShowBtn)

    expect(await screen.findByText('Marcar Inasistencia')).toBeInTheDocument()

    mutateAsync.mockResolvedValueOnce({ ...appt, estado_cita: AppointmentStatusEnum.NO_ASISTIO })
    const confirmBtn = await screen.findByRole('button', { name: /Confirmar/i })
    await user.click(confirmBtn)

    expect(mutateAsync).toHaveBeenCalled()
    const payload = mutateAsync.mock.calls[0][0]
    expect(payload).toMatchObject({
      appointmentId: appt.id,
      newStatus: AppointmentStatusEnum.NO_ASISTIO,
    })
  })
})
