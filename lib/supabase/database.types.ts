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
        Relationships: [
          {
            foreignKeyName: "cart_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_cart_additions"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cart_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_analytics"
            referencedColumns: ["product_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_cart_additions"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_analytics"
            referencedColumns: ["product_id"]
          },
        ]
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
      melhor_envio_tokens: {
        Row: {
          access_token: string
          app_name: string
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          refresh_token: string
          refreshed_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          app_name?: string
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          refresh_token: string
          refreshed_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          app_name?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          refresh_token?: string
          refreshed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mp_credentials: {
        Row: {
          access_token: string
          created_at: string
          environment: string
          id: string
          is_active: boolean
          public_key: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          environment: string
          id?: string
          is_active?: boolean
          public_key?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          environment?: string
          id?: string
          is_active?: boolean
          public_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mp_webhook_logs: {
        Row: {
          created_at: string
          error: string | null
          event_id: string | null
          event_type: string
          id: string
          order_id: string | null
          payload: Json
          payment_id: string | null
          processed: boolean
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          payload?: Json
          payment_id?: string | null
          processed?: boolean
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          payload?: Json
          payment_id?: string | null
          processed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "mp_webhook_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_cart_additions"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_analytics"
            referencedColumns: ["product_id"]
          },
        ]
      }
      order_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          order_id: string
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          order_id: string
          read_at?: string | null
          sender_id: string
          sender_role?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          order_id?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          id: string
          label_url: string | null
          me_cart_id: string | null
          me_service_id: number | null
          me_service_name: string | null
          mp_external_reference: string | null
          mp_fee_amount: number | null
          mp_merchant_order_id: string | null
          mp_net_amount: number | null
          mp_paid_at: string | null
          mp_payer_email: string | null
          mp_payment_id: string | null
          mp_payment_method: string | null
          mp_payment_status: string | null
          mp_payment_type: string | null
          mp_preference_id: string | null
          payment_proof_url: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_price: number | null
          shipping_status: string | null
          short_id: string | null
          status: string | null
          total: number
          tracking_code: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          label_url?: string | null
          me_cart_id?: string | null
          me_service_id?: number | null
          me_service_name?: string | null
          mp_external_reference?: string | null
          mp_fee_amount?: number | null
          mp_merchant_order_id?: string | null
          mp_net_amount?: number | null
          mp_paid_at?: string | null
          mp_payer_email?: string | null
          mp_payment_id?: string | null
          mp_payment_method?: string | null
          mp_payment_status?: string | null
          mp_payment_type?: string | null
          mp_preference_id?: string | null
          payment_proof_url?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_price?: number | null
          shipping_status?: string | null
          short_id?: string | null
          status?: string | null
          total: number
          tracking_code?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          id?: string
          label_url?: string | null
          me_cart_id?: string | null
          me_service_id?: number | null
          me_service_name?: string | null
          mp_external_reference?: string | null
          mp_fee_amount?: number | null
          mp_merchant_order_id?: string | null
          mp_net_amount?: number | null
          mp_paid_at?: string | null
          mp_payer_email?: string | null
          mp_payment_id?: string | null
          mp_payment_method?: string | null
          mp_payment_status?: string | null
          mp_payment_type?: string | null
          mp_preference_id?: string | null
          payment_proof_url?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_price?: number | null
          shipping_status?: string | null
          short_id?: string | null
          status?: string | null
          total?: number
          tracking_code?: string | null
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
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_cart_additions"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_analytics"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string | null
          description: string | null
          discount_percent: number | null
          height: number | null
          id: string
          is_main: boolean | null
          length: number | null
          price: number
          product_type: string | null
          slug: string
          stock: number | null
          title: string
          weight: number | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          height?: number | null
          id?: string
          is_main?: boolean | null
          length?: number | null
          price: number
          product_type?: string | null
          slug: string
          stock?: number | null
          title: string
          weight?: number | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          height?: number | null
          id?: string
          is_main?: boolean | null
          length?: number | null
          price?: number
          product_type?: string | null
          slug?: string
          stock?: number | null
          title?: string
          weight?: number | null
          width?: number | null
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
      sender_addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string | null
          document: string
          email: string
          id: string
          is_default: boolean
          name: string
          neighborhood: string
          number: string
          phone: string
          state: string
          street: string
          updated_at: string | null
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string | null
          document: string
          email: string
          id?: string
          is_default?: boolean
          name: string
          neighborhood: string
          number: string
          phone: string
          state: string
          street: string
          updated_at?: string | null
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string | null
          document?: string
          email?: string
          id?: string
          is_default?: boolean
          name?: string
          neighborhood?: string
          number?: string
          phone?: string
          state?: string
          street?: string
          updated_at?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          impact_badge: string
          impact_description: string
          impact_number: string
          profile_image_url: string | null
          profile_name: string
          profile_quote: string
          profile_subtitle: string
          social_links: Json
          updated_at: string | null
          video_category: string
          video_duration: string
          video_thumbnail_url: string | null
          video_title: string
          video_youtube_url: string | null
        }
        Insert: {
          id?: string
          impact_badge?: string
          impact_description?: string
          impact_number?: string
          profile_image_url?: string | null
          profile_name?: string
          profile_quote?: string
          profile_subtitle?: string
          social_links?: Json
          updated_at?: string | null
          video_category?: string
          video_duration?: string
          video_thumbnail_url?: string | null
          video_title?: string
          video_youtube_url?: string | null
        }
        Update: {
          id?: string
          impact_badge?: string
          impact_description?: string
          impact_number?: string
          profile_image_url?: string | null
          profile_name?: string
          profile_quote?: string
          profile_subtitle?: string
          social_links?: Json
          updated_at?: string | null
          video_category?: string
          video_duration?: string
          video_thumbnail_url?: string | null
          video_title?: string
          video_youtube_url?: string | null
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
      v_product_analytics: {
        Row: {
          abandoned_carts: number | null
          last_event_at: string | null
          product_id: string | null
          product_title: string | null
          total_add_to_cart: number | null
          total_checkout_completed: number | null
          total_checkout_started: number | null
          total_remove_from_cart: number | null
          unique_add_to_cart: number | null
          unique_checkout_completed: number | null
          unique_checkout_started: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_overdue_and_unblock_alerts: { Args: never; Returns: undefined }
      generate_slug: { Args: { title: string }; Returns: string }
      get_melhor_envio_token: {
        Args: never
        Returns: {
          access_token: string
          expires_at: string
          is_expired: boolean
          refresh_token: string
        }[]
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
    Enums: {},
  },
} as const
