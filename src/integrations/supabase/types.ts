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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      backlog_tasks: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: Database["public"]["Enums"]["priority_level"]
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"]
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["priority_level"]
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: Database["public"]["Enums"]["priority_level"]
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"]
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          entry_date: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          entry_date: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          entry_date?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          project_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          project_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          deleted_at: string | null
          emoji: string
          enabled_views: Json
          id: string
          is_default: boolean
          name: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          emoji?: string
          enabled_views?: Json
          id?: string
          is_default?: boolean
          name: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          emoji?: string
          enabled_views?: Json
          id?: string
          is_default?: boolean
          name?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          hidden: boolean
          id: string
          position: number
          project_id: string
          start_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          hidden?: boolean
          id?: string
          position?: number
          project_id: string
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          hidden?: boolean
          id?: string
          position?: number
          project_id?: string
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      purge_soft_deleted: { Args: never; Returns: undefined }
    }
    Enums: {
      priority_level: "low" | "medium" | "high"
      task_status: "todo" | "in_progress" | "done"
      urgency_level: "someday" | "this_week" | "today"
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
      priority_level: ["low", "medium", "high"],
      task_status: ["todo", "in_progress", "done"],
      urgency_level: ["someday", "this_week", "today"],
    },
  },
} as const
