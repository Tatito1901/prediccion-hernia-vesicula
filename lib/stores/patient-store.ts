// lib/stores/patient-store.ts - ¡SIMPLIFICADO!
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// El store ahora solo maneja el ID del paciente seleccionado en la UI
interface PatientUIState {
  selectedPatientId: string | null;
  setSelectedPatientId: (id: string | null) => void;
}

export const usePatientUIStore = create<PatientUIState>()(
  immer((set) => ({
    selectedPatientId: null,
    setSelectedPatientId: (id) => set((state) => {
      state.selectedPatientId = id;
    }),
  }))
);

// NOTA: Los hooks de React Query creados en el paso anterior reemplazan la lógica de fetching
// que estaba aquí antes. Ya puedes eliminar la exportación de `usePatientStore` si no se usa en más sitios.
// Se recomienda buscar en el proyecto `usePatientStore` y reemplazarlo por los nuevos hooks.