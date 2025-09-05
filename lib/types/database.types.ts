export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
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
          intervention_opportunities: Json | null
          model_version: string
          patient_id: string
          positive_indicators: Json | null
          predicted_category: string | null
          propensity_score: number
          risk_factors: Json | null
          survey_response_id: string | null
          talking_points: Json | null
        }
        Insert: {
          appointment_id: string
          confidence_level: number
          generated_at?: string | null
          id?: string
          intervention_opportunities?: Json | null
          model_version: string
          patient_id: string
          positive_indicators?: Json | null
          predicted_category?: string | null
          propensity_score: number
          risk_factors?: Json | null
          survey_response_id?: string | null
          talking_points?: Json | null
        }
        Update: {
          appointment_id?: string
          confidence_level?: number
          generated_at?: string | null
          id?: string
          intervention_opportunities?: Json | null
          model_version?: string
          patient_id?: string
          positive_indicators?: Json | null
          predicted_category?: string | null
          propensity_score?: number
          risk_factors?: Json | null
          survey_response_id?: string | null
          talking_points?: Json | null
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
            foreignKeyName: "ai_predictions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "vw_survey_responses_enriched"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "ai_predictions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_clinical_summary_view"
            referencedColumns: ["patient_id"]
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
          {
            foreignKeyName: "ai_predictions_survey_response_id_fkey"
            columns: ["survey_response_id"]
            isOneToOne: false
            referencedRelation: "vw_survey_responses_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_diagnoses: {
        Row: {
          appointment_id: string
          diagnosis_id: number
          is_primary: boolean | null
        }
        Insert: {
          appointment_id: string
          diagnosis_id: number
          is_primary?: boolean | null
        }
        Update: {
          appointment_id?: string
          diagnosis_id?: number
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_appdiag_appointment"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appdiag_appointment"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "dashboard_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appdiag_appointment"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "vw_survey_responses_enriched"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "fk_appdiag_diagnosis"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
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
          {
            foreignKeyName: "appointment_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "vw_survey_responses_enriched"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      appointment_state_transitions: {
        Row: {
          description: string | null
          from_state:
            | Database["public"]["Enums"]["appointment_status_enum"]
            | null
          id: string
          requires_reason: boolean | null
          role_required: Database["public"]["Enums"]["user_role_enum"] | null
          to_state: Database["public"]["Enums"]["appointment_status_enum"]
        }
        Insert: {
          description?: string | null
          from_state?:
            | Database["public"]["Enums"]["appointment_status_enum"]
            | null
          id?: string
          requires_reason?: boolean | null
          role_required?: Database["public"]["Enums"]["user_role_enum"] | null
          to_state: Database["public"]["Enums"]["appointment_status_enum"]
        }
        Update: {
          description?: string | null
          from_state?:
            | Database["public"]["Enums"]["appointment_status_enum"]
            | null
          id?: string
          requires_reason?: boolean | null
          role_required?: Database["public"]["Enums"]["user_role_enum"] | null
          to_state?: Database["public"]["Enums"]["appointment_status_enum"]
        }
        Relationships: []
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
          duracion_minutos: number
          es_primera_vez: boolean | null
          estado_cita: Database["public"]["Enums"]["appointment_status_enum"]
          fecha_agendamiento: string | null
          fecha_hora_cita: string
          hora_llegada: string | null
          id: string
          modification_count: number
          motivos_consulta: Database["public"]["Enums"]["diagnosis_enum"][]
          notas_breves: string | null
          origen_cita: string | null
          patient_id: string
          probabilidad_cirugia_inicial: number | null
          proxima_cita_sugerida: string | null
          puntualidad: Database["public"]["Enums"]["arrival_status_enum"] | null
          slot: unknown | null
          updated_at: string | null
          version: number | null
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
          duracion_minutos?: number
          es_primera_vez?: boolean | null
          estado_cita?: Database["public"]["Enums"]["appointment_status_enum"]
          fecha_agendamiento?: string | null
          fecha_hora_cita: string
          hora_llegada?: string | null
          id?: string
          modification_count?: number
          motivos_consulta: Database["public"]["Enums"]["diagnosis_enum"][]
          notas_breves?: string | null
          origen_cita?: string | null
          patient_id: string
          probabilidad_cirugia_inicial?: number | null
          proxima_cita_sugerida?: string | null
          puntualidad?:
            | Database["public"]["Enums"]["arrival_status_enum"]
            | null
          slot?: unknown | null
          updated_at?: string | null
          version?: number | null
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
          duracion_minutos?: number
          es_primera_vez?: boolean | null
          estado_cita?: Database["public"]["Enums"]["appointment_status_enum"]
          fecha_agendamiento?: string | null
          fecha_hora_cita?: string
          hora_llegada?: string | null
          id?: string
          modification_count?: number
          motivos_consulta?: Database["public"]["Enums"]["diagnosis_enum"][]
          notas_breves?: string | null
          origen_cita?: string | null
          patient_id?: string
          probabilidad_cirugia_inicial?: number | null
          proxima_cita_sugerida?: string | null
          puntualidad?:
            | Database["public"]["Enums"]["arrival_status_enum"]
            | null
          slot?: unknown | null
          updated_at?: string | null
          version?: number | null
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
            referencedRelation: "patient_clinical_summary_view"
            referencedColumns: ["patient_id"]
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
          appointment_id: string
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
          appointment_id: string
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
          appointment_id?: string
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
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_surveys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "dashboard_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_surveys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "vw_survey_responses_enriched"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "assigned_surveys_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_clinical_summary_view"
            referencedColumns: ["patient_id"]
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
      audit_log_partitioned: {
        Row: {
          id: string | null
          new_data: Json | null
          old_data: Json | null
          operation: string
          performed_at: string
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          id?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          performed_at?: string
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          id?: string | null
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          performed_at?: string
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_queue: {
        Row: {
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string
          table_name: string
          user_id: string | null
          version_after: number | null
          version_before: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id: string
          table_name: string
          user_id?: string | null
          version_after?: number | null
          version_before?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
          user_id?: string | null
          version_after?: number | null
          version_before?: number | null
        }
        Relationships: []
      }
      diagnoses: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "doctor_feedback_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "vw_survey_responses_enriched"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      marketing_sources: {
        Row: {
          id: number
          source_name: string
        }
        Insert: {
          id?: number
          source_name: string
        }
        Update: {
          id?: number
          source_name?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          antecedentes_medicos: string | null
          apellidos: string
          ciudad: string | null
          comentarios_registro: string | null
          contacto_emergencia_nombre: string | null
          contacto_emergencia_telefono: string | null
          creado_por: string | null
          created_at: string | null
          creation_source: string | null
          deleted_at: string | null
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
          genero: Database["public"]["Enums"]["gender_enum"]
          id: string
          marketing_source:
            | Database["public"]["Enums"]["patient_source_enum"]
            | null
          nombre: string
          normalized_phone: string | null
          numero_expediente: string | null
          probabilidad_cirugia: number | null
          search_vector: unknown | null
          seguro_medico: string | null
          telefono: string | null
          updated_at: string | null
          version: number
        }
        Insert: {
          antecedentes_medicos?: string | null
          apellidos: string
          ciudad?: string | null
          comentarios_registro?: string | null
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_telefono?: string | null
          creado_por?: string | null
          created_at?: string | null
          creation_source?: string | null
          deleted_at?: string | null
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
          genero?: Database["public"]["Enums"]["gender_enum"]
          id?: string
          marketing_source?:
            | Database["public"]["Enums"]["patient_source_enum"]
            | null
          nombre: string
          normalized_phone?: string | null
          numero_expediente?: string | null
          probabilidad_cirugia?: number | null
          search_vector?: unknown | null
          seguro_medico?: string | null
          telefono?: string | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          antecedentes_medicos?: string | null
          apellidos?: string
          ciudad?: string | null
          comentarios_registro?: string | null
          contacto_emergencia_nombre?: string | null
          contacto_emergencia_telefono?: string | null
          creado_por?: string | null
          created_at?: string | null
          creation_source?: string | null
          deleted_at?: string | null
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
          genero?: Database["public"]["Enums"]["gender_enum"]
          id?: string
          marketing_source?:
            | Database["public"]["Enums"]["patient_source_enum"]
            | null
          nombre?: string
          normalized_phone?: string | null
          numero_expediente?: string | null
          probabilidad_cirugia?: number | null
          search_vector?: unknown | null
          seguro_medico?: string | null
          telefono?: string | null
          updated_at?: string | null
          version?: number
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
          nombre_completo: string | null
          role: Database["public"]["Enums"]["user_role_enum"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          nombre_completo?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          nombre_completo?: string | null
          role?: Database["public"]["Enums"]["user_role_enum"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_hierarchy: {
        Row: {
          inherits_role: Database["public"]["Enums"]["user_role_enum"]
          role: Database["public"]["Enums"]["user_role_enum"]
        }
        Insert: {
          inherits_role: Database["public"]["Enums"]["user_role_enum"]
          role: Database["public"]["Enums"]["user_role_enum"]
        }
        Update: {
          inherits_role?: Database["public"]["Enums"]["user_role_enum"]
          role?: Database["public"]["Enums"]["user_role_enum"]
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          afectacion_actividades: string | null
          alcaldia_cdmx: string | null
          appointment_id: string
          aseguradora_seleccionada: string | null
          aspectos_mas_importantes: string[] | null
          assigned_survey_id: string
          completed_at: string | null
          completion_time_minutes: number | null
          condiciones_medicas_cronicas: string[] | null
          descripcion_sintoma_principal: string | null
          desde_cuando_sintoma: string | null
          detalles_adicionales_diagnostico: string | null
          diagnostico_previo: boolean | null
          diagnostico_principal_previo: string | null
          estudios_medicos_previos: string | null
          expectativa_principal_tratamiento: string | null
          id: string
          informacion_adicional_importante: string | null
          intensidad_dolor_actual: number | null
          marketing_source_id: number | null
          mayor_beneficio_esperado: string | null
          mayor_preocupacion_cirugia: string | null
          motivo_visita: string | null
          municipio_edomex: string | null
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
          appointment_id: string
          aseguradora_seleccionada?: string | null
          aspectos_mas_importantes?: string[] | null
          assigned_survey_id: string
          completed_at?: string | null
          completion_time_minutes?: number | null
          condiciones_medicas_cronicas?: string[] | null
          descripcion_sintoma_principal?: string | null
          desde_cuando_sintoma?: string | null
          detalles_adicionales_diagnostico?: string | null
          diagnostico_previo?: boolean | null
          diagnostico_principal_previo?: string | null
          estudios_medicos_previos?: string | null
          expectativa_principal_tratamiento?: string | null
          id?: string
          informacion_adicional_importante?: string | null
          intensidad_dolor_actual?: number | null
          marketing_source_id?: number | null
          mayor_beneficio_esperado?: string | null
          mayor_preocupacion_cirugia?: string | null
          motivo_visita?: string | null
          municipio_edomex?: string | null
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
          appointment_id?: string
          aseguradora_seleccionada?: string | null
          aspectos_mas_importantes?: string[] | null
          assigned_survey_id?: string
          completed_at?: string | null
          completion_time_minutes?: number | null
          condiciones_medicas_cronicas?: string[] | null
          descripcion_sintoma_principal?: string | null
          desde_cuando_sintoma?: string | null
          detalles_adicionales_diagnostico?: string | null
          diagnostico_previo?: boolean | null
          diagnostico_principal_previo?: string | null
          estudios_medicos_previos?: string | null
          expectativa_principal_tratamiento?: string | null
          id?: string
          informacion_adicional_importante?: string | null
          intensidad_dolor_actual?: number | null
          marketing_source_id?: number | null
          mayor_beneficio_esperado?: string | null
          mayor_preocupacion_cirugia?: string | null
          motivo_visita?: string | null
          municipio_edomex?: string | null
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
            foreignKeyName: "fk_marketing_source"
            columns: ["marketing_source_id"]
            isOneToOne: false
            referencedRelation: "marketing_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "dashboard_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "vw_survey_responses_enriched"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "survey_responses_assigned_survey_id_fkey"
            columns: ["assigned_survey_id"]
            isOneToOne: true
            referencedRelation: "assigned_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_clinical_summary_view"
            referencedColumns: ["patient_id"]
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
      patient_clinical_summary_view: {
        Row: {
          apellidos: string | null
          estado_paciente:
            | Database["public"]["Enums"]["patient_status_enum"]
            | null
          fecha_nacimiento: string | null
          historial_citas: Json | null
          nombre: string | null
          numero_expediente: string | null
          patient_id: string | null
        }
        Insert: {
          apellidos?: string | null
          estado_paciente?:
            | Database["public"]["Enums"]["patient_status_enum"]
            | null
          fecha_nacimiento?: string | null
          historial_citas?: never
          nombre?: string | null
          numero_expediente?: string | null
          patient_id?: string | null
        }
        Update: {
          apellidos?: string | null
          estado_paciente?:
            | Database["public"]["Enums"]["patient_status_enum"]
            | null
          fecha_nacimiento?: string | null
          historial_citas?: never
          nombre?: string | null
          numero_expediente?: string | null
          patient_id?: string | null
        }
        Relationships: []
      }
      vw_survey_responses_enriched: {
        Row: {
          appointment_id: string | null
          aspectos_mas_importantes: string[] | null
          completed_at: string | null
          completion_time_minutes: number | null
          descripcion_sintoma_principal: string | null
          estado_cita:
            | Database["public"]["Enums"]["appointment_status_enum"]
            | null
          id: string | null
          intensidad_dolor_actual: number | null
          motivo_visita: string | null
          numero_expediente: string | null
          paciente: string | null
          preocupaciones_principales: string[] | null
          severidad_sintomas: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      change_appointment_status: {
        Args: {
          p_appointment_id: string
          p_expected_version: number
          p_new_status: Database["public"]["Enums"]["appointment_status_enum"]
          p_reason?: string
        }
        Returns: Json
      }
      create_patient_and_appointment: {
        Args: {
          p_apellidos: string
          p_comentarios_registro: string
          p_creado_por_id?: string
          p_diagnostico_principal: string
          p_doctor_id?: string
          p_edad: number
          p_email: string
          p_fecha_hora_cita: string
          p_motivo_cita: string
          p_nombre: string
          p_probabilidad_cirugia: number
          p_telefono: string
        }
        Returns: {
          created_appointment_id: string
          created_patient_id: string
          message: string
          success: boolean
        }[]
      }
      create_patient_with_appointment: {
        Args: {
          p_apellidos: string
          p_canal_agendamiento: string
          p_created_by_id: string
          p_doctor_id: string
          p_fecha_hora_cita: string
          p_fecha_nacimiento: string
          p_nombre: string
        }
        Returns: Json
      }
      debug_static_jsonb: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      gbt_bit_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bool_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bool_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bpchar_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_bytea_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_cash_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_cash_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_date_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_date_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_enum_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_enum_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float4_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float4_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_float8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_inet_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int2_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int2_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int4_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int4_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_int8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_intv_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad8_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_macad8_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_numeric_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_oid_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_oid_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_text_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_time_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_time_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_timetz_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_ts_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_ts_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_tstz_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_uuid_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_uuid_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_var_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbt_var_fetch: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey_var_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey_var_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey16_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey16_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey2_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey2_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey32_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey32_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey4_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey4_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey8_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gbtreekey8_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      get_clinical_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_demographic_profile: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_operational_metrics: {
        Args: Record<PropertyKey, never>
        Returns: Json
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
      process_audit_queue: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      reschedule_appointment: {
        Args: {
          p_appointment_id: string
          p_expected_version: number
          p_new_datetime: string
          p_reason: string
        }
        Returns: Json
      }
      rpc_ping: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
      update_appointment_with_validation: {
        Args: {
          p_appointment_id: string
          p_change_reason?: string
          p_expected_version: number
          p_updates: Json
          p_user_id: string
        }
        Returns: Json
      }
      update_appointment_with_version: {
        Args: {
          p_appointment_id: string
          p_expected_version: number
          p_new_status: Database["public"]["Enums"]["appointment_status_enum"]
          p_user_id: string
        }
        Returns: Json
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
      gender_enum: "Hombre" | "Mujer" | "Prefiero no especificar"
      patient_final_status_enum:
        | "EN_SEGUIMIENTO"
        | "OPERADO"
        | "NO_OPERADO"
        | "ALTA_MEDICA"
        | "SEGUNDA_OPINION"
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
      gender_enum: ["Hombre", "Mujer", "Prefiero no especificar"],
      patient_final_status_enum: [
        "EN_SEGUIMIENTO",
        "OPERADO",
        "NO_OPERADO",
        "ALTA_MEDICA",
        "SEGUNDA_OPINION",
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
