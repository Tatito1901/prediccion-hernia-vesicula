/**
 * Utilidades para el manejo de encuestas
 */

// Actualizar la función validateSurveyData para incluir los nuevos campos requeridos
export function validateSurveyData(data: any) {
  const requiredFields = [
    "nombre",
    "apellidos",
    "edad",
    "telefono",
    "origen",
    "seguroMedico",
    "descripcionSintoma",
    "duracionSintomas",
    "severidadCondicion",
  ]

  const missingFields = requiredFields.filter((field) => !data[field])

  if (missingFields.length > 0) {
    return {
      isValid: false,
      missingFields,
      message: `Faltan campos requeridos: ${missingFields.join(", ")}`,
    }
  }

  return { isValid: true }
}

// Actualizar la función processSurveyData para incluir los nuevos campos
export function processSurveyData(data: any) {
  try {
    // Crear una copia limpia de los datos
    const cleanData = {
      // Datos personales básicos
      nombre: data.nombre || "",
      apellidos: data.apellidos || "",
      edad: Number.parseInt(data.edad) || 0,
      telefono: data.telefono || "",
      email: data.email || "",
      origen: data.origen || "",

      // Nuevos campos de datos personales
      ocupacion: data.ocupacion || "",
      motivoVisita: data.motivoVisita || "",
      diagnosticoPrevio: !!data.diagnosticoPrevio,
      detallesDiagnostico: data.detallesDiagnostico || "",
      antecedentesFamiliares: data.antecedentesFamiliares || "",

      // Información clínica
      seguroMedico: data.seguroMedico || "",
      descripcionSintoma: data.descripcionSintoma || "",
      sintomasAdicionales: Array.isArray(data.sintomasAdicionales) ? data.sintomasAdicionales : [],
      duracionSintomas: data.duracionSintomas || "",
      severidadCondicion: data.severidadCondicion || "",
      intensidadDolor: Number.parseInt(data.intensidadDolor) || 0,
      afectacionActividades: data.afectacionActividades || "",

      // Condiciones médicas y antecedentes
      condicionesMedicas: Array.isArray(data.condicionesMedicas) ? data.condicionesMedicas : [],
      otraCondicionMedica: data.otraCondicionMedica || "",
      medicamentosRegulares: !!data.medicamentosRegulares,
      listaMedicamentos: data.listaMedicamentos || "",
      alergias: !!data.alergias,
      descripcionAlergias: data.descripcionAlergias || "",
      cirugiasAntes: !!data.cirugiasAntes,
      descripcionCirugias: data.descripcionCirugias || "",
      estudiosRealizados: !!data.estudiosRealizados,
      tratamientosPrevios: !!data.tratamientosPrevios,
      estadoSalud: data.estadoSalud || "",

      // Preferencias y expectativas
      importanciaSeguridad: Number.parseInt(data.importanciaSeguridad) || 3,
      importanciaExperiencia: Number.parseInt(data.importanciaExperiencia) || 3,
      importanciaCosto: Number.parseInt(data.importanciaCosto) || 3,
      importanciaRapidez: Number.parseInt(data.importanciaRapidez) || 3,
      importanciaAtencion: Number.parseInt(data.importanciaAtencion) || 3,
      importanciaInstalaciones: Number.parseInt(data.importanciaInstalaciones) || 3,
      factorMasImportante: data.factorMasImportante || "",

      // Preocupaciones
      preocupacionCosto: Number.parseInt(data.preocupacionCosto) || 3,
      preocupacionDolor: Number.parseInt(data.preocupacionDolor) || 3,
      preocupacionRiesgos: Number.parseInt(data.preocupacionRiesgos) || 3,
      preocupacionAnestesia: Number.parseInt(data.preocupacionAnestesia) || 3,
      preocupacionRecuperacion: Number.parseInt(data.preocupacionRecuperacion) || 3,
      preocupacionTrabajo: Number.parseInt(data.preocupacionTrabajo) || 3,
      preocupacionApoyo: Number.parseInt(data.preocupacionApoyo) || 3,
      preocupacionNecesidad: Number.parseInt(data.preocupacionNecesidad) || 3,
      mayorPreocupacion: data.mayorPreocupacion || "",

      // Experiencias y preferencias
      experienciaCercana: data.experienciaCercana || "",
      detallesExperiencia: data.detallesExperiencia || "",
      preferenciaTratamiento: data.preferenciaTratamiento || "",
      tiempoDecision: data.tiempoDecision || "",
      plazoDeseado: data.plazoDeseado || "",
      expectativaPrincipal: data.expectativaPrincipal || "",
      detallesExpectativa: data.detallesExpectativa || "",

      // Comentarios adicionales
      consideracionesAdicionales: data.consideracionesAdicionales || "",
      resultadoIdeal: data.resultadoIdeal || "",
      comentariosFinales: data.comentariosFinales || "",

      // Metadatos
      patientId: data.patientId || null,
      surveyId: data.surveyId || null,
      submittedAt: data.submittedAt || new Date().toISOString(),
    }

    return { success: true, data: cleanData }
  } catch (error) {
    console.error("Error al procesar datos de encuesta:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Error al procesar datos de encuesta",
    }
  }
}

// Actualizar la función calculatePriorityScore para incluir los nuevos campos
export function calculatePriorityScore(data: any) {
  let score = 0

  // Factores de edad
  if (data.edad > 65) score += 10
  else if (data.edad > 50) score += 5

  // Factores de severidad
  if (data.severidadCondicion === "Severa") score += 15
  else if (data.severidadCondicion === "Moderada") score += 8

  // Factores de dolor
  if (data.intensidadDolor >= 8) score += 12
  else if (data.intensidadDolor >= 5) score += 6

  // Factores de limitación
  if (data.afectacionActividades === "severa") score += 15
  else if (data.afectacionActividades === "moderada") score += 8

  // Factores de duración
  if (data.duracionSintomas === "mas_6_meses") score += 10
  else if (data.duracionSintomas === "1_6_meses") score += 7
  else if (data.duracionSintomas === "2_4_semanas") score += 5

  // Factores de comorbilidades
  if (data.condicionesMedicas && data.condicionesMedicas.length > 2) score += 8
  else if (data.condicionesMedicas && data.condicionesMedicas.length > 0) score += 4

  // Factores de urgencia
  if (data.plazoDeseado === "Urgente") score += 15
  else if (data.plazoDeseado === "30 días") score += 10
  else if (data.plazoDeseado === "90 días") score += 5

  // Factores de preferencia de tratamiento
  if (data.preferenciaTratamiento === "quirurgico") score += 8

  // Factores de expectativa
  if (data.expectativaPrincipal === "eliminar_dolor") score += 5

  return score
}
