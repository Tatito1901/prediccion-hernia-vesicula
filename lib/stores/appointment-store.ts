// lib/stores/appointment-store.ts - Store de UI para Citas
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// Store UI simplificado
interface AppointmentUIStore {
  selectedAppointmentId: string | null;
  setSelectedAppointmentId: (id: string | null) => void;
  // Aquí se podrían añadir otros estados de UI en el futuro,
  // como el estado de un modal de citas, etc.
}

export const useAppointmentUIStore = create<AppointmentUIStore>()(
  immer((set) => ({
    selectedAppointmentId: null,
    setSelectedAppointmentId: (id) => set((state) => {
      state.selectedAppointmentId = id;
    }),
  }))
);