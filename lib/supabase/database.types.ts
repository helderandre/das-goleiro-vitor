export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string | null
          complement: string | null
          id: string
          is_default: boolean | null
          label: string | null
          neighborhood: string | null
          number: string | null
          state: string | null
          street: string | null
          user_id: string | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          complement?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          neighborhood?: string | null
          number?: string | null
          state?: string | null
          street?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          complement?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          neighborhood?: string | null
          number?: string | null
          state?: string | null
          street?: string | null
          user_id?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      blog_images: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          id: string
          image_url: string
          is_used: boolean | null
          post_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          image_url: string
          is_used?: boolean | null
          post_id: string
          storage_path: string
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          image_url?: string
          is_used?: boolean | null
          post_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_images_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          categories: string[] | null
          content: string | null
          cover_url: string | null
          created_at: string | null
          excerpt: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
        }
        Insert: {
          author_id?: string | null
          categories?: string[] | null
          content?: string | null
          cover_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
        }
        Update: {
          author_id?: string | null
          categories?: string[] | null
          content?: string | null
          cover_url?: string | null
          created_at?: string | null
          excerpt?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          product_id: string | null
          quantity: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          quantity?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          product_id?: string | null
          quantity?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          city: string | null
          contact_name: string | null
          contact_phone: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          event_type: string | null
          external_link: string | null
          id: string
          location_name: string | null
          location_type: string | null
          start_date: string
          state: string | null
          status: string | null
          title: string
        }
        Insert: {
          city?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          external_link?: string | null
          id?: string
          location_name?: string | null
          location_type?: string | null
          start_date: string
          state?: string | null
          status?: string | null
          title: string
        }
        Update: {
          city?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string | null
          external_link?: string | null
          id?: string
          location_name?: string | null
          location_type?: string | null
          start_date?: string
          state?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string | null
          email: string
          event_details: Json | null
          id: string
          message: string | null
          name: string
          phone: string | null
          status: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          event_details?: Json | null
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          status?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          event_details?: Json | null
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          status?: string | null
          type?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          product_title: string
          product_type: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_title: string
          product_type?: string | null
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_title?: string
          product_type?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          mp_preference_id: string | null
          shipping_address: Json | null
          short_id: string | null
          status: string | null
          total: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mp_preference_id?: string | null
          shipping_address?: Json | null
          short_id?: string | null
          status?: string | null
          total: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mp_preference_id?: string | null
          shipping_address?: Json | null
          short_id?: string | null
          status?: string | null
          total?: number
          user_id?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_cover: boolean | null
          product_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_cover?: boolean | null
          product_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_cover?: boolean | null
          product_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          discount_percent: number | null
          id: string
          is_main: boolean | null
          price: number
          product_type: string | null
          slug: string
          stock: number | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_main?: boolean | null
          price: number
          product_type?: string | null
          slug: string
          stock?: number | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          id?: string
          is_main?: boolean | null
          price?: number
          product_type?: string | null
          slug?: string
          stock?: number | null
          title?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          profile_image_url: string | null
          profile_name: string
          profile_subtitle: string
          profile_quote: string
          social_links: Json
          video_thumbnail_url: string | null
          video_category: string
          video_title: string
          video_duration: string
          video_youtube_url: string | null
          impact_badge: string
          impact_number: string
          impact_description: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          profile_image_url?: string | null
          profile_name?: string
          profile_subtitle?: string
          profile_quote?: string
          social_links?: Json
          video_thumbnail_url?: string | null
          video_category?: string
          video_title?: string
          video_duration?: string
          video_youtube_url?: string | null
          impact_badge?: string
          impact_number?: string
          impact_description?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          profile_image_url?: string | null
          profile_name?: string
          profile_subtitle?: string
          profile_quote?: string
          social_links?: Json
          video_thumbnail_url?: string | null
          video_category?: string
          video_title?: string
          video_duration?: string
          video_youtube_url?: string | null
          impact_badge?: string
          impact_number?: string
          impact_description?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          document: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          document?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          document?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_cart_additions: {
        Row: {
          last_addition: string | null
          product_id: string | null
          product_title: string | null
          total_additions: number | null
          total_units_added: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      v_cart_funnel: {
        Row: {
          total_add_to_cart: number | null
          total_checkout_completed: number | null
          total_checkout_started: number | null
          unique_carts: number | null
          unique_purchasers: number | null
        }
        Relationships: []
      }
      v_checkout_summary: {
        Row: {
          checkouts_completed: number | null
          checkouts_started: number | null
          conversion_rate: number | null
          event_date: string | null
          total_revenue: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_slug: { Args: { title: string }; Returns: string }
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
