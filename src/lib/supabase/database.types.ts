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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      bodyweight_log: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "bodyweight_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          aliases: string[]
          created_at: string
          default_rep_tier: Database["public"]["Enums"]["rep_tier"]
          equipment: string
          id: string
          is_custom: boolean
          movement_pattern: string
          muscle_group: string
          name: string
          owner_id: string | null
          secondary_muscles: string[]
          tracking_type: Database["public"]["Enums"]["tracking_type"]
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          default_rep_tier?: Database["public"]["Enums"]["rep_tier"]
          equipment: string
          id?: string
          is_custom?: boolean
          movement_pattern: string
          muscle_group: string
          name: string
          owner_id?: string | null
          secondary_muscles?: string[]
          tracking_type?: Database["public"]["Enums"]["tracking_type"]
        }
        Update: {
          aliases?: string[]
          created_at?: string
          default_rep_tier?: Database["public"]["Enums"]["rep_tier"]
          equipment?: string
          id?: string
          is_custom?: boolean
          movement_pattern?: string
          muscle_group?: string
          name?: string
          owner_id?: string | null
          secondary_muscles?: string[]
          tracking_type?: Database["public"]["Enums"]["tracking_type"]
        }
        Relationships: [
          {
            foreignKeyName: "exercises_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      plateau_alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["plateau_alert_type"]
          created_at: string
          detected_at: string
          dismissed_at: string | null
          exercise_id: string | null
          id: string
          message: string
          muscle_group: string | null
          suggested_exercise_id: string | null
          user_id: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["plateau_alert_type"]
          created_at?: string
          detected_at?: string
          dismissed_at?: string | null
          exercise_id?: string | null
          id?: string
          message: string
          muscle_group?: string | null
          suggested_exercise_id?: string | null
          user_id: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["plateau_alert_type"]
          created_at?: string
          detected_at?: string
          dismissed_at?: string | null
          exercise_id?: string | null
          id?: string
          message?: string
          muscle_group?: string | null
          suggested_exercise_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plateau_alerts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plateau_alerts_suggested_exercise_id_fkey"
            columns: ["suggested_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plateau_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          household_id: string | null
          id: string
          is_admin: boolean
          is_approved: boolean
          name: string
          unit_pref: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id?: string | null
          id: string
          is_admin?: boolean
          is_approved?: boolean
          name: string
          unit_pref?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string | null
          id?: string
          is_admin?: boolean
          is_approved?: boolean
          name?: string
          unit_pref?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          position: number
          routine_id: string
          target_rep_max: number
          target_rep_min: number
          target_sets: number
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          position: number
          routine_id: string
          target_rep_max?: number
          target_rep_min?: number
          target_sets?: number
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          position?: number
          routine_id?: string
          target_rep_max?: number
          target_rep_min?: number
          target_sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_exercises_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          id: string
          last_performed_at: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_performed_at?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_performed_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          created_at: string
          distance_meters: number | null
          duration_seconds: number | null
          exercise_id: string
          id: string
          is_warmup: boolean
          reps: number | null
          rest_seconds: number | null
          rpe: number | null
          set_number: number
          weight: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          exercise_id: string
          id?: string
          is_warmup?: boolean
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          set_number: number
          weight?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          distance_meters?: number | null
          duration_seconds?: number | null
          exercise_id?: string
          id?: string
          is_warmup?: boolean
          reps?: number | null
          rest_seconds?: number | null
          rpe?: number | null
          set_number?: number
          weight?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sets_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sets_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          bodyweight: number | null
          created_at: string
          date: string
          ended_at: string | null
          id: string
          notes: string | null
          routine_id: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          bodyweight?: number | null
          created_at?: string
          date?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          routine_id?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          bodyweight?: number | null
          created_at?: string
          date?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          routine_id?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_household_id: { Args: never; Returns: string }
      auth_is_admin: { Args: never; Returns: boolean }
      auth_is_approved: { Args: never; Returns: boolean }
    }
    Enums: {
      plateau_alert_type:
        | "strength_stall"
        | "missed_targets"
        | "volume_regression"
        | "under_stimulus"
        | "exercise_staleness"
        | "rpe_creep"
      rep_tier: "heavy_compound" | "compound" | "isolation" | "small_isolation"
      tracking_type:
        | "weight_reps"
        | "bodyweight_reps"
        | "time"
        | "distance_time"
        | "reps_only"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      plateau_alert_type: [
        "strength_stall",
        "missed_targets",
        "volume_regression",
        "under_stimulus",
        "exercise_staleness",
        "rpe_creep",
      ],
      rep_tier: ["heavy_compound", "compound", "isolation", "small_isolation"],
      tracking_type: [
        "weight_reps",
        "bodyweight_reps",
        "time",
        "distance_time",
        "reps_only",
      ],
    },
  },
} as const
