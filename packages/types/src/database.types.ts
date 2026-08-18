export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          event: string;
          id: string;
          ip_address: unknown;
          metadata: Json | null;
          user_agent: string | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          event: string;
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          user_agent?: string | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          event?: string;
          id?: string;
          ip_address?: unknown;
          metadata?: Json | null;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cod_settlement_lines: {
        Row: {
          amount: number | null;
          discrepancy: number | null;
          id: string;
          matched: boolean;
          order_id: string | null;
          settlement_id: string;
          status: string;
          tracking_number: string;
        };
        Insert: {
          amount?: number | null;
          discrepancy?: number | null;
          id?: string;
          matched?: boolean;
          order_id?: string | null;
          settlement_id: string;
          status?: string;
          tracking_number: string;
        };
        Update: {
          amount?: number | null;
          discrepancy?: number | null;
          id?: string;
          matched?: boolean;
          order_id?: string | null;
          settlement_id?: string;
          status?: string;
          tracking_number?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cod_settlement_lines_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cod_settlement_lines_settlement_id_fkey";
            columns: ["settlement_id"];
            isOneToOne: false;
            referencedRelation: "cod_settlements";
            referencedColumns: ["id"];
          },
        ];
      };
      cod_settlements: {
        Row: {
          courier: string;
          file_path: string | null;
          id: string;
          import_status: string;
          imported_at: string;
          matched_count: number;
          seller_id: string;
          unmatched_count: number;
        };
        Insert: {
          courier: string;
          file_path?: string | null;
          id?: string;
          import_status?: string;
          imported_at?: string;
          matched_count?: number;
          seller_id: string;
          unmatched_count?: number;
        };
        Update: {
          courier?: string;
          file_path?: string | null;
          id?: string;
          import_status?: string;
          imported_at?: string;
          matched_count?: number;
          seller_id?: string;
          unmatched_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cod_settlements_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      courier_labels: {
        Row: {
          courier: string;
          courier_response: Json | null;
          created_at: string;
          id: string;
          label_pdf_path: string | null;
          order_id: string;
          status: string;
          tracking_number: string | null;
        };
        Insert: {
          courier: string;
          courier_response?: Json | null;
          created_at?: string;
          id?: string;
          label_pdf_path?: string | null;
          order_id: string;
          status?: string;
          tracking_number?: string | null;
        };
        Update: {
          courier?: string;
          courier_response?: Json | null;
          created_at?: string;
          id?: string;
          label_pdf_path?: string | null;
          order_id?: string;
          status?: string;
          tracking_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "courier_labels_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string;
          district: string | null;
          gps_lat: number | null;
          gps_lng: number | null;
          id: string;
          name: string | null;
          notes: string | null;
          order_count: number;
          phone: string;
          province: string | null;
          seller_id: string;
          updated_at: string;
          village_landmark: string | null;
        };
        Insert: {
          created_at?: string;
          district?: string | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          id?: string;
          name?: string | null;
          notes?: string | null;
          order_count?: number;
          phone: string;
          province?: string | null;
          seller_id: string;
          updated_at?: string;
          village_landmark?: string | null;
        };
        Update: {
          created_at?: string;
          district?: string | null;
          gps_lat?: number | null;
          gps_lng?: number | null;
          id?: string;
          name?: string | null;
          notes?: string | null;
          order_count?: number;
          phone?: string;
          province?: string | null;
          seller_id?: string;
          updated_at?: string;
          village_landmark?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "customers_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      disputes: {
        Row: {
          created_at: string;
          id: string;
          opened_by: string | null;
          order_id: string;
          resolution: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
          summary: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          opened_by?: string | null;
          order_id: string;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          summary?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          opened_by?: string | null;
          order_id?: string;
          resolution?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "disputes_opened_by_fkey";
            columns: ["opened_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "disputes_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      lao_districts: {
        Row: {
          id: string;
          name_en: string;
          name_lo: string;
          province_id: string;
          sort_order: number;
        };
        Insert: {
          id: string;
          name_en: string;
          name_lo: string;
          province_id: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name_en?: string;
          name_lo?: string;
          province_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lao_districts_province_id_fkey";
            columns: ["province_id"];
            isOneToOne: false;
            referencedRelation: "lao_provinces";
            referencedColumns: ["id"];
          },
        ];
      };
      lao_provinces: {
        Row: {
          id: string;
          name_en: string;
          name_lo: string;
          sort_order: number;
        };
        Insert: {
          id: string;
          name_en: string;
          name_lo: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name_en?: string;
          name_lo?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      moderation_actions: {
        Row: {
          action: string;
          admin_user_id: string;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          metadata: Json | null;
          reason: string | null;
        };
        Insert: {
          action: string;
          admin_user_id: string;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          metadata?: Json | null;
          reason?: string | null;
        };
        Update: {
          action?: string;
          admin_user_id?: string;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          metadata?: Json | null;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "moderation_actions_admin_user_id_fkey";
            columns: ["admin_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      order_evidence: {
        Row: {
          created_at: string;
          file_hash: string;
          file_size_bytes: number | null;
          id: string;
          mime_type: string | null;
          order_id: string;
          storage_path: string;
          type: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          file_hash: string;
          file_size_bytes?: number | null;
          id?: string;
          mime_type?: string | null;
          order_id: string;
          storage_path: string;
          type: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          file_hash?: string;
          file_size_bytes?: number | null;
          id?: string;
          mime_type?: string | null;
          order_id?: string;
          storage_path?: string;
          type?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_evidence_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_evidence_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          amount: number;
          buyer_confirmed_at: string | null;
          buyer_id: string | null;
          courier: string | null;
          created_at: string;
          delivery_address: Json | null;
          delivery_fee: number;
          id: string;
          payment_method: string | null;
          product_snapshot: Json;
          safe_order_url: string | null;
          seller_confirmed_at: string | null;
          seller_id: string;
          status: string;
          terms: Json | null;
          tracking_number: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          buyer_confirmed_at?: string | null;
          buyer_id?: string | null;
          courier?: string | null;
          created_at?: string;
          delivery_address?: Json | null;
          delivery_fee?: number;
          id?: string;
          payment_method?: string | null;
          product_snapshot: Json;
          safe_order_url?: string | null;
          seller_confirmed_at?: string | null;
          seller_id: string;
          status?: string;
          terms?: Json | null;
          tracking_number?: string | null;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          buyer_confirmed_at?: string | null;
          buyer_id?: string | null;
          courier?: string | null;
          created_at?: string;
          delivery_address?: Json | null;
          delivery_fee?: number;
          id?: string;
          payment_method?: string | null;
          product_snapshot?: Json;
          safe_order_url?: string | null;
          seller_confirmed_at?: string | null;
          seller_id?: string;
          status?: string;
          terms?: Json | null;
          tracking_number?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          cost: number | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          name_lao: string | null;
          photo_url: string | null;
          price: number;
          seller_id: string;
          sku: string | null;
          stock_count: number;
          updated_at: string;
        };
        Insert: {
          cost?: number | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          name_lao?: string | null;
          photo_url?: string | null;
          price: number;
          seller_id: string;
          sku?: string | null;
          stock_count?: number;
          updated_at?: string;
        };
        Update: {
          cost?: number | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          name_lao?: string | null;
          photo_url?: string | null;
          price?: number;
          seller_id?: string;
          sku?: string | null;
          stock_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          ai_classification: Json | null;
          created_at: string;
          description: string;
          evidence_paths: string[] | null;
          id: string;
          order_id: string | null;
          report_type: string;
          reporter_id: string;
          seller_id: string;
          status: string;
        };
        Insert: {
          ai_classification?: Json | null;
          created_at?: string;
          description: string;
          evidence_paths?: string[] | null;
          id?: string;
          order_id?: string | null;
          report_type: string;
          reporter_id: string;
          seller_id: string;
          status?: string;
        };
        Update: {
          ai_classification?: Json | null;
          created_at?: string;
          description?: string;
          evidence_paths?: string[] | null;
          id?: string;
          order_id?: string | null;
          report_type?: string;
          reporter_id?: string;
          seller_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          buyer_id: string;
          created_at: string;
          id: string;
          order_id: string | null;
          photo_urls: string[] | null;
          rating_communication: number | null;
          rating_delivery: number | null;
          rating_description: number | null;
          rating_overall: number | null;
          review_text: string | null;
          seller_id: string;
          status: string;
          verified_transaction: boolean;
        };
        Insert: {
          buyer_id: string;
          created_at?: string;
          id?: string;
          order_id?: string | null;
          photo_urls?: string[] | null;
          rating_communication?: number | null;
          rating_delivery?: number | null;
          rating_description?: number | null;
          rating_overall?: number | null;
          review_text?: string | null;
          seller_id: string;
          status?: string;
          verified_transaction?: boolean;
        };
        Update: {
          buyer_id?: string;
          created_at?: string;
          id?: string;
          order_id?: string | null;
          photo_urls?: string[] | null;
          rating_communication?: number | null;
          rating_delivery?: number | null;
          rating_description?: number | null;
          rating_overall?: number | null;
          review_text?: string | null;
          seller_id?: string;
          status?: string;
          verified_transaction?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_buyer_id_fkey";
            columns: ["buyer_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      risk_signals: {
        Row: {
          created_at: string;
          evidence_id: string | null;
          id: string;
          is_active: boolean;
          seller_id: string;
          severity: string;
          signal_type: string;
          source_type: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          evidence_id?: string | null;
          id?: string;
          is_active?: boolean;
          seller_id: string;
          severity: string;
          signal_type: string;
          source_type: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          evidence_id?: string | null;
          id?: string;
          is_active?: boolean;
          seller_id?: string;
          severity?: string;
          signal_type?: string;
          source_type?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "risk_signals_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_identifiers: {
        Row: {
          created_at: string;
          id: string;
          seller_id: string;
          type: string;
          value: string;
          verification_status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          seller_id: string;
          type: string;
          value: string;
          verification_status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          seller_id?: string;
          type?: string;
          value?: string;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_identifiers_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_profiles: {
        Row: {
          business_name: string;
          business_name_lao: string | null;
          created_at: string;
          description: string | null;
          district: string | null;
          etrust_id: string | null;
          facebook_url: string | null;
          id: string;
          logo_url: string | null;
          owner_user_id: string;
          phone: string | null;
          province: string | null;
          tiktok_url: string | null;
          updated_at: string;
          verification_status: string;
        };
        Insert: {
          business_name: string;
          business_name_lao?: string | null;
          created_at?: string;
          description?: string | null;
          district?: string | null;
          etrust_id?: string | null;
          facebook_url?: string | null;
          id?: string;
          logo_url?: string | null;
          owner_user_id: string;
          phone?: string | null;
          province?: string | null;
          tiktok_url?: string | null;
          updated_at?: string;
          verification_status?: string;
        };
        Update: {
          business_name?: string;
          business_name_lao?: string | null;
          created_at?: string;
          description?: string | null;
          district?: string | null;
          etrust_id?: string | null;
          facebook_url?: string | null;
          id?: string;
          logo_url?: string | null;
          owner_user_id?: string;
          phone?: string | null;
          province?: string | null;
          tiktok_url?: string | null;
          updated_at?: string;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_profiles_owner_user_id_fkey";
            columns: ["owner_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      verification_upload_intents: {
        Row: {
          created_at: string;
          expires_at: string;
          mime_type: string;
          path: string;
          seller_id: string;
          verification_type: string;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          mime_type: string;
          path: string;
          seller_id: string;
          verification_type: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          mime_type?: string;
          path?: string;
          seller_id?: string;
          verification_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verification_upload_intents_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seller_verifications: {
        Row: {
          created_at: string;
          document_paths: string[] | null;
          id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          reviewer_notes: string | null;
          seller_id: string;
          status: string;
          submitted_data: Json | null;
          verification_type: string;
        };
        Insert: {
          created_at?: string;
          document_paths?: string[] | null;
          id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_notes?: string | null;
          seller_id: string;
          status?: string;
          submitted_data?: Json | null;
          verification_type: string;
        };
        Update: {
          created_at?: string;
          document_paths?: string[] | null;
          id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          reviewer_notes?: string | null;
          seller_id?: string;
          status?: string;
          submitted_data?: Json | null;
          verification_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "seller_verifications_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "seller_verifications_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          expires_at: string | null;
          id: string;
          payment_reference: string | null;
          plan: string;
          seller_id: string;
          started_at: string;
          status: string;
        };
        Insert: {
          expires_at?: string | null;
          id?: string;
          payment_reference?: string | null;
          plan: string;
          seller_id: string;
          started_at?: string;
          status?: string;
        };
        Update: {
          expires_at?: string | null;
          id?: string;
          payment_reference?: string | null;
          plan?: string;
          seller_id?: string;
          started_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_queue: {
        Row: {
          attempts: number;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          last_error: string | null;
          operation: string;
          payload: Json;
          synced_at: string | null;
          user_id: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          last_error?: string | null;
          operation: string;
          payload: Json;
          synced_at?: string | null;
          user_id: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          last_error?: string | null;
          operation?: string;
          payload?: Json;
          synced_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sync_queue_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      trust_checks: {
        Row: {
          created_at: string;
          id: string;
          query_type: string;
          query_value: string;
          result: Json | null;
          seller_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          query_type: string;
          query_value: string;
          result?: Json | null;
          seller_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          query_type?: string;
          query_value?: string;
          result?: Json | null;
          seller_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "trust_checks_seller_id_fkey";
            columns: ["seller_id"];
            isOneToOne: false;
            referencedRelation: "seller_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trust_checks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          phone: string | null;
          role: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          phone?: string | null;
          role?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          phone?: string | null;
          role?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_decide_verification: {
        Args: {
          p_action: string;
          p_admin_id: string;
          p_reviewer_notes?: string | null;
          p_verification_id: string;
        };
        Returns: Json;
      };
      admin_suspend_seller: {
        Args: { p_admin_id: string; p_reason: string; p_seller_id: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
