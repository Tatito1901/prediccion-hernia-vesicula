export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_predictions: {
        Row: {
          appointment_id: string
          confidence_level: number
          generated_at: string | null
          id: string
          intervention_opportunities: string[] | null
          model_version: string
          patient_id: string
          positive_indicators: string[] | null
          predicted_category: string | null
          propensity_score: number
          risk_factors: string[] | null
          survey_response_id: string | null
          talking_points: string[] | null
        }
        Insert: {
          appointment_id: string
          confidence_level: number
          generated_at?: string | null
          id?: string
          intervention_opportunities?: string[] | null
          model_version: string
          patient_id: string
          positive_indicators?: string[] | null
          predicted_category?: string | null
          propensity_score: number
          risk_factors?: string[] | null
          survey_response_id?: string | null
          talking_points?: string[] | null
        }
        Update: {
          appointment_id?: string
          confidence_level?: number
          generated_at?: string | null
          id?: string
          intervention_opportunities?: string[] | null
          model_version?: string
          patient_id?: string
          positive_indicators?: string[] | null
          predicted_category?: string | null
          propensity_score?: number
          risk_factors?: string[] | null
          survey_response_id?: string | null
          talking_points?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_predictions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_predictions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "dashboard_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_predictions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_predictions_survey_response_id_fkey"
            columns: ["survey_response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_history: {
        Row: {
          appointment_id: string
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          field_changed: string
          id: string
          value_after: string
          value_before: string | null
        }
        Insert: {
          appointment_id: string
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          field_changed: string
          id?: string
          value_after: string
          value_before?: string | null
        }
        Update: {
          appointment_id?: string
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          field_changed?: string
          id?: string
          value_after?: string
          value_before?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "dashboard_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          agendado_por: string | null
          canal_agendamiento: string | null
          created_at: string | null
          decision_final:
            | Database["public"]["Enums"]["surgical_decision_enum"]
            | null
          descripcion_motivos: string | null
          diagnostico_final:
            | Database["public"]["Enums"]["diagnosis_enum"]
            | null
          doctor_id: string | null
          es_primera_vez: boolean | null
          estado_cita: Database["public"]["Enums"]["appointment_status_enum"]
          fecha_agendamiento: string | null
          fecha_hora_cita: string
          hora_llegada: string | null
          id: string
          motivos_consulta: Database["public"]["Enums"]["diagnosis_enum"][]
          notas_breves: string | null
          origen_cita: string | null
          patient_id: string
          probabilidad_cirugia_inicial: number | null
          proxima_cita_sugerida: string | null
          puntualidad: Database["public"]["Enums"]["arrival_status_enum"] | null
          updated_at: string | null
        }
        Insert: {
          agendado_por?: string | null
          canal_agendamiento?: string | null
          created_at?: string | null
          decision_final?:
            | Database["public"]["Enums"]["surgical_decision_enum"]
            | null
          descripcion_motivos?: string | null
          diagnostico_final?:
            | Database["public"]["Enums"]["diagnosis_enum"]
            | null
          doctor_id?: string | null
          es_primera_vez?: boolean | null
          estado_cita?: Database["public"]["Enums"]["appointment_status_enum"]
          fecha_agendamiento?: string | null
          fecha_hora_cita: string
          hora_llegada?: string | null
          id?: string
          motivos_consulta: Database["public"]["Enums"]["diagnosis_enum"][]
          notas_breves?: string | null
          origen_cita?: string | null
          patient_id: string
          probabilidad_cirugia_inicial?: number | null
          proxima_cita_sugerida?: string | null
          puntualidad?:
            | Database["public"]["Enums"]["arrival_status_enum"]
            | null
          updated_at?: string | null
        }
        Update: {
          agendado_por?: string | null
          canal_agendamiento?: string | null
          created_at?: string | null
          decision_final?:
            | Database["public"]["Enums"]["surgical_decision_enum"]
            | null
          descripcion_motivos?: string | null
          diagnostico_final?:
            | Database["public"]["Enums"]["diagnosis_enum"]
            | null
          doctor_id?: string | null
          es_primera_vez?: boolean | null
          estado_cita?: Database["public"]["Enums"]["appointment_status_enum"]
          fecha_agendamiento?: string | null
          fecha_hora_cita?: string
          hora_llegada?: string | null
          id?: string
          motivos_consulta?: Database["public"]["Enums"]["diagnosis_enum"][]
          notas_breves?: string | null
          origen_cita?: string | null
          patient_id?: string
          probabilidad_cirugia_inicial?: number | null
          proxima_cita_sugerida?: string | null
          puntualidad?:
            | Database["public"]["Enums"]["arrival_status_enum"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      assigned_surveys: {
        Row: {
          access_token: string | null
          appointment_id: string | null
          assigned_at: string | null
          assigned_by: string | null
          completed_at: string | null
          id: string
          patient_id: string
          status: Database["public"]["Enums"]["survey_status_enum"] | null
          template_id: number | null
        }
        Insert: {
          access_token?: string | null
          appointment_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          id?: string
          patient_id: string
          status?: Database["public"]["Enums"]["survey_status_enum"] | null
          template_id?: number | null
        }
        Update: {
          access_token?: string | null
          appointment_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          completed_at?: string | null
          id?: string
          patient_id?: string
          status?: Database["public"]["Enums"]["survey_status_enum"] | null
          template_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assigned_surveys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_surveys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "dashboard_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_surveys_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_surveys_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_feedback: {
        Row: {
          actual_decision: Database["public"]["Enums"]["surgical_decision_enum"]
          ai_prediction_id: string | null
          appointment_id: string
          doctor_id: string
          factors_that_influenced_acceptance: string | null
          factors_that_prevented_acceptance: string | null
          id: string
          missed_important_factors: string[] | null
          prediction_accuracy_rating: number | null
          prediction_usefulness_rating: number | null
          submitted_at: string | null
        }
        Insert: {
          actual_decision: Database["public"]["Enums"]["surgical_decision_enum"]
          ai_prediction_id?: string | null
          appointment_id: string
          doctor_id: string
          factors_that_influenced_acceptance?: string | null
          factors_that_prevented_acceptance?: string | null
          id?: string
          missed_important_factors?: string[] | null
          prediction_accuracy_rating?: number | null
          prediction_usefulness_rating?: number | null
          submitted_at?: string | null
        }
        Update: {
          actual_decision?: Database["public"]["Enums"]["surgical_decision_enum"]
          ai_prediction_id?: string | null
          appointment_id?: string
          doctor_id?: string
          factors_that_influenced_acceptance?: string | null
          factors_that_prevented_acceptance?: string | null
          id?: string
          missed_important_factors?: string[] | null
          prediction_accuracy_rating?: number | null
          prediction_usefulness_rating?: number | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_feedback_ai_prediction_id_fkey"
            columns: ["ai_prediction_id"]
            isOneToOne: false
            referencedRelation: "ai_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_feedback_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_feedback_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "dashboard_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      // leads table removed from schema
      patients: {
        Row: {
          antecedentes_medicos: string | null
          apellidos: string | null
          ciudad: string | null
          comentarios_registro: string | null
          contacto_emergencia_nombre: string | null
          contacto_emergencia_telefono: string | null
          creado_por: string | null
          created_at: string | null
          creation_source: string | null
          diagnostico_principal:
            | Database["public"]["Enums"]["diagnosis_enum"]
            | null
          edad: number | null
          email: string | null
          estado: string | null
          estado_paciente:
            | Database["public"]["Enums"]["patient_status_enum"]
            | null
          fecha_nacimiento: string | null
          fecha_registro: string | null
          fecha_ultima_consulta: string | null
          genero: string | null
          id: string
          marketing_source:
            | Database["public"]["Enums"]["patient_source_enum"]
            | null
          nombre: string | null
          numero_expediente: string | null
          seguro_medico: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          antecedentes_medicos?: string | null
          apellidos?: string | null
          ciudad?: string | null
          comentarios_registro?: string | null
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_telefono?: string | null
          creado_por?: string | null
          created_at?: string | null
          creation_source?: string | null
          diagnostico_principal?:
            | Database["public"]["Enums"]["diagnosis_enum"]
            | null
          edad?: number | null
          email?: string | null
          estado?: string | null
          estado_paciente?:
            | Database["public"]["Enums"]["patient_status_enum"]
            | null
          fecha_nacimiento?: string | null
          fecha_registro?: string | null
          fecha_ultima_consulta?: string | null
          genero?: string | null
          id?: string
          marketing_source?:
            | Database["public"]["Enums"]["patient_source_enum"]
            | null
          nombre?: string | null
          numero_expediente?: string | null
          seguro_medico?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          antecedentes_medicos?: string | null
          apellidos?: string | null
          ciudad?: string | null
          comentarios_registro?: string | null
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_telefono?: string | null
          creado_por?: string | null
          created_at?: string | null
          creation_source?: string | null
          diagnostico_principal?:
            | Database["public"]["Enums"]["diagnosis_enum"]
            | null
          edad?: number | null
          email?: string | null
          estado?: string | null
          estado_paciente?:
            | Database["public"]["Enums"]["patient_status_enum"]
            | null
          fecha_nacimiento?: string | null
          fecha_registro?: string | null
          fecha_ultima_consulta?: string | null
          genero?: string | null
          id?: string
          marketing_source?:
            | Database["public"]["Enums"]["patient_source_enum"]
            | null
          nombre?: string | null
          numero_expediente?: string | null
          seguro_medico?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["user_role_enum"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role_enum"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role_enum"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          afectacion_actividades: string | null
          alcaldia_cdmx: string | null
          apellidos_completos: string | null
          appointment_id: string
          aseguradora_seleccionada: string | null
          aspectos_mas_importantes: string[] | null
          assigned_survey_id: string
          como_nos_conocio: string | null
          completed_at: string | null
          completion_time_minutes: number | null
          condiciones_medicas_cronicas: string[] | null
          descripcion_sintoma_principal: string | null
          desde_cuando_sintoma: string | null
          detalles_adicionales_diagnostico: string | null
          diagnostico_previo: boolean | null
          diagnostico_principal_previo: string | null
          edad: number | null
          estudios_medicos_previos: string | null
          expectativa_principal_tratamiento: string | null
          id: string
          informacion_adicional_importante: string | null
          intensidad_dolor_actual: number | null
          mayor_beneficio_esperado: string | null
          mayor_preocupacion_cirugia: string | null
          motivo_visita: string | null
          municipio_edomex: string | null
          nombre_completo: string | null
          otra_aseguradora: string | null
          otra_ciudad_municipio: string | null
          otra_condicion_medica: string | null
          otro_como_nos_conocio: string | null
          otro_municipio_edomex: string | null
          otro_seguro_medico: string | null
          patient_id: string
          plazo_resolucion_ideal: string | null
          preocupaciones_principales: string[] | null
          seguro_medico: string | null
          severidad_sintomas: string | null
          sintomas_adicionales: string[] | null
          tiempo_toma_decision: string | null
          ubicacion_origen: string | null
        }
        Insert: {
          afectacion_actividades?: string | null
          alcaldia_cdmx?: string | null
          apellidos_completos?: string | null
          appointment_id: string
          aseguradora_seleccionada?: string | null
          aspectos_mas_importantes?: string[] | null
          assigned_survey_id: string
          como_nos_conocio?: string | null
          completed_at?: string | null
          completion_time_minutes?: number | null
          condiciones_medicas_cronicas?: string[] | null
          descripcion_sintoma_principal?: string | null
          desde_cuando_sintoma?: string | null
          detalles_adicionales_diagnostico?: string | null
          diagnostico_previo?: boolean | null
          diagnostico_principal_previo?: string | null
          edad?: number | null
          estudios_medicos_previos?: string | null
          expectativa_principal_tratamiento?: string | null
          id?: string
          informacion_adicional_importante?: string | null
          intensidad_dolor_actual?: number | null
          mayor_beneficio_esperado?: string | null
          mayor_preocupacion_cirugia?: string | null
          motivo_visita?: string | null
          municipio_edomex?: string | null
          nombre_completo?: string | null
          otra_aseguradora?: string | null
          otra_ciudad_municipio?: string | null
          otra_condicion_medica?: string | null
          otro_como_nos_conocio?: string | null
          otro_municipio_edomex?: string | null
          otro_seguro_medico?: string | null
          patient_id: string
          plazo_resolucion_ideal?: string | null
          preocupaciones_principales?: string[] | null
          seguro_medico?: string | null
          severidad_sintomas?: string | null
          sintomas_adicionales?: string[] | null
          tiempo_toma_decision?: string | null
          ubicacion_origen?: string | null
        }
        Update: {
          afectacion_actividades?: string | null
          alcaldia_cdmx?: string | null
          apellidos_completos?: string | null
          appointment_id?: string
          aseguradora_seleccionada?: string | null
          aspectos_mas_importantes?: string[] | null
          assigned_survey_id?: string
          como_nos_conocio?: string | null
          completed_at?: string | null
          completion_time_minutes?: number | null
          condiciones_medicas_cronicas?: string[] | null
          descripcion_sintoma_principal?: string | null
          desde_cuando_sintoma?: string | null
          detalles_adicionales_diagnostico?: string | null
          diagnostico_previo?: boolean | null
          diagnostico_principal_previo?: string | null
          edad?: number | null
          estudios_medicos_previos?: string | null
          expectativa_principal_tratamiento?: string | null
          id?: string
          informacion_adicional_importante?: string | null
          intensidad_dolor_actual?: number | null
          mayor_beneficio_esperado?: string | null
          mayor_preocupacion_cirugia?: string | null
          motivo_visita?: string | null
          municipio_edomex?: string | null
          nombre_completo?: string | null
          otra_aseguradora?: string | null
          otra_ciudad_municipio?: string | null
          otra_condicion_medica?: string | null
          otro_como_nos_conocio?: string | null
          otro_municipio_edomex?: string | null
          otro_seguro_medico?: string | null
          patient_id?: string
          plazo_resolucion_ideal?: string | null
          preocupaciones_principales?: string[] | null
          seguro_medico?: string | null
          severidad_sintomas?: string | null
          sintomas_adicionales?: string[] | null
          tiempo_toma_decision?: string | null
          ubicacion_origen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "dashboard_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_assigned_survey_id_fkey"
            columns: ["assigned_survey_id"]
            isOneToOne: false
            referencedRelation: "assigned_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: number
          is_active: boolean | null
          title: string
          version: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          title: string
          version?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: number
          is_active?: boolean | null
          title?: string
          version?: string | null
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          calculated_at: string | null
          id: string
          metric_category: string
          metric_name: string
          metric_value: number
          period_end: string | null
          period_start: string | null
        }
        Insert: {
          calculated_at?: string | null
          id?: string
          metric_category: string
          metric_name: string
          metric_value: number
          period_end?: string | null
          period_start?: string | null
        }
        Update: {
          calculated_at?: string | null
          id?: string
          metric_category?: string
          metric_name?: string
          metric_value?: number
          period_end?: string | null
          period_start?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      conversion_metrics: {
        Row: {
          conversion_rate_percent: number | null
          month: string | null
          surgeries_scheduled: number | null
          total_acceptances: number | null
          total_appointments: number | null
        }
        Relationships: []
      }
      dashboard_appointments: {
        Row: {
          decision_final:
            | Database["public"]["Enums"]["surgical_decision_enum"]
            | null
          doctor_name: string | null
          es_primera_vez: boolean | null
          estado_cita:
            | Database["public"]["Enums"]["appointment_status_enum"]
            | null
          estado_paciente:
            | Database["public"]["Enums"]["patient_status_enum"]
            | null
          fecha_hora_cita: string | null
          id: string | null
          patient_name: string | null
          probabilidad_cirugia_inicial: number | null
          telefono: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_patient_and_appointment: {
        Args: {
          p_nombre: string
          p_apellidos: string
          p_telefono: string
          p_email: string
          p_edad: number
          p_diagnostico_principal: string
          p_comentarios_registro: string
          p_probabilidad_cirugia: number
          p_fecha_hora_cita: string
          p_motivo_cita: string
          p_doctor_id?: string
          p_creado_por_id?: string
        }
        Returns: {
          success: boolean
          message: string
          created_patient_id: string
          created_appointment_id: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
    }
    Enums: {
      appointment_status_enum:
        | "PROGRAMADA"
        | "CONFIRMADA"
        | "PRESENTE"
        | "COMPLETADA"
        | "CANCELADA"
        | "REAGENDADA"
        | "NO_ASISTIO"
        | "EN_CONSULTA"
      arrival_status_enum: "A_TIEMPO" | "TEMPRANO" | "TARDE"
      diagnosis_enum:
        | "HERNIA_INGUINAL"
        | "HERNIA_UMBILICAL"
        | "HERNIA_INCISIONAL"
        | "HERNIA_EPIGASTRICA"
        | "HERNIA_HIATAL"
        | "COLELITIASIS"
        | "COLECISTITIS_AGUDA"
        | "COLECISTITIS_CRONICA"
        | "COLEDOCOLITIASIS"
        | "POLIPOS_VESICULA"
        | "OTRO_DIAGNOSTICO"
        | "SIN_DIAGNOSTICO"
      patient_source_enum:
        | "pagina_web_google"
        | "redes_sociales"
        | "recomendacion_medico"
        | "recomendacion_familiar_amigo"
        | "seguro_medico"
        | "otro"
      patient_status_enum:
        | "potencial"
        | "activo"
        | "operado"
        | "no_operado"
        | "en_seguimiento"
        | "inactivo"
        | "alta_medica"
      surgical_decision_enum:
        | "CIRUGIA_PROGRAMADA"
        | "SEGUIMIENTO"
        | "CIRUGIA_RECHAZADA"
        | "CIRUGIA_URGENTE_ACEPTADA"
        | "CIRUGIA_URGENTE_RECHAZADA"
        | "NO_CANDIDATO"
        | "PENDIENTE"
        | "SEGUNDA_OPINION_SOLICITADA"
      survey_status_enum:
        | "assigned"
        | "in_progress"
        | "completed"
        | "expired"
        | "skipped"
        | "partially_completed"
      user_role_enum: "admin" | "doctor" | "asistente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status_enum: [
        "PROGRAMADA",
        "CONFIRMADA",
        "PRESENTE",
        "COMPLETADA",
        "CANCELADA",
        "REAGENDADA",
        "NO_ASISTIO",
        "EN_CONSULTA",
      ],
      arrival_status_enum: ["A_TIEMPO", "TEMPRANO", "TARDE"],
      diagnosis_enum: [
        "HERNIA_INGUINAL",
        "HERNIA_UMBILICAL",
        "HERNIA_INCISIONAL",
        "HERNIA_EPIGASTRICA",
        "HERNIA_HIATAL",
        "COLELITIASIS",
        "COLECISTITIS_AGUDA",
        "COLECISTITIS_CRONICA",
        "COLEDOCOLITIASIS",
        "POLIPOS_VESICULA",
        "OTRO_DIAGNOSTICO",
        "SIN_DIAGNOSTICO",
      ],
      patient_source_enum: [
        "pagina_web_google",
        "redes_sociales",
        "recomendacion_medico",
        "recomendacion_familiar_amigo",
        "seguro_medico",
        "otro",
      ],
      patient_status_enum: [
        "potencial",
        "activo",
        "operado",
        "no_operado",
        "en_seguimiento",
        "inactivo",
        "alta_medica",
      ],
      surgical_decision_enum: [
        "CIRUGIA_PROGRAMADA",
        "SEGUIMIENTO",
        "CIRUGIA_RECHAZADA",
        "CIRUGIA_URGENTE_ACEPTADA",
        "CIRUGIA_URGENTE_RECHAZADA",
        "NO_CANDIDATO",
        "PENDIENTE",
        "SEGUNDA_OPINION_SOLICITADA",
      ],
      survey_status_enum: [
        "assigned",
        "in_progress",
        "completed",
        "expired",
        "skipped",
        "partially_completed",
      ],
      user_role_enum: ["admin", "doctor", "asistente"],
    },
  },
} as const
