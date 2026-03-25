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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_prompt_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          edge_function: string
          error_message: string | null
          grounding_search: boolean
          id: string
          model: string
          promise_id: string | null
          prompt: string
          response_raw: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          edge_function: string
          error_message?: string | null
          grounding_search?: boolean
          id?: string
          model: string
          promise_id?: string | null
          prompt: string
          response_raw?: string | null
          success: boolean
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          edge_function?: string
          error_message?: string | null
          grounding_search?: boolean
          id?: string
          model?: string
          promise_id?: string | null
          prompt?: string
          response_raw?: string | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_logs_promise_id_fkey"
            columns: ["promise_id"]
            isOneToOne: false
            referencedRelation: "promises"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_jobs: {
        Row: {
          accumulated_promises: Json | null
          completed_chunks: number | null
          created_at: string | null
          current_chunk: number | null
          election_year: number
          error_message: string | null
          id: string
          manifest_pdf_url: string | null
          manifest_text: string | null
          party_id: string
          progress_pct: number | null
          result_count: number | null
          status: string
          total_chunks: number | null
          updated_at: string | null
        }
        Insert: {
          accumulated_promises?: Json | null
          completed_chunks?: number | null
          created_at?: string | null
          current_chunk?: number | null
          election_year: number
          error_message?: string | null
          id?: string
          manifest_pdf_url?: string | null
          manifest_text?: string | null
          party_id: string
          progress_pct?: number | null
          result_count?: number | null
          status?: string
          total_chunks?: number | null
          updated_at?: string | null
        }
        Update: {
          accumulated_promises?: Json | null
          completed_chunks?: number | null
          created_at?: string | null
          current_chunk?: number | null
          election_year?: number
          error_message?: string | null
          id?: string
          manifest_pdf_url?: string | null
          manifest_text?: string | null
          party_id?: string
          progress_pct?: number | null
          result_count?: number | null
          status?: string
          total_chunks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_jobs_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      government_periods: {
        Row: {
          created_at: string
          end_year: number | null
          governing_parties: string[]
          id: string
          name: string
          start_year: number
          support_parties: string[] | null
        }
        Insert: {
          created_at?: string
          end_year?: number | null
          governing_parties: string[]
          id?: string
          name: string
          start_year: number
          support_parties?: string[] | null
        }
        Update: {
          created_at?: string
          end_year?: number | null
          governing_parties?: string[]
          id?: string
          name?: string
          start_year?: number
          support_parties?: string[] | null
        }
        Relationships: []
      }
      parties: {
        Row: {
          abbreviation: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          abbreviation: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          abbreviation?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      promise_sources: {
        Row: {
          added_by: string | null
          created_at: string
          description: string | null
          id: string
          promise_id: string
          published_date: string | null
          source_type: Database["public"]["Enums"]["source_type"]
          title: string | null
          url: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          promise_id: string
          published_date?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          title?: string | null
          url: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          promise_id?: string
          published_date?: string | null
          source_type?: Database["public"]["Enums"]["source_type"]
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "promise_sources_promise_id_fkey"
            columns: ["promise_id"]
            isOneToOne: false
            referencedRelation: "promises"
            referencedColumns: ["id"]
          },
        ]
      }
      promises: {
        Row: {
          category: Database["public"]["Enums"]["policy_category"] | null
          created_at: string
          direct_quote: string | null
          election_year: number
          id: string
          is_status_quo: boolean
          manifest_pdf_url: string | null
          measurability_reason: string | null
          measurability_score: number | null
          page_number: number | null
          party_id: string
          promise_text: string
          status: Database["public"]["Enums"]["promise_status"]
          status_explanation: string | null
          status_sources: string[] | null
          status_tldr: string | null
          summary: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["policy_category"] | null
          created_at?: string
          direct_quote?: string | null
          election_year: number
          id?: string
          is_status_quo?: boolean
          manifest_pdf_url?: string | null
          measurability_reason?: string | null
          measurability_score?: number | null
          page_number?: number | null
          party_id: string
          promise_text: string
          status?: Database["public"]["Enums"]["promise_status"]
          status_explanation?: string | null
          status_sources?: string[] | null
          status_tldr?: string | null
          summary?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["policy_category"] | null
          created_at?: string
          direct_quote?: string | null
          election_year?: number
          id?: string
          is_status_quo?: boolean
          manifest_pdf_url?: string | null
          measurability_reason?: string | null
          measurability_score?: number | null
          page_number?: number | null
          party_id?: string
          promise_text?: string
          status?: Database["public"]["Enums"]["promise_status"]
          status_explanation?: string | null
          status_sources?: string[] | null
          status_tldr?: string | null
          summary?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promises_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      status_suggestions: {
        Row: {
          created_at: string
          downvotes: number
          explanation: string
          id: string
          promise_id: string
          sources: string[] | null
          suggested_status: Database["public"]["Enums"]["promise_status"]
          upvotes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          downvotes?: number
          explanation: string
          id?: string
          promise_id: string
          sources?: string[] | null
          suggested_status: Database["public"]["Enums"]["promise_status"]
          upvotes?: number
          user_id: string
        }
        Update: {
          created_at?: string
          downvotes?: number
          explanation?: string
          id?: string
          promise_id?: string
          sources?: string[] | null
          suggested_status?: Database["public"]["Enums"]["promise_status"]
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_suggestions_promise_id_fkey"
            columns: ["promise_id"]
            isOneToOne: false
            referencedRelation: "promises"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_votes: {
        Row: {
          created_at: string
          id: string
          suggestion_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          suggestion_id: string
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string
          id?: string
          suggestion_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_votes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "status_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_view_count: {
        Args: { _promise_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      policy_category:
        | "valfard"
        | "halsa"
        | "utbildning"
        | "arbetsmarknad"
        | "migration"
        | "rattssakerhet"
        | "forsvar"
        | "klimat-miljo"
        | "bostad"
        | "demokrati"
        | "ovrigt"
      promise_status:
        | "infriat"
        | "delvis-infriat"
        | "utreds"
        | "ej-infriat"
        | "brutet"
        | "pending-analysis"
      source_type: "news" | "official" | "research" | "other"
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
      app_role: ["admin", "moderator", "user"],
      policy_category: [
        "valfard",
        "halsa",
        "utbildning",
        "arbetsmarknad",
        "migration",
        "rattssakerhet",
        "forsvar",
        "klimat-miljo",
        "bostad",
        "demokrati",
        "ovrigt",
      ],
      promise_status: [
        "infriat",
        "delvis-infriat",
        "utreds",
        "ej-infriat",
        "brutet",
        "pending-analysis",
      ],
      source_type: ["news", "official", "research", "other"],
    },
  },
} as const
