// components/patients/patient-list-validation.tsx - Componente de validación para lista de pacientes
import React from 'react';
import { useClinic } from '@/contexts/clinic-data-provider';
import { Patient } from '@/lib/types';

// Componente de validación para probar que los datos se cargan correctamente
// después de la refactorización del hook unificado
export const PatientListValidation = () => {
  const {
    allPatients,
    paginatedPatients,
    patientsPagination,
    patientsStats,
    isLoading,
    error
  } = useClinic();

  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <h2>Error en la carga de datos</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
        <h2>Cargando datos de pacientes...</h2>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
      <h2>Validación de datos de pacientes</h2>
      
      <div className="mt-4">
        <h3>Datos esenciales:</h3>
        <p>Total de pacientes activos: {allPatients.length}</p>
      </div>
      
      <div className="mt-4">
        <h3>Datos paginados:</h3>
        <p>Total de pacientes en página actual: {paginatedPatients.length}</p>
        <p>Página {patientsPagination.page} de {patientsPagination.totalPages}</p>
        <p>Total de pacientes: {patientsPagination.totalCount}</p>
      </div>
      
      {patientsStats && (
        <div className="mt-4">
          <h3>Estadísticas:</h3>
          <p>Tasa de encuestas: {patientsStats.surveyRate}%</p>
          <p>Consultas pendientes: {patientsStats.pendingConsults}</p>
        </div>
      )}
    </div>
  );
};
