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
    PostgrestVersion: "17.1"
  }
  public: {
    Tables: {
      courses: {
        Row: {
          code: string
          created_at: string
          department: string
          id: string
          regulation: string | null
          semester: number | null
          title: string
          units: Json
          university: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          department: string
          id?: string
          regulation?: string | null
          semester?: number | null
          title: string
          units?: Json
          university?: string | null
          user_id?: string
        }
        Update: {
          code?: string
          created_at?: string
          department?: string
          id?: string
          regulation?: string | null
          semester?: number | null
          title?: string
          units?: Json
          university?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          college: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          languages: string[]
          nickname: string | null
          onboarded: boolean
          regulation: string | null
          semester: number | null
          state: string | null
          tour_completed: boolean
          university: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          city?: string | null
          college?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id: string
          languages?: string[]
          nickname?: string | null
          onboarded?: boolean
          regulation?: string | null
          semester?: number | null
          state?: string | null
          tour_completed?: boolean
          university?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          city?: string | null
          college?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          languages?: string[]
          nickname?: string | null
          onboarded?: boolean
          regulation?: string | null
          semester?: number | null
          state?: string | null
          tour_completed?: boolean
          university?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          college: string | null
          course_id: string
          created_at: string
          id: string
          marks: number
          session: string | null
          text: string
          topic_id: string | null
          unit_id: string | null
          user_id: string
        }
        Insert: {
          college?: string | null
          course_id: string
          created_at?: string
          id?: string
          marks: number
          session?: string | null
          text: string
          topic_id?: string | null
          unit_id?: string | null
          user_id?: string
        }
        Update: {
          college?: string | null
          course_id?: string
          created_at?: string
          id?: string
          marks?: number
          session?: string | null
          text?: string
          topic_id?: string | null
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_answers: {
        Row: {
          answer: string
          course_id: string | null
          created_at: string
          id: string
          language: string | null
          marks: number | null
          question: string
          topic_id: string | null
          unit_id: string | null
          user_id: string
        }
        Insert: {
          answer: string
          course_id?: string | null
          created_at?: string
          id?: string
          language?: string | null
          marks?: number | null
          question: string
          topic_id?: string | null
          unit_id?: string | null
          user_id?: string
        }
        Update: {
          answer?: string
          course_id?: string | null
          created_at?: string
          id?: string
          language?: string | null
          marks?: number | null
          question?: string
          topic_id?: string | null
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_answers_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_answers_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_answers_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_progress: {
        Row: {
          confidence: number
          revised: boolean
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number
          revised?: boolean
          topic_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          confidence?: number
          revised?: boolean
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          course_id: string
          created_at: string
          id: string
          position: number
          title: string
          unit_id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          position?: number
          title: string
          unit_id: string
          user_id?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          course_id: string
          created_at: string
          id: string
          marks: string | null
          position: number
          title: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          marks?: string | null
          position?: number
          title: string
          user_id?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          marks?: string | null
          position?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      viva_answers: {
        Row: {
          answer: string | null
          created_at: string
          feedback: string | null
          id: string
          position: number
          question: string
          score: number | null
          session_id: string
          topic_id: string | null
          topic_title: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          position: number
          question: string
          score?: number | null
          session_id: string
          topic_id?: string | null
          topic_title: string
          user_id?: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          feedback?: string | null
          id?: string
          position?: number
          question?: string
          score?: number | null
          session_id?: string
          topic_id?: string | null
          topic_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viva_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "viva_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viva_answers_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      viva_sessions: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          question_count: number
          score: number | null
          status: string
          summary: Json | null
          unit_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          question_count: number
          score?: number | null
          status?: string
          summary?: Json | null
          unit_id?: string | null
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          question_count?: number
          score?: number | null
          status?: string
          summary?: Json | null
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "viva_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viva_sessions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_course: { Args: { _course: string }; Returns: boolean }
      owns_topic: { Args: { _topic: string }; Returns: boolean }
      owns_unit: { Args: { _unit: string }; Returns: boolean }
      owns_viva: { Args: { _session: string }; Returns: boolean }
      save_course: {
        Args: { p_course: Json; p_course_id: string; p_units: Json }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
