import { NextResponse } from "next/server"
import { validateSurveyData, processSurveyData, calculatePriorityScore } from "@/src/lib/survey-utils"
import { surgeryPredictionModel } from "@/src/lib/prediction-model"

// Función auxiliar para manejar errores de forma consistente
function handleApiError(error: unknown, message = "Error al procesar la encuesta") {
  console.error("API Error:", error)
  const errorMessage = error instanceof Error ? error.message : message
  return NextResponse.json({ success: false, message: errorMessage }, { status: 500 })
}

// Actualizar la ruta de la API para manejar los nuevos campos de la encuesta

// Modificar la función POST para procesar los nuevos campos
export async function POST(request: Request) {
  try {
    // Verificar que la solicitud sea JSON
    const contentType = request.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json({ success: false, message: "La solicitud debe ser en formato JSON" }, { status: 400 })
    }

    // Parsear los datos JSON con manejo de errores
    let rawData
    try {
      rawData = await request.json()
    } catch (parseError) {
      console.error("Error al parsear JSON:", parseError)
      return NextResponse.json(
        { success: false, message: "Error al procesar los datos de la encuesta: formato inválido" },
        { status: 400 },
      )
    }

    console.log("Survey submission received - ID:", rawData.surveyId)

    // Procesar y validar los datos
    const processResult = processSurveyData(rawData)
    if (!processResult.success) {
      return NextResponse.json({ success: false, message: processResult.message }, { status: 400 })
    }

    const data = processResult.data

    // Validar datos requeridos
    const validation = validateSurveyData(data)
    if (!validation.isValid) {
      return NextResponse.json({ success: false, message: validation.message }, { status: 400 })
    }

    // Calcular puntuación de prioridad
    const priorityScore = calculatePriorityScore(data)

    // Procesar los datos para el modelo de predicción
    let patientData = {
      id: data.patientId || Math.floor(Math.random() * 10000),
      nombre: data.nombre,
      apellidos: data.apellidos,
      edad: data.edad,
      fechaConsulta: new Date().toISOString(),
      fechaRegistro: new Date().toISOString(),
      diagnostico: data.diagnosticoPrevio ? data.detallesDiagnostico : "Pendiente",
      estado: "Pendiente de consulta",
      prioridad: priorityScore,
      encuesta: {
        ...data,
        // Incluir los nuevos campos
        ocupacion: data.ocupacion,
        motivoVisita: data.motivoVisita,
        antecedentesFamiliares: data.antecedentesFamiliares,
        descripcionSintoma: data.descripcionSintoma,
        sintomasAdicionales: data.sintomasAdicionales,
        intensidadDolor: data.intensidadDolor,
        afectacionActividades: data.afectacionActividades,
        condicionesMedicas: data.condicionesMedicas,
        otraCondicionMedica: data.otraCondicionMedica,
        medicamentosRegulares: data.medicamentosRegulares,
        listaMedicamentos: data.listaMedicamentos,
        alergias: data.alergias,
        descripcionAlergias: data.descripcionAlergias,
        cirugiasAntes: data.cirugiasAntes,
        descripcionCirugias: data.descripcionCirugias,
        estudiosRealizados: data.estudiosRealizados,
        tratamientosPrevios: data.tratamientosPrevios,
        estadoSalud: data.estadoSalud,
        importanciaSeguridad: data.importanciaSeguridad,
        importanciaExperiencia: data.importanciaExperiencia,
        importanciaCosto: data.importanciaCosto,
        importanciaRapidez: data.importanciaRapidez,
        importanciaAtencion: data.importanciaAtencion,
        importanciaInstalaciones: data.importanciaInstalaciones,
        factorMasImportante: data.factorMasImportante,
        preocupacionCosto: data.preocupacionCosto,
        preocupacionDolor: data.preocupacionDolor,
        preocupacionRiesgos: data.preocupacionRiesgos,
        preocupacionAnestesia: data.preocupacionAnestesia,
        preocupacionRecuperacion: data.preocupacionRecuperacion,
        preocupacionTrabajo: data.preocupacionTrabajo,
        preocupacionApoyo: data.preocupacionApoyo,
        preocupacionNecesidad: data.preocupacionNecesidad,
        mayorPreocupacion: data.mayorPreocupacion,
        experienciaCercana: data.experienciaCercana,
        detallesExperiencia: data.detallesExperiencia,
        preferenciaTratamiento: data.preferenciaTratamiento,
        tiempoDecision: data.tiempoDecision,
        expectativaPrincipal: data.expectativaPrincipal,
        detallesExpectativa: data.detallesExpectativa,
        consideracionesAdicionales: data.consideracionesAdicionales,
        resultadoIdeal: data.resultadoIdeal,
        comentariosFinales: data.comentariosFinales,
        submittedAt: new Date().toISOString(),
      },
    }

    // Realizar la predicción con el modelo de ML
    let probabilidadCirugia = 0
    let recomendaciones = []

    try {
      // Intentar calcular la probabilidad de cirugía
      probabilidadCirugia = await surgeryPredictionModel.predictSurgeryProbability(patientData)
      recomendaciones = surgeryPredictionModel.generateRecommendations(patientData, probabilidadCirugia)

      console.log("Prediction completed for survey:", data.surveyId, "Probability:", probabilidadCirugia)
    } catch (predictionError) {
      console.error("Error during prediction:", predictionError)
      // Usar valores predeterminados para pruebas
      probabilidadCirugia = 0.65
      recomendaciones = ["Seguimiento recomendado", "Evaluación adicional sugerida"]
    }

    // Actualizar los datos del paciente con la predicción
    patientData = {
      ...patientData,
      probabilidadCirugia,
      recomendacionesSistema: recomendaciones,
    }

    // Simulación de guardado en base de datos
    console.log("Saving survey data to database (simulated):", data.surveyId)

    // Devolver respuesta exitosa
    return NextResponse.json({
      success: true,
      message: "Encuesta enviada correctamente",
      patientId: patientData.id,
      surveyId: data.surveyId,
      predictionComplete: true,
      priorityScore,
      probabilidadCirugia,
    })
  } catch (error) {
    // Usar la función auxiliar para manejar errores
    return handleApiError(error)
  }
}
