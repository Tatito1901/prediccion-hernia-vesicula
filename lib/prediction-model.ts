// Change from "tensorflow.js" to "@tensorflow/tfjs"
import * as tf from "@tensorflow/tfjs"

// Definición de características importantes para el modelo
export const featureNames = [
  "edad",
  "diagnosticoPrevio",
  "seguroMedico_IMSS",
  "seguroMedico_ISSSTE",
  "seguroMedico_SeguroPrivado",
  "seguroMedico_Ninguno",
  "intensidadDolor",
  "duracionSintomas_meses",
  "severidadCondicion_Leve",
  "severidadCondicion_Moderada",
  "severidadCondicion_Severa",
  "diagnostico_HerniaInguinal",
  "diagnostico_HerniaUmbilical",
  "diagnostico_HerniaIncisional",
  "diagnostico_Vesicula",
  "origen_Google",
  "origen_Facebook",
  "origen_Instagram",
  "origen_Recomendacion",
  "origen_SitioWeb",
  "factorImportante_Seguridad",
  "factorImportante_Experiencia",
  "factorImportante_ProcesoRapido",
  "preocupacion_MiedoProcedimiento",
  "preocupacion_TiempoRecuperacion",
  "preocupacion_AusenciaLaboral",
]

// Modelo pre-entrenado (simplificado para demostración)
export class SurgeryPredictionModel {
  private model: tf.LayersModel | null = null

  constructor() {
    // Inicializar el modelo
    this.initModel()
  }

  private async initModel() {
    try {
      // Crear un modelo simple de regresión logística
      const model = tf.sequential()

      // Capa de entrada con el número de características
      model.add(
        tf.layers.dense({
          units: 16,
          activation: "relu",
          inputShape: [featureNames.length],
        }),
      )

      // Capa oculta
      model.add(
        tf.layers.dense({
          units: 8,
          activation: "relu",
        }),
      )

      // Capa de salida (probabilidad de cirugía)
      model.add(
        tf.layers.dense({
          units: 1,
          activation: "sigmoid",
        }),
      )

      // Compilar el modelo
      model.compile({
        optimizer: tf.train.adam(0.01),
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
      })

      this.model = model

      // En un caso real, cargaríamos pesos pre-entrenados
      // await this.model.loadWeights('localstorage://surgery-prediction-model');
    } catch (error) {
      console.error("Error initializing TensorFlow model:", error)
      this.model = null
    }
  }

  // Preprocesar los datos del paciente para el modelo
  public preprocessPatientData(patientData: any): number[] {
    // Convertir los datos del paciente a un vector de características
    const features: number[] = new Array(featureNames.length).fill(0)

    // Asignar valores a las características
    features[0] = patientData.edad / 100 // Normalizar edad
    features[1] = patientData.encuesta?.diagnosticoPrevio ? 1 : 0

    // Seguro médico (one-hot encoding)
    const seguroIndex = ["IMSS", "ISSSTE", "Seguro Privado", "Ninguno"].indexOf(
      patientData.encuesta?.seguroMedico || "",
    )
    if (seguroIndex >= 0) {
      features[2 + seguroIndex] = 1
    }

    // Intensidad del dolor
    features[6] = (patientData.encuesta?.intensidadDolor || 0) / 10

    // Duración de síntomas (convertir a meses aproximados)
    const duracionStr = patientData.encuesta?.duracionSintomas || ""
    let duracionMeses = 0
    if (duracionStr.includes("año")) {
      const años = Number.parseInt(duracionStr.match(/\d+/)?.[0] || "0")
      duracionMeses = años * 12
    } else if (duracionStr.includes("mes")) {
      duracionMeses = Number.parseInt(duracionStr.match(/\d+/)?.[0] || "0")
    } else if (duracionStr.includes("semana")) {
      const semanas = Number.parseInt(duracionStr.match(/\d+/)?.[0] || "0")
      duracionMeses = Math.round(semanas / 4)
    }
    features[7] = duracionMeses / 24 // Normalizar a 2 años máximo

    // Severidad de la condición
    const severidadIndex = ["Leve", "Moderada", "Severa"].indexOf(patientData.encuesta?.severidadCondicion || "")
    if (severidadIndex >= 0) {
      features[8 + severidadIndex] = 1
    }

    // Diagnóstico
    const diagnosticoIndex = ["Hernia Inguinal", "Hernia Umbilical", "Hernia Incisional", "Vesícula"].indexOf(
      patientData.diagnostico || "",
    )
    if (diagnosticoIndex >= 0) {
      features[11 + diagnosticoIndex] = 1
    }

    // Origen del paciente
    const origenIndex = ["Google", "Facebook", "Instagram", "Recomendación", "Sitio Web"].indexOf(
      patientData.encuesta?.origen || "",
    )
    if (origenIndex >= 0) {
      features[15 + origenIndex] = 1
    }

    // Factores importantes
    const factoresImportantes = patientData.encuesta?.factoresImportantes || []
    if (factoresImportantes.includes("Seguridad")) features[20] = 1
    if (factoresImportantes.includes("Experiencia")) features[21] = 1
    if (factoresImportantes.includes("Proceso rápido")) features[22] = 1

    // Preocupaciones
    const preocupaciones = patientData.encuesta?.preocupacionesCirugia || []
    if (preocupaciones.includes("Miedo al procedimiento")) features[23] = 1
    if (preocupaciones.includes("Tiempo de recuperación")) features[24] = 1
    if (preocupaciones.includes("Ausencia laboral")) features[25] = 1

    return features
  }

  // Predecir la probabilidad de cirugía
  public async predictSurgeryProbability(patientData: any): Promise<number> {
    try {
      if (!this.model) {
        await this.initModel()

        // If model is still null after initialization, return a default value
        if (!this.model) {
          console.warn("TensorFlow model not available, returning default probability")
          return 0.5 // Default probability
        }
      }

      // Preprocesar los datos del paciente
      const features = this.preprocessPatientData(patientData)

      // Convertir a tensor
      const inputTensor = tf.tensor2d([features])

      // Realizar la predicción
      const prediction = this.model.predict(inputTensor) as tf.Tensor
      const probabilityArray = await prediction.data()

      // Liberar memoria
      inputTensor.dispose()
      prediction.dispose()

      return probabilityArray[0]
    } catch (error) {
      console.error("Error predicting surgery probability:", error)
      return 0.5 // Default probability in case of error
    }
  }

  // Generar recomendaciones basadas en la predicción y los datos del paciente
  public generateRecommendations(patientData: any, probability: number): string[] {
    const recommendations: string[] = []

    // Categorizar la probabilidad
    let probabilityCategory: "alta" | "media" | "baja"
    if (probability >= 0.7) {
      probabilityCategory = "alta"
      recommendations.push(`Alta probabilidad de cirugía (${(probability * 100).toFixed(0)}%)`)
    } else if (probability >= 0.4) {
      probabilityCategory = "media"
      recommendations.push(`Probabilidad media de cirugía (${(probability * 100).toFixed(0)}%)`)
    } else {
      probabilityCategory = "baja"
      recommendations.push(`Baja probabilidad de cirugía (${(probability * 100).toFixed(0)}%)`)
    }

    // Recomendaciones basadas en la categoría de probabilidad
    if (probabilityCategory === "alta") {
      recommendations.push("Enfatizar experiencia del equipo médico y seguridad del procedimiento")
      recommendations.push("Programar cirugía lo antes posible")

      // Si el paciente está preocupado por el tiempo de recuperación
      if (patientData.encuesta?.preocupacionesCirugia?.includes("Tiempo de recuperación")) {
        recommendations.push("Enfatizar recuperación rápida y protocolo post-operatorio")
      }
    } else if (probabilityCategory === "media") {
      recommendations.push("Paciente indeciso, enfocarse en resolver sus principales preocupaciones")

      // Identificar las principales preocupaciones
      const preocupaciones = patientData.encuesta?.preocupacionesCirugia || []
      if (preocupaciones.includes("Miedo al procedimiento")) {
        recommendations.push("Compartir testimonios de pacientes satisfechos")
        recommendations.push("Explicar detalladamente el procedimiento para reducir ansiedad")
      }

      if (preocupaciones.includes("Tiempo de recuperación") || preocupaciones.includes("Ausencia laboral")) {
        recommendations.push("Enfatizar recuperación rápida y posibilidad de reincorporación temprana")
      }

      recommendations.push("Programar seguimiento en 1-2 semanas")
    } else {
      recommendations.push("Paciente con baja probabilidad de cirugía")

      // Si tiene diagnóstico que normalmente requiere cirugía
      if (["Hernia Inguinal", "Vesícula"].includes(patientData.diagnostico || "")) {
        recommendations.push("Explicar riesgos de no operarse a largo plazo")
        recommendations.push("Proporcionar material educativo sobre su condición")
      }

      recommendations.push("Programar seguimiento en 3 meses")
      recommendations.push("Registrar en sistema CRM para seguimiento telefónico")
    }

    return recommendations
  }
}

// Instancia global del modelo
export const surgeryPredictionModel = new SurgeryPredictionModel()
