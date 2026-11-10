// Generado con el MCP de Supabase (generate_typescript_types). No editar a mano: regenerar tras cada migración.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      babies: {
        Row: {
          activo: boolean
          creado_en: string
          fecha_nacimiento: string
          foto_path: string | null
          household_id: string
          id: string
          nombre: string
          semanas_gestacion: number | null
          sexo: string
        }
        Insert: {
          activo?: boolean
          creado_en?: string
          fecha_nacimiento: string
          foto_path?: string | null
          household_id: string
          id?: string
          nombre: string
          semanas_gestacion?: number | null
          sexo: string
        }
        Update: {
          activo?: boolean
          creado_en?: string
          fecha_nacimiento?: string
          foto_path?: string | null
          household_id?: string
          id?: string
          nombre?: string
          semanas_gestacion?: number | null
          sexo?: string
        }
        Relationships: [
          {
            foreignKeyName: "babies_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      event_revisions: {
        Row: {
          creado_en: string
          editado_por: string | null
          eliminado_en: string | null
          ended_at: string | null
          event_id: string
          household_id: string
          id: number
          notas: string | null
          payload: Json
          source: Database["public"]["Enums"]["origen_registro"] | null
          started_at: string
          version: number
        }
        Insert: {
          creado_en?: string
          editado_por?: string | null
          eliminado_en?: string | null
          ended_at?: string | null
          event_id: string
          household_id: string
          id?: never
          notas?: string | null
          payload: Json
          source?: Database["public"]["Enums"]["origen_registro"] | null
          started_at: string
          version: number
        }
        Update: {
          creado_en?: string
          editado_por?: string | null
          eliminado_en?: string | null
          ended_at?: string | null
          event_id?: string
          household_id?: string
          id?: never
          notas?: string | null
          payload?: Json
          source?: Database["public"]["Enums"]["origen_registro"] | null
          started_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_revisions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_revisions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          baby_id: string
          client_op_id: string | null
          creado_en: string
          editado_en: string | null
          editado_por: string | null
          eliminado_en: string | null
          ended_at: string | null
          household_id: string
          id: string
          logged_by: string
          notas: string | null
          payload: Json
          source: Database["public"]["Enums"]["origen_registro"]
          started_at: string
          tipo: Database["public"]["Enums"]["tipo_evento"]
          version: number
        }
        Insert: {
          baby_id: string
          client_op_id?: string | null
          creado_en?: string
          editado_en?: string | null
          editado_por?: string | null
          eliminado_en?: string | null
          ended_at?: string | null
          household_id: string
          id?: string
          logged_by?: string
          notas?: string | null
          payload?: Json
          source?: Database["public"]["Enums"]["origen_registro"]
          started_at: string
          tipo: Database["public"]["Enums"]["tipo_evento"]
          version?: number
        }
        Update: {
          baby_id?: string
          client_op_id?: string | null
          creado_en?: string
          editado_en?: string | null
          editado_por?: string | null
          eliminado_en?: string | null
          ended_at?: string | null
          household_id?: string
          id?: string
          logged_by?: string
          notas?: string | null
          payload?: Json
          source?: Database["public"]["Enums"]["origen_registro"]
          started_at?: string
          tipo?: Database["public"]["Enums"]["tipo_evento"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "events_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_settings: {
        Row: {
          alarmas_activas: boolean
          editado_en: string
          hora_dormir: string
          household_id: string
          noche_ui_desde: string
          noche_ui_hasta: string
          noche_ui_modo: string
          notificaciones: Json
          sueno_noche_desde: string
          sueno_noche_hasta: string
          unidad_longitud: string
          unidad_peso: string
          unidad_volumen: string
          ventanas_modo: string
          ventanas_propias: number[] | null
          zona_horaria: string
        }
        Insert: {
          alarmas_activas?: boolean
          editado_en?: string
          hora_dormir?: string
          household_id: string
          noche_ui_desde?: string
          noche_ui_hasta?: string
          noche_ui_modo?: string
          notificaciones?: Json
          sueno_noche_desde?: string
          sueno_noche_hasta?: string
          unidad_longitud?: string
          unidad_peso?: string
          unidad_volumen?: string
          ventanas_modo?: string
          ventanas_propias?: number[] | null
          zona_horaria?: string
        }
        Update: {
          alarmas_activas?: boolean
          editado_en?: string
          hora_dormir?: string
          household_id?: string
          noche_ui_desde?: string
          noche_ui_hasta?: string
          noche_ui_modo?: string
          notificaciones?: Json
          sueno_noche_desde?: string
          sueno_noche_hasta?: string
          unidad_longitud?: string
          unidad_peso?: string
          unidad_volumen?: string
          ventanas_modo?: string
          ventanas_propias?: number[] | null
          zona_horaria?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_settings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          creado_en: string
          id: string
          nombre: string
        }
        Insert: {
          creado_en?: string
          id?: string
          nombre: string
        }
        Update: {
          creado_en?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          aceptada_en: string | null
          aceptada_por: string | null
          creada_en: string
          creada_por: string | null
          email: string
          household_id: string
          id: string
          rol: Database["public"]["Enums"]["rol_miembro"]
          token_hash: string
          vence_en: string
        }
        Insert: {
          aceptada_en?: string | null
          aceptada_por?: string | null
          creada_en?: string
          creada_por?: string | null
          email: string
          household_id: string
          id?: string
          rol: Database["public"]["Enums"]["rol_miembro"]
          token_hash: string
          vence_en?: string
        }
        Update: {
          aceptada_en?: string | null
          aceptada_por?: string | null
          creada_en?: string
          creada_por?: string | null
          email?: string
          household_id?: string
          id?: string
          rol?: Database["public"]["Enums"]["rol_miembro"]
          token_hash?: string
          vence_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_audit: {
        Row: {
          client_id: string
          codigo_error: string | null
          creado_en: string
          herramienta: string
          household_id: string | null
          id: number
          resultado: string
          user_id: string
        }
        Insert: {
          client_id: string
          codigo_error?: string | null
          creado_en?: string
          herramienta: string
          household_id?: string | null
          id?: never
          resultado: string
          user_id?: string
        }
        Update: {
          client_id?: string
          codigo_error?: string | null
          creado_en?: string
          herramienta?: string
          household_id?: string | null
          id?: never
          resultado?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_audit_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          baby_id: string
          creado_en: string
          household_id: string
          id: string
          logged_by: string
          longitud_mm: number | null
          medido_en: string
          notas: string | null
          origen: string
          perimetro_cefalico_mm: number | null
          peso_g: number | null
          source: Database["public"]["Enums"]["origen_registro"]
        }
        Insert: {
          baby_id: string
          creado_en?: string
          household_id: string
          id?: string
          logged_by?: string
          longitud_mm?: number | null
          medido_en: string
          notas?: string | null
          origen: string
          perimetro_cefalico_mm?: number | null
          peso_g?: number | null
          source?: Database["public"]["Enums"]["origen_registro"]
        }
        Update: {
          baby_id?: string
          creado_en?: string
          household_id?: string
          id?: string
          logged_by?: string
          longitud_mm?: number | null
          medido_en?: string
          notas?: string | null
          origen?: string
          perimetro_cefalico_mm?: number | null
          peso_g?: number | null
          source?: Database["public"]["Enums"]["origen_registro"]
        }
        Relationships: [
          {
            foreignKeyName: "measurements_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          activo: boolean
          baby_id: string
          creado_en: string
          fin: string | null
          household_id: string
          id: string
          indicacion_textual: string
          inicio: string
          nombre: string
          prescrito_por: string | null
        }
        Insert: {
          activo?: boolean
          baby_id: string
          creado_en?: string
          fin?: string | null
          household_id: string
          id?: string
          indicacion_textual: string
          inicio?: string
          nombre: string
          prescrito_por?: string | null
        }
        Update: {
          activo?: boolean
          baby_id?: string
          creado_en?: string
          fin?: string | null
          household_id?: string
          id?: string
          indicacion_textual?: string
          inicio?: string
          nombre?: string
          prescrito_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          creado_en: string
          household_id: string
          id: string
          nombre_visible: string
          rol: Database["public"]["Enums"]["rol_miembro"]
          user_id: string
        }
        Insert: {
          creado_en?: string
          household_id: string
          id?: string
          nombre_visible: string
          rol: Database["public"]["Enums"]["rol_miembro"]
          user_id: string
        }
        Update: {
          creado_en?: string
          household_id?: string
          id?: string
          nombre_visible?: string
          rol?: Database["public"]["Enums"]["rol_miembro"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      next_appointments: {
        Row: {
          baby_id: string
          editado_en: string
          fecha: string
          household_id: string
          pediatra: string | null
          titulo: string | null
        }
        Insert: {
          baby_id: string
          editado_en?: string
          fecha: string
          household_id: string
          pediatra?: string | null
          titulo?: string | null
        }
        Update: {
          baby_id?: string
          editado_en?: string
          fecha?: string
          household_id?: string
          pediatra?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "next_appointments_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: true
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "next_appointments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          baby_id: string
          creada_en: string
          creada_por: string
          household_id: string
          id: string
          resuelta_en_visita_id: string | null
          source: Database["public"]["Enums"]["origen_registro"]
          texto: string
        }
        Insert: {
          baby_id: string
          creada_en?: string
          creada_por?: string
          household_id: string
          id?: string
          resuelta_en_visita_id?: string | null
          source?: Database["public"]["Enums"]["origen_registro"]
          texto: string
        }
        Update: {
          baby_id?: string
          creada_en?: string
          creada_por?: string
          household_id?: string
          id?: string
          resuelta_en_visita_id?: string | null
          source?: Database["public"]["Enums"]["origen_registro"]
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_resuelta_en_visita_id_fkey"
            columns: ["resuelta_en_visita_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          adjuntos: string[]
          baby_id: string
          creado_en: string
          fecha: string
          household_id: string
          id: string
          motivo: string | null
          notas: string | null
          pediatra: string | null
          vacunas: Json
        }
        Insert: {
          adjuntos?: string[]
          baby_id: string
          creado_en?: string
          fecha: string
          household_id: string
          id?: string
          motivo?: string | null
          notas?: string | null
          pediatra?: string | null
          vacunas?: Json
        }
        Update: {
          adjuntos?: string[]
          baby_id?: string
          creado_en?: string
          fecha?: string
          household_id?: string
          id?: string
          motivo?: string | null
          notas?: string | null
          pediatra?: string | null
          vacunas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "visits_baby_id_fkey"
            columns: ["baby_id"]
            isOneToOne: false
            referencedRelation: "babies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aceptar_invitacion: {
        Args: { p_nombre_visible: string; p_token: string }
        Returns: string
      }
      comparar_periodos: {
        Args: {
          p_a_desde: string
          p_a_hasta: string
          p_b_desde: string
          p_b_hasta: string
          p_baby: string
        }
        Returns: Json
      }
      crear_hogar: {
        Args: {
          p_nombre: string
          p_nombre_visible: string
          p_unidad_longitud?: string
          p_unidad_peso?: string
          p_unidad_volumen?: string
          p_zona_horaria?: string
        }
        Returns: string
      }
      crear_invitacion: {
        Args: {
          p_email: string
          p_household: string
          p_rol: Database["public"]["Enums"]["rol_miembro"]
        }
        Returns: string
      }
      edad_meses: {
        Args: { p_baby: string; p_corregida?: boolean; p_en?: string }
        Returns: number
      }
      es_sueno_nocturno: {
        Args: {
          p_desde: string
          p_hasta: string
          p_inicio: string
          p_tz: string
        }
        Returns: boolean
      }
      estadisticas_periodo: {
        Args: { p_baby: string; p_desde: string; p_hasta: string }
        Returns: Json
      }
      payload_valido: {
        Args: {
          p_payload: Json
          p_tipo: Database["public"]["Enums"]["tipo_evento"]
        }
        Returns: boolean
      }
      referencia_sueno: { Args: { p_meses: number }; Returns: Json }
      ver_invitacion: { Args: { p_token: string }; Returns: Json }
      sueno_por_dia: {
        Args: { p_baby: string; p_desde: string; p_hasta: string }
        Returns: {
          fecha: string
          n_siestas: number
          noche_min: number
          siestas_min: number
          total_min: number
        }[]
      }
    }
    Enums: {
      origen_registro: "web" | "mcp"
      rol_miembro: "admin" | "cuidador" | "limitado"
      tipo_evento:
        | "sueno"
        | "toma_pecho"
        | "toma_biberon"
        | "toma_solidos"
        | "extraccion"
        | "panal"
        | "medicamento"
        | "temperatura"
        | "sintoma"
        | "nota"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      origen_registro: ["web", "mcp"],
      rol_miembro: ["admin", "cuidador", "limitado"],
      tipo_evento: [
        "sueno",
        "toma_pecho",
        "toma_biberon",
        "toma_solidos",
        "extraccion",
        "panal",
        "medicamento",
        "temperatura",
        "sintoma",
        "nota",
      ],
    },
  },
} as const
