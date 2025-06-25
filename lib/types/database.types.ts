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
      appointment_history: {
        Row: {
          appointment_id: string
          created_at: string
          estado_cita_anterior:
            | Database["public"]["Enums"]["appointment_status_enum"]
            | null
          estado_cita_nuevo: Database["public"]["Enums"]["appointment_status_enum"]
          fecha_cambio: string
          fecha_cita_anterior: string | null
          fecha_cita_nueva: string | null
          id: string
          ip_address: string | null
          modificado_por_id: string
          motivo_cambio: string | null
          notas: string | null
          user_agent: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          estado_cita_anterior?:
            | Database["public"]["Enums"]["appointment_status_enum"]
            | null
          estado_cita_nuevo: Database["public"]["Enums"]["appointment_status_enum"]
          fecha_cambio?: string
          fecha_cita_anterior?: string | null
          fecha_cita_nueva?: string | null
          id?: string
          ip_address?: string | null
          modificado_por_id: string
          motivo_cambio?: string | null
          notas?: string | null
          user_agent?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          estado_cita_anterior?:
            | Database["public"]["Enums"]["appointment_status_enum"]
            | null
          estado_cita_nuevo?: Database["public"]["Enums"]["appointment_status_enum"]
          fecha_cambio?: string
          fecha_cita_anterior?: string | null
          fecha_cita_nueva?: string | null
          id?: string
          ip_address?: string | null
          modificado_por_id?: string
          motivo_cambio?: string | null
          notas?: string | null
          user_agent?: string | null
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
            foreignKeyName: "appointment_history_modificado_por_id_fkey"
            columns: ["modificado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          es_primera_vez: boolean | null
          estado_cita: string
          fecha_hora_cita: string
          id: string
          motivo_cita: string
          notas_cita_seguimiento: string | null
          patient_id: string
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          es_primera_vez?: boolean | null
          estado_cita?: string
          fecha_hora_cita: string
          id?: string
          motivo_cita: string
          notas_cita_seguimiento?: string | null
          patient_id: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          es_primera_vez?: boolean | null
          estado_cita?: string
          fecha_hora_cita?: string
          id?: string
          motivo_cita?: string
          notas_cita_seguimiento?: string | null
          patient_id?: string
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
          assigned_at: string | null
          completed_at: string | null
          id: string
          patient_id: string
          status: string
          template_id: number
          token: string | null
        }
        Insert: {
          assigned_at?: string | null
          completed_at?: string | null
          id?: string
          patient_id: string
          status?: string
          template_id: number
          token?: string | null
        }
        Update: {
          assigned_at?: string | null
          completed_at?: string | null
          id?: string
          patient_id?: string
          status?: string
          template_id?: number
          token?: string | null
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
          apellidos: string
          comentarios_registro: string | null
          creado_por_id: string | null
          created_at: string | null
          diagnostico_principal:
            | Database["public"]["Enums"]["diagnosis_enum"]
            | null
          diagnostico_principal_detalle: string | null
          doctor_asignado_id: string | null
          edad: number | null
          email: string | null
          estado_paciente:
            | Database["public"]["Enums"]["patient_status_enum"]
            | null
          etiquetas: string[] | null
          fecha_cirugia_programada: string | null
          fecha_primera_consulta: string | null
          fecha_registro: string
          id: string
          id_legacy: number | null
          nombre: string
          origen_paciente: string | null
          probabilidad_cirugia: number | null
          proximo_contacto: string | null
          telefono: string | null
          ultimo_contacto: string | null
          updated_at: string | null
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
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          created_at: string | null
          id: number
          options: Json | null
          order: number
          question_text: string
          question_type: string
          template_id: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          options?: Json | null
          order: number
          question_text: string
          question_type: string
          template_id: number
        }
        Update: {
          created_at?: string | null
          id?: number
          options?: Json | null
          order?: number
          question_text?: string
          question_type?: string
          template_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_answer_items: {
        Row: {
          answer_text: string | null
          created_at: string | null
          id: string
          question_id: number
          response_id: string
          selected_option_id: number | null
        }
        Insert: {
          answer_text?: string | null
          created_at?: string | null
          id?: string
          question_id: number
          response_id: string
          selected_option_id?: number | null
        }
        Update: {
          answer_text?: string | null
          created_at?: string | null
          id?: string
          question_id?: number
          response_id?: string
          selected_option_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_answer_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answer_items_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answer_items_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "survey_question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_answers: {
        Row: {
          answer_value: string | null
          assigned_survey_id: string
          created_at: string | null
          id: number
          question_id: number
        }
        Insert: {
          answer_value?: string | null
          assigned_survey_id: string
          created_at?: string | null
          id?: number
          question_id: number
        }
        Update: {
          answer_value?: string | null
          assigned_survey_id?: string
          created_at?: string | null
          id?: number
          question_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_assigned_survey_id_fkey"
            columns: ["assigned_survey_id"]
            isOneToOne: false
            referencedRelation: "assigned_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_question_options: {
        Row: {
          created_at: string | null
          id: number
          option_text: string
          order_index: number
          question_id: number
          value_weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          option_text: string
          order_index: number
          question_id: number
          value_weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          option_text?: string
          order_index?: number
          question_id?: number
          value_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          assigned_survey_id: string
          id: string
          patient_id: string
          submitted_at: string | null
        }
        Insert: {
          assigned_survey_id: string
          id?: string
          patient_id: string
          submitted_at?: string | null
        }
        Update: {
          assigned_survey_id?: string
          id?: string
          patient_id?: string
          submitted_at?: string | null
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
      patient_status_enum:
        | "PENDIENTE DE CONSULTA"
        | "CONSULTADO"
        | "EN SEGUIMIENTO"
        | "OPERADO"
        | "NO OPERADO"
        | "INDECISO"
      user_role_enum: "doctor" | "admin" | "recepcion"
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
