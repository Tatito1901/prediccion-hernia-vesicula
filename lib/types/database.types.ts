export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_predictions: {
        Row: {
          id: string
          appointment_id: string
          survey_response_id: string | null
          patient_id: string
          propensity_score: number
          confidence_level: number
          predicted_category: string | null
          talking_points: string[] | null
          intervention_opportunities: string[] | null
          risk_factors: string[] | null
          positive_indicators: string[] | null
          model_version: string
          generated_at: string | null
        }
        Insert: {
          id?: string
          appointment_id: string
          survey_response_id?: string | null
          patient_id: string
          propensity_score: number
          confidence_level: number
          predicted_category?: string | null
          talking_points?: string[] | null
          intervention_opportunities?: string[] | null
          risk_factors?: string[] | null
          positive_indicators?: string[] | null
          model_version: string
          generated_at?: string | null
        }
        Update: {
          id?: string
          appointment_id?: string
          survey_response_id?: string | null
          patient_id?: string
          propensity_score?: number
          confidence_level?: number
          predicted_category?: string | null
          talking_points?: string[] | null
          intervention_opportunities?: string[] | null
          risk_factors?: string[] | null
          positive_indicators?: string[] | null
          model_version?: string
          generated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_predictions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_predictions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
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
          id: string
          appointment_id: string
          field_changed: string
          value_before: string | null
          value_after: string
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
        }
        Insert: {
          id?: string
          appointment_id: string
          field_changed: string
          value_before?: string | null
          value_after: string
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
        }
        Update: {
          id?: string
          appointment_id?: string
          field_changed?: string
          value_before?: string | null
          value_after?: string
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string | null
          fecha_hora_cita: string
          motivos_consulta: string[]
          descripcion_motivos: string | null
          estado_cita: Database["public"]["Enums"]["appointment_status_enum"]
          es_primera_vez: boolean | null
          origen_cita: string | null
          canal_agendamiento: string | null
          hora_llegada: string | null
          puntualidad: Database["public"]["Enums"]["puntualidad_enum"] | null
          decision_final: Database["public"]["Enums"]["surgical_decision_enum"]
          probabilidad_cirugia_inicial: number | null
          diagnostico_final: Database["public"]["Enums"]["diagnosis_enum"] | null
          notas_breves: string | null
          proxima_cita_sugerida: string | null
          created_at: string | null
          updated_at: string | null
          agendado_por: string | null
          fecha_agendamiento: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id?: string | null
          fecha_hora_cita: string
          motivos_consulta: string[]
          descripcion_motivos?: string | null
          estado_cita?: Database["public"]["Enums"]["appointment_status_enum"]
          es_primera_vez?: boolean | null
          origen_cita?: string | null
          canal_agendamiento?: string | null
          hora_llegada?: string | null
          puntualidad?: Database["public"]["Enums"]["puntualidad_enum"] | null
          decision_final?: Database["public"]["Enums"]["surgical_decision_enum"]
          probabilidad_cirugia_inicial?: number | null
          diagnostico_final?: Database["public"]["Enums"]["diagnosis_enum"] | null
          notas_breves?: string | null
          proxima_cita_sugerida?: string | null
          created_at?: string | null
          updated_at?: string | null
          agendado_por?: string | null
          fecha_agendamiento?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string | null
          fecha_hora_cita?: string
          motivos_consulta?: string[]
          descripcion_motivos?: string | null
          estado_cita?: Database["public"]["Enums"]["appointment_status_enum"]
          es_primera_vez?: boolean | null
          origen_cita?: string | null
          canal_agendamiento?: string | null
          hora_llegada?: string | null
          puntualidad?: Database["public"]["Enums"]["puntualidad_enum"] | null
          decision_final?: Database["public"]["Enums"]["surgical_decision_enum"]
          probabilidad_cirugia_inicial?: number | null
          diagnostico_final?: Database["public"]["Enums"]["diagnosis_enum"] | null
          notas_breves?: string | null
          proxima_cita_sugerida?: string | null
          created_at?: string | null
          updated_at?: string | null
          agendado_por?: string | null
          fecha_agendamiento?: string | null
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
          id: string
          patient_id: string
          appointment_id: string | null
          template_id: number | null
          status: Database["public"]["Enums"]["survey_status_enum"]
          assigned_at: string | null
          completed_at: string | null
          access_token: string | null
          assigned_by: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          appointment_id?: string | null
          template_id?: number | null
          status?: Database["public"]["Enums"]["survey_status_enum"]
          assigned_at?: string | null
          completed_at?: string | null
          access_token?: string | null
          assigned_by?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          appointment_id?: string | null
          template_id?: number | null
          status?: Database["public"]["Enums"]["survey_status_enum"]
          assigned_at?: string | null
          completed_at?: string | null
          access_token?: string | null
          assigned_by?: string | null
        }
        Relationships: [
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
      patients: {
        Row: {
          id: string
          lead_id: string | null
          nombre: string | null
          apellidos: string | null
          telefono: string | null
          email: string | null
          fecha_nacimiento: string | null
          edad: number | null
          genero: string | null
          diagnostico_principal: Database["public"]["Enums"]["diagnosis_enum"]
          antecedentes_medicos: string | null
          ciudad: string | null
          estado: string | null
          contacto_emergencia_nombre: string | null
          contacto_emergencia_telefono: string | null
          estado_paciente: Database["public"]["Enums"]["patient_status_enum"]
          fecha_registro: string | null
          fecha_ultima_consulta: string | null
          numero_expediente: string | null
          seguro_medico: string | null
          creation_source: string | null
          marketing_source: Database["public"]["Enums"]["marketing_source_enum"] | null
          comentarios_registro: string | null
          created_at: string | null
          updated_at: string | null
          creado_por: string | null
        }
        Insert: {
          apellidos: string
          comentarios_registro?: string | null
          creado_por_id?: string | null
          created_at?: string | null
          diagnostico_principal?:
            | Database["public"]["Enums"]["diagnosis_enum"]
            | null
          diagnostico_principal_detalle?: string | null
          doctor_asignado_id?: string | null
          edad?: number | null
          email?: string | null
          estado_paciente?:
            | Database["public"]["Enums"]["patient_status_enum"]
            | null
          etiquetas?: string[] | null
          fecha_cirugia_programada?: string | null
          fecha_primera_consulta?: string | null
          fecha_registro?: string
          id?: string
          id_legacy?: number | null
          nombre: string
          origen_paciente?: string | null
          probabilidad_cirugia?: number | null
          proximo_contacto?: string | null
          telefono?: string | null
          ultimo_contacto?: string | null
          updated_at?: string | null
        }
        Update: {
          apellidos?: string
          comentarios_registro?: string | null
          creado_por_id?: string | null
          created_at?: string | null
          diagnostico_principal?:
            | Database["public"]["Enums"]["diagnosis_enum"]
            | null
          diagnostico_principal_detalle?: string | null
          doctor_asignado_id?: string | null
          edad?: number | null
          email?: string | null
          estado_paciente?:
            | Database["public"]["Enums"]["patient_status_enum"]
            | null
          etiquetas?: string[] | null
          fecha_cirugia_programada?: string | null
          fecha_primera_consulta?: string | null
          fecha_registro?: string
          id?: string
          id_legacy?: number | null
          nombre?: string
          origen_paciente?: string | null
          probabilidad_cirugia?: number | null
          proximo_contacto?: string | null
          telefono?: string | null
          ultimo_contacto?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_creado_por_id_fkey"
            columns: ["creado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_doctor_asignado_id_fkey"
            columns: ["doctor_asignado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_feedback: {
        Row: {
          id: string
          appointment_id: string
          ai_prediction_id: string | null
          doctor_id: string
          prediction_accuracy_rating: number | null
          prediction_usefulness_rating: number | null
          actual_decision: Database["public"]["Enums"]["surgical_decision_enum"]
          factors_that_influenced_acceptance: string | null
          factors_that_prevented_acceptance: string | null
          missed_important_factors: string[] | null
          submitted_at: string | null
        }
        Insert: {
          id?: string
          appointment_id: string
          ai_prediction_id?: string | null
          doctor_id: string
          prediction_accuracy_rating?: number | null
          prediction_usefulness_rating?: number | null
          actual_decision: Database["public"]["Enums"]["surgical_decision_enum"]
          factors_that_influenced_acceptance?: string | null
          factors_that_prevented_acceptance?: string | null
          missed_important_factors?: string[] | null
          submitted_at?: string | null
        }
        Update: {
          id?: string
          appointment_id?: string
          ai_prediction_id?: string | null
          doctor_id?: string
          prediction_accuracy_rating?: number | null
          prediction_usefulness_rating?: number | null
          actual_decision?: Database["public"]["Enums"]["surgical_decision_enum"]
          factors_that_influenced_acceptance?: string | null
          factors_that_prevented_acceptance?: string | null
          missed_important_factors?: string[] | null
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
        ]
      }
      leads: {
        Row: {
          id: string
          full_name: string
          phone_number: string
          email: string | null
          channel: Database["public"]["Enums"]["channel_enum"]
          motive: Database["public"]["Enums"]["motive_enum"]
          notes: string | null
          follow_up_notes: string | null
          status: Database["public"]["Enums"]["lead_status_enum"]
          lead_intent: Database["public"]["Enums"]["lead_intent_enum"] | null
          last_contact_date: string | null
          next_follow_up_date: string | null
          created_at: string | null
          updated_at: string | null
          registered_by: string | null
          assigned_to: string | null
          converted_at: string | null
          conversion_notes: string | null
        }
        Insert: {
          id?: string
          full_name: string
          phone_number: string
          email?: string | null
          channel: Database["public"]["Enums"]["channel_enum"]
          motive: Database["public"]["Enums"]["motive_enum"]
          notes?: string | null
          follow_up_notes?: string | null
          status?: Database["public"]["Enums"]["lead_status_enum"]
          lead_intent?: Database["public"]["Enums"]["lead_intent_enum"] | null
          last_contact_date?: string | null
          next_follow_up_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          registered_by?: string | null
          assigned_to?: string | null
          converted_at?: string | null
          conversion_notes?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          phone_number?: string
          email?: string | null
          channel?: Database["public"]["Enums"]["channel_enum"]
          motive?: Database["public"]["Enums"]["motive_enum"]
          notes?: string | null
          follow_up_notes?: string | null
          status?: Database["public"]["Enums"]["lead_status_enum"]
          lead_intent?: Database["public"]["Enums"]["lead_intent_enum"] | null
          last_contact_date?: string | null
          next_follow_up_date?: string | null
          created_at?: string | null
          updated_at?: string | null
          registered_by?: string | null
          assigned_to?: string | null
          converted_at?: string | null
          conversion_notes?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          role: Database["public"]["Enums"]["user_role_enum"] | null
          avatar_url: string | null
          updated_at: string | null
          created_at: string | null
          is_active: boolean | null
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"] | null
          avatar_url?: string | null
          updated_at?: string | null
          created_at?: string | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"] | null
          avatar_url?: string | null
          updated_at?: string | null
          created_at?: string | null
          is_active?: boolean | null
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          id: string
          assigned_survey_id: string
          appointment_id: string
          patient_id: string
          nombre_completo: string | null
          apellidos_completos: string | null
          edad: number | null
          ubicacion_origen: string | null
          alcaldia_cdmx: string | null
          municipio_edomex: string | null
          otro_municipio_edomex: string | null
          otra_ciudad_municipio: string | null
          como_nos_conocio: string | null
          otro_como_nos_conocio: string | null
          motivo_visita: string | null
          diagnostico_previo: boolean | null
          diagnostico_principal_previo: string | null
          detalles_adicionales_diagnostico: string | null
          condiciones_medicas_cronicas: string[] | null
          otra_condicion_medica: string | null
          estudios_medicos_previos: string | null
          seguro_medico: string | null
          otro_seguro_medico: string | null
          aseguradora_seleccionada: string | null
          otra_aseguradora: string | null
          descripcion_sintoma_principal: string | null
          desde_cuando_sintoma: string | null
          severidad_sintomas: string | null
          intensidad_dolor_actual: number | null
          sintomas_adicionales: string[] | null
          afectacion_actividades: string | null
          aspectos_mas_importantes: string[] | null
          preocupaciones_principales: string[] | null
          mayor_preocupacion_cirugia: string | null
          plazo_resolucion_ideal: string | null
          tiempo_toma_decision: string | null
          expectativa_principal_tratamiento: string | null
          informacion_adicional_importante: string | null
          mayor_beneficio_esperado: string | null
          completed_at: string | null
          completion_time_minutes: number | null
        }
        Insert: {
          id?: string
          assigned_survey_id: string
          appointment_id: string
          patient_id: string
          nombre_completo?: string | null
          apellidos_completos?: string | null
          edad?: number | null
          ubicacion_origen?: string | null
          alcaldia_cdmx?: string | null
          municipio_edomex?: string | null
          otro_municipio_edomex?: string | null
          otra_ciudad_municipio?: string | null
          como_nos_conocio?: string | null
          otro_como_nos_conocio?: string | null
          motivo_visita?: string | null
          diagnostico_previo?: boolean | null
          diagnostico_principal_previo?: string | null
          detalles_adicionales_diagnostico?: string | null
          condiciones_medicas_cronicas?: string[] | null
          otra_condicion_medica?: string | null
          estudios_medicos_previos?: string | null
          seguro_medico?: string | null
          otro_seguro_medico?: string | null
          aseguradora_seleccionada?: string | null
          otra_aseguradora?: string | null
          descripcion_sintoma_principal?: string | null
          desde_cuando_sintoma?: string | null
          severidad_sintomas?: string | null
          intensidad_dolor_actual?: number | null
          sintomas_adicionales?: string[] | null
          afectacion_actividades?: string | null
          aspectos_mas_importantes?: string[] | null
          preocupaciones_principales?: string[] | null
          mayor_preocupacion_cirugia?: string | null
          plazo_resolucion_ideal?: string | null
          tiempo_toma_decision?: string | null
          expectativa_principal_tratamiento?: string | null
          informacion_adicional_importante?: string | null
          mayor_beneficio_esperado?: string | null
          completed_at?: string | null
          completion_time_minutes?: number | null
        }
        Update: {
          id?: string
          assigned_survey_id?: string
          appointment_id?: string
          patient_id?: string
          nombre_completo?: string | null
          apellidos_completos?: string | null
          edad?: number | null
          ubicacion_origen?: string | null
          alcaldia_cdmx?: string | null
          municipio_edomex?: string | null
          otro_municipio_edomex?: string | null
          otra_ciudad_municipio?: string | null
          como_nos_conocio?: string | null
          otro_como_nos_conocio?: string | null
          motivo_visita?: string | null
          diagnostico_previo?: boolean | null
          diagnostico_principal_previo?: string | null
          detalles_adicionales_diagnostico?: string | null
          condiciones_medicas_cronicas?: string[] | null
          otra_condicion_medica?: string | null
          estudios_medicos_previos?: string | null
          seguro_medico?: string | null
          otro_seguro_medico?: string | null
          aseguradora_seleccionada?: string | null
          otra_aseguradora?: string | null
          descripcion_sintoma_principal?: string | null
          desde_cuando_sintoma?: string | null
          severidad_sintomas?: string | null
          intensidad_dolor_actual?: number | null
          sintomas_adicionales?: string[] | null
          afectacion_actividades?: string | null
          aspectos_mas_importantes?: string[] | null
          preocupaciones_principales?: string[] | null
          mayor_preocupacion_cirugia?: string | null
          plazo_resolucion_ideal?: string | null
          tiempo_toma_decision?: string | null
          expectativa_principal_tratamiento?: string | null
          informacion_adicional_importante?: string | null
          mayor_beneficio_esperado?: string | null
          completed_at?: string | null
          completion_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_assigned_survey_id_fkey"
            columns: ["assigned_survey_id"]
            isOneToOne: false
            referencedRelation: "assigned_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          title?: string
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          id: string
          metric_name: string
          metric_category: string
          metric_value: number
          period_start: string | null
          period_end: string | null
          calculated_at: string | null
        }
        Insert: {
          id?: string
          metric_name: string
          metric_category: string
          metric_value: number
          period_start?: string | null
          period_end?: string | null
          calculated_at?: string | null
        }
        Update: {
          id?: string
          metric_name?: string
          metric_category?: string
          metric_value?: number
          period_start?: string | null
          period_end?: string | null
          calculated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      appointment_status_enum:
        | "PROGRAMADA"
        | "CONFIRMADA"
        | "CANCELADA"
        | "COMPLETADA"
        | "NO ASISTIO"
        | "PRESENTE"
        | "REAGENDADA"
      channel_enum:
        | "TELEFONO"
        | "WHATSAPP"
        | "FACEBOOK"
        | "INSTAGRAM"
        | "REFERENCIA"
        | "PAGINA_WEB"
        | "OTRO"
      diagnosis_enum:
        | "HERNIA INGUINAL"
        | "HERNIA UMBILICAL"
        | "COLECISTITIS"
        | "COLEDOCOLITIASIS"
        | "COLANGITIS"
        | "APENDICITIS"
        | "HERNIA HIATAL"
        | "LIPOMA GRANDE"
        | "HERNIA INGUINAL RECIDIVANTE"
        | "QUISTE SEBACEO INFECTADO"
        | "EVENTRACION ABDOMINAL"
        | "VESICULA (COLECISTITIS CRONICA)"
        | "OTRO"
        | "HERNIA SPIGEL"
        | "SIN_DIAGNOSTICO"
      lead_intent_enum:
        | "ONLY_WANTS_INFORMATION"
        | "WANTS_TO_SCHEDULE_APPOINTMENT"
        | "WANTS_TO_COMPARE_PRICES"
        | "OTHER"

    export type LeadIntent = Enums<"lead_intent_enum">
      lead_status_enum:
        | "NUEVO"
        | "CONTACTADO"
        | "CALIFICADO"
        | "CITA_PROGRAMADA"
        | "NO_INTERESADO"
        | "PERDIDO"
        | "CONVERTIDO"
      marketing_source_enum:
        | "FACEBOOK_ADS"
        | "GOOGLE_ADS"
        | "ORGANICO"
        | "REFERENCIA"
        | "OTRO"
      motive_enum:
        | "CONSULTA_GENERAL"
        | "DOLOR_ABDOMINAL"
        | "HERNIA"
        | "VESICULA"
        | "SEGUIMIENTO"
        | "OTRO"
      patient_status_enum:
        | "potencial"
        | "PENDIENTE DE CONSULTA"
        | "CONSULTADO"
        | "EN SEGUIMIENTO"
        | "OPERADO"
        | "NO OPERADO"
        | "INDECISO"
      puntualidad_enum:
        | "PUNTUAL"
        | "RETRASO_LEVE"
        | "RETRASO_MODERADO"
        | "RETRASO_SEVERO"
      surgical_decision_enum:
        | "PENDIENTE"
        | "ACEPTADA"
        | "RECHAZADA"
        | "DIFERIDA"
        | "EN_CONSIDERACION"
      survey_status_enum:
        | "assigned"
        | "in_progress"
        | "completed"
        | "expired"
      user_role_enum:
        | "doctor"
        | "admin"
        | "recepcion"
        | "asistente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status_enum: [
        "PROGRAMADA",
        "CONFIRMADA",
        "CANCELADA",
        "COMPLETADA",
        "NO ASISTIO",
        "PRESENTE",
        "REAGENDADA",
      ],
      diagnosis_enum: [
        "HERNIA INGUINAL",
        "HERNIA UMBILICAL",
        "COLECISTITIS",
        "COLEDOCOLITIASIS",
        "COLANGITIS",
        "APENDICITIS",
        "HERNIA HIATAL",
        "LIPOMA GRANDE",
        "HERNIA INGUINAL RECIDIVANTE",
        "QUISTE SEBACEO INFECTADO",
        "EVENTRACION ABDOMINAL",
        "VESICULA (COLECISTITIS CRONICA)",
        "OTRO",
        "HERNIA SPIGEL",
      ],
      patient_status_enum: [
        "PENDIENTE DE CONSULTA",
        "CONSULTADO",
        "EN SEGUIMIENTO",
        "OPERADO",
        "NO OPERADO",
        "INDECISO",
      ],
      user_role_enum: ["doctor", "admin", "recepcion"],
    },
  },
} as const
