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
      activities: {
        Row: {
          borough: string
          category: string
          created_at: string
          dates: Json
          duration_minutes: number | null
          id: string
          image_seed: string
          kind: string
          neighborhood: string
          notes: string | null
          price_note: string | null
          price_tier: string
          source_url: string | null
          status: string
          tags: string[]
          title: string
          travel_from_home: Json | null
          updated_at: string
          venue: string
          venue_lat: number | null
          venue_lng: number | null
        }
        Insert: {
          borough?: string
          category?: string
          created_at?: string
          dates?: Json
          duration_minutes?: number | null
          id?: string
          image_seed?: string
          kind?: string
          neighborhood?: string
          notes?: string | null
          price_note?: string | null
          price_tier?: string
          source_url?: string | null
          status?: string
          tags?: string[]
          title: string
          travel_from_home?: Json | null
          updated_at?: string
          venue?: string
          venue_lat?: number | null
          venue_lng?: number | null
        }
        Update: {
          borough?: string
          category?: string
          created_at?: string
          dates?: Json
          duration_minutes?: number | null
          id?: string
          image_seed?: string
          kind?: string
          neighborhood?: string
          notes?: string | null
          price_note?: string | null
          price_tier?: string
          source_url?: string | null
          status?: string
          tags?: string[]
          title?: string
          travel_from_home?: Json | null
          updated_at?: string
          venue?: string
          venue_lat?: number | null
          venue_lng?: number | null
        }
        Relationships: []
      }
      followed_organizers: {
        Row: {
          created_at: string
          filters: Json
          id: string
          last_checked_at: string | null
          last_error: string | null
          name: string
          organizer_id: string
          source: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          name?: string
          organizer_id: string
          source?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          name?: string
          organizer_id?: string
          source?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      monitor_suggestions: {
        Row: {
          created_at: string
          dismiss_reason: string | null
          ends_at: string | null
          id: string
          monitored_url_id: string
          price_note: string | null
          starts_at: string
          status: string
        }
        Insert: {
          created_at?: string
          dismiss_reason?: string | null
          ends_at?: string | null
          id?: string
          monitored_url_id: string
          price_note?: string | null
          starts_at: string
          status?: string
        }
        Update: {
          created_at?: string
          dismiss_reason?: string | null
          ends_at?: string | null
          id?: string
          monitored_url_id?: string
          price_note?: string | null
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitor_suggestions_monitored_url_id_fkey"
            columns: ["monitored_url_id"]
            isOneToOne: false
            referencedRelation: "monitored_urls"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_urls: {
        Row: {
          created_at: string
          hint: string
          id: string
          last_checked_at: string | null
          last_error: string | null
          last_seen_dates: Json
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          hint?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_seen_dates?: Json
          title?: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          hint?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_seen_dates?: Json
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      organizer_suggestions: {
        Row: {
          borough: string
          created_at: string
          dismiss_reason: string | null
          ends_at: string | null
          external_id: string
          id: string
          image_url: string | null
          is_sold_out: boolean
          neighborhood: string
          organizer_id: string
          starts_at: string | null
          status: string
          title: string
          url: string
          venue: string
        }
        Insert: {
          borough?: string
          created_at?: string
          dismiss_reason?: string | null
          ends_at?: string | null
          external_id: string
          id?: string
          image_url?: string | null
          is_sold_out?: boolean
          neighborhood?: string
          organizer_id: string
          starts_at?: string | null
          status?: string
          title: string
          url: string
          venue?: string
        }
        Update: {
          borough?: string
          created_at?: string
          dismiss_reason?: string | null
          ends_at?: string | null
          external_id?: string
          id?: string
          image_url?: string | null
          is_sold_out?: boolean
          neighborhood?: string
          organizer_id?: string
          starts_at?: string | null
          status?: string
          title?: string
          url?: string
          venue?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_suggestions_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "followed_organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_cache: {
        Row: {
          created_at: string
          payload: Json
          url: string
        }
        Insert: {
          created_at?: string
          payload: Json
          url: string
        }
        Update: {
          created_at?: string
          payload?: Json
          url?: string
        }
        Relationships: []
      }
      user_profile: {
        Row: {
          created_at: string
          home_address: string
          home_lat: number | null
          home_lng: number | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          home_address?: string
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          home_address?: string
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
