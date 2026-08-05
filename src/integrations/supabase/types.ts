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
  public: {
    Tables: {
      ai_quote_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json
          quote_context: Json
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          quote_context?: Json
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          quote_context?: Json
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      carriers: {
        Row: {
          coverage_categories: string[] | null
          created_at: string | null
          data_confidence: string | null
          data_source: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          last_data_update: string | null
          logo_url: string | null
          name: string
          states_available: string[] | null
          support_email: string | null
          support_phone: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          coverage_categories?: string[] | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          last_data_update?: string | null
          logo_url?: string | null
          name: string
          states_available?: string[] | null
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          coverage_categories?: string[] | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          last_data_update?: string | null
          logo_url?: string | null
          name?: string
          states_available?: string[] | null
          support_email?: string | null
          support_phone?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      data_import_log: {
        Row: {
          completed_at: string | null
          created_by: string | null
          domain: string
          error_log: Json | null
          id: string
          import_type: string | null
          records_created: number | null
          records_failed: number | null
          records_processed: number | null
          records_updated: number | null
          source_name: string
          started_at: string | null
          status: string | null
          version_tag: string | null
        }
        Insert: {
          completed_at?: string | null
          created_by?: string | null
          domain: string
          error_log?: Json | null
          id?: string
          import_type?: string | null
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          source_name: string
          started_at?: string | null
          status?: string | null
          version_tag?: string | null
        }
        Update: {
          completed_at?: string | null
          created_by?: string | null
          domain?: string
          error_log?: Json | null
          id?: string
          import_type?: string | null
          records_created?: number | null
          records_failed?: number | null
          records_processed?: number | null
          records_updated?: number | null
          source_name?: string
          started_at?: string | null
          status?: string | null
          version_tag?: string | null
        }
        Relationships: []
      }
      enrollment_events: {
        Row: {
          actor: string | null
          created_at: string
          detail: Json
          event_type: string
          id: string
          session_id: string
        }
        Insert: {
          actor?: string | null
          created_at?: string
          detail?: Json
          event_type: string
          id?: string
          session_id: string
        }
        Update: {
          actor?: string | null
          created_at?: string
          detail?: Json
          event_type?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "enrollment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_sessions: {
        Row: {
          agent_note: string | null
          annual_income: number | null
          assigned_agent: string | null
          compared_plans: Json
          contact: Json | null
          correction_note: string | null
          county_fips: string | null
          created_at: string
          effective_date: string | null
          external_id: string | null
          field_corrections: Json
          handoff_at: string | null
          handoff_idempotency_key: string | null
          handoff_opened_at: string | null
          handoff_request_id: string | null
          handoff_status: string | null
          healthsherpa_client_apply_url: string | null
          healthsherpa_confirmation_id: string | null
          healthsherpa_enrollment_session_id: string | null
          healthsherpa_enrollment_url: string | null
          healthsherpa_shopping_url: string | null
          household_size: number | null
          id: string
          income_period: string | null
          last_reconciled_at: string | null
          last_reconciliation_attempt_at: string | null
          members: Json
          policy_status: Json
          public_token: string
          reconciliation_error: string | null
          reviewed_at: string | null
          saved_doctors: Json
          saved_prescriptions: Json
          selected_plan: Json | null
          state: string | null
          status: Database["public"]["Enums"]["enrollment_session_status"]
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          agent_note?: string | null
          annual_income?: number | null
          assigned_agent?: string | null
          compared_plans?: Json
          contact?: Json | null
          correction_note?: string | null
          county_fips?: string | null
          created_at?: string
          effective_date?: string | null
          external_id?: string | null
          field_corrections?: Json
          handoff_at?: string | null
          handoff_idempotency_key?: string | null
          handoff_opened_at?: string | null
          handoff_request_id?: string | null
          handoff_status?: string | null
          healthsherpa_client_apply_url?: string | null
          healthsherpa_confirmation_id?: string | null
          healthsherpa_enrollment_session_id?: string | null
          healthsherpa_enrollment_url?: string | null
          healthsherpa_shopping_url?: string | null
          household_size?: number | null
          id?: string
          income_period?: string | null
          last_reconciled_at?: string | null
          last_reconciliation_attempt_at?: string | null
          members?: Json
          policy_status?: Json
          public_token: string
          reconciliation_error?: string | null
          reviewed_at?: string | null
          saved_doctors?: Json
          saved_prescriptions?: Json
          selected_plan?: Json | null
          state?: string | null
          status?: Database["public"]["Enums"]["enrollment_session_status"]
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          agent_note?: string | null
          annual_income?: number | null
          assigned_agent?: string | null
          compared_plans?: Json
          contact?: Json | null
          correction_note?: string | null
          county_fips?: string | null
          created_at?: string
          effective_date?: string | null
          external_id?: string | null
          field_corrections?: Json
          handoff_at?: string | null
          handoff_idempotency_key?: string | null
          handoff_opened_at?: string | null
          handoff_request_id?: string | null
          handoff_status?: string | null
          healthsherpa_client_apply_url?: string | null
          healthsherpa_confirmation_id?: string | null
          healthsherpa_enrollment_session_id?: string | null
          healthsherpa_enrollment_url?: string | null
          healthsherpa_shopping_url?: string | null
          household_size?: number | null
          id?: string
          income_period?: string | null
          last_reconciled_at?: string | null
          last_reconciliation_attempt_at?: string | null
          members?: Json
          policy_status?: Json
          public_token?: string
          reconciliation_error?: string | null
          reviewed_at?: string | null
          saved_doctors?: Json
          saved_prescriptions?: Json
          selected_plan?: Json | null
          state?: string | null
          status?: Database["public"]["Enums"]["enrollment_session_status"]
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      formularies: {
        Row: {
          carrier_id: string
          coverage_notes: string | null
          created_at: string | null
          data_confidence: string | null
          data_source: string | null
          id: string
          is_covered: boolean | null
          last_data_update: string | null
          mail_order_available: boolean | null
          medication_id: string
          plan_id: string
          preferred_pharmacy_only: boolean | null
          quantity_limit: boolean | null
          quantity_limit_detail: string | null
          requires_prior_auth: boolean | null
          requires_step_therapy: boolean | null
          tier: number | null
          tier_label: string | null
        }
        Insert: {
          carrier_id: string
          coverage_notes?: string | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          id?: string
          is_covered?: boolean | null
          last_data_update?: string | null
          mail_order_available?: boolean | null
          medication_id: string
          plan_id: string
          preferred_pharmacy_only?: boolean | null
          quantity_limit?: boolean | null
          quantity_limit_detail?: string | null
          requires_prior_auth?: boolean | null
          requires_step_therapy?: boolean | null
          tier?: number | null
          tier_label?: string | null
        }
        Update: {
          carrier_id?: string
          coverage_notes?: string | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          id?: string
          is_covered?: boolean | null
          last_data_update?: string | null
          mail_order_available?: boolean | null
          medication_id?: string
          plan_id?: string
          preferred_pharmacy_only?: boolean | null
          quantity_limit?: boolean | null
          quantity_limit_detail?: string | null
          requires_prior_auth?: boolean | null
          requires_step_therapy?: boolean | null
          tier?: number | null
          tier_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formularies_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formularies_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formularies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          brand_name: string | null
          created_at: string | null
          data_confidence: string | null
          data_source: string | null
          dosage: string | null
          form: string | null
          generic_name: string
          id: string
          is_active: boolean | null
          is_generic: boolean | null
          last_data_update: string | null
          search_keywords: string[] | null
          strength: string | null
          therapeutic_class: string | null
          updated_at: string | null
        }
        Insert: {
          brand_name?: string | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          dosage?: string | null
          form?: string | null
          generic_name: string
          id?: string
          is_active?: boolean | null
          is_generic?: boolean | null
          last_data_update?: string | null
          search_keywords?: string[] | null
          strength?: string | null
          therapeutic_class?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_name?: string | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          dosage?: string | null
          form?: string | null
          generic_name?: string
          id?: string
          is_active?: boolean | null
          is_generic?: boolean | null
          last_data_update?: string | null
          search_keywords?: string[] | null
          strength?: string | null
          therapeutic_class?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      networks: {
        Row: {
          carrier_id: string
          created_at: string | null
          data_confidence: string | null
          data_source: string | null
          effective_date: string | null
          id: string
          is_active: boolean | null
          last_data_update: string | null
          name: string
          network_type: string | null
          service_area_description: string | null
          states: string[] | null
          termination_date: string | null
          updated_at: string | null
        }
        Insert: {
          carrier_id: string
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          last_data_update?: string | null
          name: string
          network_type?: string | null
          service_area_description?: string | null
          states?: string[] | null
          termination_date?: string | null
          updated_at?: string | null
        }
        Update: {
          carrier_id?: string
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          last_data_update?: string | null
          name?: string
          network_type?: string | null
          service_area_description?: string | null
          states?: string[] | null
          termination_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "networks_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          address_line1: string | null
          chain_brand: string | null
          city: string | null
          created_at: string | null
          data_confidence: string | null
          data_source: string | null
          id: string
          is_24hr: boolean | null
          is_active: boolean | null
          is_mail_order: boolean | null
          is_preferred: boolean | null
          last_data_update: string | null
          name: string
          phone: string | null
          service_types: string[] | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          chain_brand?: string | null
          city?: string | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          id?: string
          is_24hr?: boolean | null
          is_active?: boolean | null
          is_mail_order?: boolean | null
          is_preferred?: boolean | null
          last_data_update?: string | null
          name: string
          phone?: string | null
          service_types?: string[] | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          chain_brand?: string | null
          city?: string | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          id?: string
          is_24hr?: boolean | null
          is_active?: boolean | null
          is_mail_order?: boolean | null
          is_preferred?: boolean | null
          last_data_update?: string | null
          name?: string
          phone?: string | null
          service_types?: string[] | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      plan_pharmacies: {
        Row: {
          created_at: string | null
          id: string
          is_in_network: boolean | null
          is_preferred: boolean | null
          pharmacy_id: string
          plan_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_in_network?: boolean | null
          is_preferred?: boolean | null
          pharmacy_id: string
          plan_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_in_network?: boolean | null
          is_preferred?: boolean | null
          pharmacy_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_pharmacies_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_pharmacies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          benefits_summary: Json | null
          carrier_id: string
          coinsurance_rate: number | null
          copay_er: number | null
          copay_pcp: number | null
          copay_specialist: number | null
          created_at: string | null
          data_confidence: string | null
          data_source: string | null
          deductible_family: number | null
          deductible_individual: number | null
          enrollment_status: string | null
          hios_id: string | null
          id: string
          includes_dental: boolean | null
          includes_vision: boolean | null
          is_active: boolean | null
          last_data_update: string | null
          metal_tier: string | null
          network_id: string | null
          network_type: string | null
          oop_max_family: number | null
          oop_max_individual: number | null
          plan_category: string | null
          plan_name: string
          plan_year: number | null
          premium_family: number | null
          premium_individual: number | null
          service_area_states: string[] | null
          service_area_zips: string[] | null
          updated_at: string | null
        }
        Insert: {
          benefits_summary?: Json | null
          carrier_id: string
          coinsurance_rate?: number | null
          copay_er?: number | null
          copay_pcp?: number | null
          copay_specialist?: number | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          deductible_family?: number | null
          deductible_individual?: number | null
          enrollment_status?: string | null
          hios_id?: string | null
          id?: string
          includes_dental?: boolean | null
          includes_vision?: boolean | null
          is_active?: boolean | null
          last_data_update?: string | null
          metal_tier?: string | null
          network_id?: string | null
          network_type?: string | null
          oop_max_family?: number | null
          oop_max_individual?: number | null
          plan_category?: string | null
          plan_name: string
          plan_year?: number | null
          premium_family?: number | null
          premium_individual?: number | null
          service_area_states?: string[] | null
          service_area_zips?: string[] | null
          updated_at?: string | null
        }
        Update: {
          benefits_summary?: Json | null
          carrier_id?: string
          coinsurance_rate?: number | null
          copay_er?: number | null
          copay_pcp?: number | null
          copay_specialist?: number | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          deductible_family?: number | null
          deductible_individual?: number | null
          enrollment_status?: string | null
          hios_id?: string | null
          id?: string
          includes_dental?: boolean | null
          includes_vision?: boolean | null
          is_active?: boolean | null
          last_data_update?: string | null
          metal_tier?: string | null
          network_id?: string | null
          network_type?: string | null
          oop_max_family?: number | null
          oop_max_individual?: number | null
          plan_category?: string | null
          plan_name?: string
          plan_year?: number | null
          premium_family?: number | null
          premium_individual?: number | null
          service_area_states?: string[] | null
          service_area_zips?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_networks: {
        Row: {
          created_at: string | null
          data_confidence: string | null
          data_source: string | null
          effective_date: string | null
          id: string
          last_verified: string | null
          network_id: string
          participation_status: string | null
          provider_id: string
          termination_date: string | null
        }
        Insert: {
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          effective_date?: string | null
          id?: string
          last_verified?: string | null
          network_id: string
          participation_status?: string | null
          provider_id: string
          termination_date?: string | null
        }
        Update: {
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          effective_date?: string | null
          id?: string
          last_verified?: string | null
          network_id?: string
          participation_status?: string | null
          provider_id?: string
          termination_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_networks_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_networks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          accepting_new_patients: boolean | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          county: string | null
          created_at: string | null
          data_confidence: string | null
          data_source: string | null
          display_name: string
          facility_name: string | null
          fax: string | null
          first_name: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          is_facility: boolean | null
          languages: string[] | null
          last_data_update: string | null
          last_name: string | null
          npi: string | null
          phone: string | null
          practice_name: string | null
          provider_type: string | null
          specialty: string | null
          state: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          accepting_new_patients?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          county?: string | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          display_name: string
          facility_name?: string | null
          fax?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_facility?: boolean | null
          languages?: string[] | null
          last_data_update?: string | null
          last_name?: string | null
          npi?: string | null
          phone?: string | null
          practice_name?: string | null
          provider_type?: string | null
          specialty?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          accepting_new_patients?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          county?: string | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          display_name?: string
          facility_name?: string | null
          fax?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_facility?: boolean | null
          languages?: string[] | null
          last_data_update?: string | null
          last_name?: string | null
          npi?: string | null
          phone?: string | null
          practice_name?: string | null
          provider_type?: string | null
          specialty?: string | null
          state?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      recommendation_results: {
        Row: {
          created_at: string | null
          data_version: string | null
          deductible_fit_score: number | null
          doctor_match_score: number | null
          id: string
          lead_id: string | null
          logic_version: string | null
          match_explanation: Json | null
          match_tags: string[] | null
          overall_score: number | null
          plan_id: string | null
          premium_fit_score: number | null
          rx_match_score: number | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          data_version?: string | null
          deductible_fit_score?: number | null
          doctor_match_score?: number | null
          id?: string
          lead_id?: string | null
          logic_version?: string | null
          match_explanation?: Json | null
          match_tags?: string[] | null
          overall_score?: number | null
          plan_id?: string | null
          premium_fit_score?: number | null
          rx_match_score?: number | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          data_version?: string | null
          deductible_fit_score?: number | null
          doctor_match_score?: number | null
          id?: string
          lead_id?: string | null
          logic_version?: string | null
          match_explanation?: Json | null
          match_tags?: string[] | null
          overall_score?: number | null
          plan_id?: string | null
          premium_fit_score?: number | null
          rx_match_score?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_results_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "tool_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_results_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_lead_doctors: {
        Row: {
          city: string | null
          created_at: string | null
          doctor_name: string
          id: string
          is_selected: boolean | null
          lead_id: string
          practice_name: string | null
          specialty: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          doctor_name: string
          id?: string
          is_selected?: boolean | null
          lead_id: string
          practice_name?: string | null
          specialty?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          doctor_name?: string
          id?: string
          is_selected?: boolean | null
          lead_id?: string
          practice_name?: string | null
          specialty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_lead_doctors_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "tool_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_lead_flags: {
        Row: {
          created_at: string | null
          flag: string
          id: string
          lead_id: string
          resolved: boolean | null
        }
        Insert: {
          created_at?: string | null
          flag: string
          id?: string
          lead_id: string
          resolved?: boolean | null
        }
        Update: {
          created_at?: string | null
          flag?: string
          id?: string
          lead_id?: string
          resolved?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_lead_flags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "tool_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_lead_interactions: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          lead_id: string
          step: number | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id: string
          step?: number | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          lead_id?: string
          step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "tool_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_lead_notes: {
        Row: {
          author: string | null
          content: string
          created_at: string | null
          id: string
          lead_id: string
        }
        Insert: {
          author?: string | null
          content: string
          created_at?: string | null
          id?: string
          lead_id: string
        }
        Update: {
          author?: string | null
          content?: string
          created_at?: string | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "tool_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_lead_plans: {
        Row: {
          carrier: string | null
          created_at: string | null
          doctor_match: number | null
          fit_label: string | null
          id: string
          lead_id: string
          metal_tier: string | null
          network_type: string | null
          plan_name: string
          premium: number | null
          rx_match: number | null
          was_compared: boolean | null
          was_detail_viewed: boolean | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string | null
          doctor_match?: number | null
          fit_label?: string | null
          id?: string
          lead_id: string
          metal_tier?: string | null
          network_type?: string | null
          plan_name: string
          premium?: number | null
          rx_match?: number | null
          was_compared?: boolean | null
          was_detail_viewed?: boolean | null
        }
        Update: {
          carrier?: string | null
          created_at?: string | null
          doctor_match?: number | null
          fit_label?: string | null
          id?: string
          lead_id?: string
          metal_tier?: string | null
          network_type?: string | null
          plan_name?: string
          premium?: number | null
          rx_match?: number | null
          was_compared?: boolean | null
          was_detail_viewed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_lead_plans_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "tool_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_lead_prescriptions: {
        Row: {
          created_at: string | null
          dosage: string | null
          drug_tier: number | null
          id: string
          is_generic: boolean | null
          is_selected: boolean | null
          lead_id: string
          medication_name: string
        }
        Insert: {
          created_at?: string | null
          dosage?: string | null
          drug_tier?: number | null
          id?: string
          is_generic?: boolean | null
          is_selected?: boolean | null
          lead_id: string
          medication_name: string
        }
        Update: {
          created_at?: string | null
          dosage?: string | null
          drug_tier?: number | null
          id?: string
          is_generic?: boolean | null
          is_selected?: boolean | null
          lead_id?: string
          medication_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_lead_prescriptions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "tool_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_lead_tags: {
        Row: {
          auto_generated: boolean | null
          created_at: string | null
          id: string
          lead_id: string
          tag: string
        }
        Insert: {
          auto_generated?: boolean | null
          created_at?: string | null
          id?: string
          lead_id: string
          tag: string
        }
        Update: {
          auto_generated?: boolean | null
          created_at?: string | null
          id?: string
          lead_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "tool_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_leads: {
        Row: {
          age_bracket: string | null
          annual_income: string | null
          assigned_agent: string | null
          callback_priority: boolean | null
          carrier_preference: string | null
          city: string | null
          county: string | null
          coverage_category: string | null
          created_at: string | null
          deductible_preference: string | null
          email: string | null
          final_cta_taken: string | null
          first_name: string | null
          highest_step_reached: number | null
          household_size: number | null
          id: string
          intent_level: Database["public"]["Enums"]["intent_level"] | null
          intent_score: number | null
          last_name: string | null
          monthly_budget: string | null
          network_preference: string | null
          phone: string | null
          priorities: string[] | null
          routing_team: string | null
          session_id: string
          state: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          steps_completed: number | null
          subsidy_eligible: boolean | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          age_bracket?: string | null
          annual_income?: string | null
          assigned_agent?: string | null
          callback_priority?: boolean | null
          carrier_preference?: string | null
          city?: string | null
          county?: string | null
          coverage_category?: string | null
          created_at?: string | null
          deductible_preference?: string | null
          email?: string | null
          final_cta_taken?: string | null
          first_name?: string | null
          highest_step_reached?: number | null
          household_size?: number | null
          id?: string
          intent_level?: Database["public"]["Enums"]["intent_level"] | null
          intent_score?: number | null
          last_name?: string | null
          monthly_budget?: string | null
          network_preference?: string | null
          phone?: string | null
          priorities?: string[] | null
          routing_team?: string | null
          session_id?: string
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          steps_completed?: number | null
          subsidy_eligible?: boolean | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          age_bracket?: string | null
          annual_income?: string | null
          assigned_agent?: string | null
          callback_priority?: boolean | null
          carrier_preference?: string | null
          city?: string | null
          county?: string | null
          coverage_category?: string | null
          created_at?: string | null
          deductible_preference?: string | null
          email?: string | null
          final_cta_taken?: string | null
          first_name?: string | null
          highest_step_reached?: number | null
          household_size?: number | null
          id?: string
          intent_level?: Database["public"]["Enums"]["intent_level"] | null
          intent_score?: number | null
          last_name?: string | null
          monthly_budget?: string | null
          network_preference?: string | null
          phone?: string | null
          priorities?: string[] | null
          routing_team?: string | null
          session_id?: string
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          steps_completed?: number | null
          subsidy_eligible?: boolean | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      agent_add_note: {
        Args: { _note: string; _session_id: string }
        Returns: {
          agent_note: string | null
          annual_income: number | null
          assigned_agent: string | null
          compared_plans: Json
          contact: Json | null
          correction_note: string | null
          county_fips: string | null
          created_at: string
          effective_date: string | null
          external_id: string | null
          field_corrections: Json
          handoff_at: string | null
          handoff_idempotency_key: string | null
          handoff_opened_at: string | null
          handoff_request_id: string | null
          handoff_status: string | null
          healthsherpa_client_apply_url: string | null
          healthsherpa_confirmation_id: string | null
          healthsherpa_enrollment_session_id: string | null
          healthsherpa_enrollment_url: string | null
          healthsherpa_shopping_url: string | null
          household_size: number | null
          id: string
          income_period: string | null
          last_reconciled_at: string | null
          last_reconciliation_attempt_at: string | null
          members: Json
          policy_status: Json
          public_token: string
          reconciliation_error: string | null
          reviewed_at: string | null
          saved_doctors: Json
          saved_prescriptions: Json
          selected_plan: Json | null
          state: string | null
          status: Database["public"]["Enums"]["enrollment_session_status"]
          updated_at: string
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "enrollment_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      agent_approve_review: {
        Args: { _session_id: string }
        Returns: {
          agent_note: string | null
          annual_income: number | null
          assigned_agent: string | null
          compared_plans: Json
          contact: Json | null
          correction_note: string | null
          county_fips: string | null
          created_at: string
          effective_date: string | null
          external_id: string | null
          field_corrections: Json
          handoff_at: string | null
          handoff_idempotency_key: string | null
          handoff_opened_at: string | null
          handoff_request_id: string | null
          handoff_status: string | null
          healthsherpa_client_apply_url: string | null
          healthsherpa_confirmation_id: string | null
          healthsherpa_enrollment_session_id: string | null
          healthsherpa_enrollment_url: string | null
          healthsherpa_shopping_url: string | null
          household_size: number | null
          id: string
          income_period: string | null
          last_reconciled_at: string | null
          last_reconciliation_attempt_at: string | null
          members: Json
          policy_status: Json
          public_token: string
          reconciliation_error: string | null
          reviewed_at: string | null
          saved_doctors: Json
          saved_prescriptions: Json
          selected_plan: Json | null
          state: string | null
          status: Database["public"]["Enums"]["enrollment_session_status"]
          updated_at: string
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "enrollment_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      agent_claim_review: {
        Args: { _session_id: string }
        Returns: {
          agent_note: string | null
          annual_income: number | null
          assigned_agent: string | null
          compared_plans: Json
          contact: Json | null
          correction_note: string | null
          county_fips: string | null
          created_at: string
          effective_date: string | null
          external_id: string | null
          field_corrections: Json
          handoff_at: string | null
          handoff_idempotency_key: string | null
          handoff_opened_at: string | null
          handoff_request_id: string | null
          handoff_status: string | null
          healthsherpa_client_apply_url: string | null
          healthsherpa_confirmation_id: string | null
          healthsherpa_enrollment_session_id: string | null
          healthsherpa_enrollment_url: string | null
          healthsherpa_shopping_url: string | null
          household_size: number | null
          id: string
          income_period: string | null
          last_reconciled_at: string | null
          last_reconciliation_attempt_at: string | null
          members: Json
          policy_status: Json
          public_token: string
          reconciliation_error: string | null
          reviewed_at: string | null
          saved_doctors: Json
          saved_prescriptions: Json
          selected_plan: Json | null
          state: string | null
          status: Database["public"]["Enums"]["enrollment_session_status"]
          updated_at: string
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "enrollment_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      agent_release_review: {
        Args: { _session_id: string }
        Returns: {
          agent_note: string | null
          annual_income: number | null
          assigned_agent: string | null
          compared_plans: Json
          contact: Json | null
          correction_note: string | null
          county_fips: string | null
          created_at: string
          effective_date: string | null
          external_id: string | null
          field_corrections: Json
          handoff_at: string | null
          handoff_idempotency_key: string | null
          handoff_opened_at: string | null
          handoff_request_id: string | null
          handoff_status: string | null
          healthsherpa_client_apply_url: string | null
          healthsherpa_confirmation_id: string | null
          healthsherpa_enrollment_session_id: string | null
          healthsherpa_enrollment_url: string | null
          healthsherpa_shopping_url: string | null
          household_size: number | null
          id: string
          income_period: string | null
          last_reconciled_at: string | null
          last_reconciliation_attempt_at: string | null
          members: Json
          policy_status: Json
          public_token: string
          reconciliation_error: string | null
          reviewed_at: string | null
          saved_doctors: Json
          saved_prescriptions: Json
          selected_plan: Json | null
          state: string | null
          status: Database["public"]["Enums"]["enrollment_session_status"]
          updated_at: string
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "enrollment_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      agent_request_correction: {
        Args: { _fields?: Json; _note: string; _session_id: string }
        Returns: {
          agent_note: string | null
          annual_income: number | null
          assigned_agent: string | null
          compared_plans: Json
          contact: Json | null
          correction_note: string | null
          county_fips: string | null
          created_at: string
          effective_date: string | null
          external_id: string | null
          field_corrections: Json
          handoff_at: string | null
          handoff_idempotency_key: string | null
          handoff_opened_at: string | null
          handoff_request_id: string | null
          handoff_status: string | null
          healthsherpa_client_apply_url: string | null
          healthsherpa_confirmation_id: string | null
          healthsherpa_enrollment_session_id: string | null
          healthsherpa_enrollment_url: string | null
          healthsherpa_shopping_url: string | null
          household_size: number | null
          id: string
          income_period: string | null
          last_reconciled_at: string | null
          last_reconciliation_attempt_at: string | null
          members: Json
          policy_status: Json
          public_token: string
          reconciliation_error: string | null
          reviewed_at: string | null
          saved_doctors: Json
          saved_prescriptions: Json
          selected_plan: Json | null
          state: string | null
          status: Database["public"]["Enums"]["enrollment_session_status"]
          updated_at: string
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "enrollment_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_handoff: {
        Args: {
          _actor: string
          _external_id: string
          _idempotency_key: string
          _regenerate?: boolean
          _session_id: string
        }
        Returns: Json
      }
      current_actor: { Args: never; Returns: string }
      enrollment_correction_paths: { Args: never; Returns: string[] }
      get_enrollment_session: {
        Args: { _public_token: string }
        Returns: {
          agent_note: string | null
          annual_income: number | null
          assigned_agent: string | null
          compared_plans: Json
          contact: Json | null
          correction_note: string | null
          county_fips: string | null
          created_at: string
          effective_date: string | null
          external_id: string | null
          field_corrections: Json
          handoff_at: string | null
          handoff_idempotency_key: string | null
          handoff_opened_at: string | null
          handoff_request_id: string | null
          handoff_status: string | null
          healthsherpa_client_apply_url: string | null
          healthsherpa_confirmation_id: string | null
          healthsherpa_enrollment_session_id: string | null
          healthsherpa_enrollment_url: string | null
          healthsherpa_shopping_url: string | null
          household_size: number | null
          id: string
          income_period: string | null
          last_reconciled_at: string | null
          last_reconciliation_attempt_at: string | null
          members: Json
          policy_status: Json
          public_token: string
          reconciliation_error: string | null
          reviewed_at: string | null
          saved_doctors: Json
          saved_prescriptions: Json
          selected_plan: Json | null
          state: string | null
          status: Database["public"]["Enums"]["enrollment_session_status"]
          updated_at: string
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "enrollment_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_lead: { Args: { _lead_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      lead_session_matches: {
        Args: { _lead_id: string; _session_id: string }
        Returns: boolean
      }
      record_enrollment_event: {
        Args: { _detail?: Json; _event_type: string; _session_id: string }
        Returns: undefined
      }
      save_enrollment_session: {
        Args: { _patch: Json; _public_token: string }
        Returns: {
          agent_note: string | null
          annual_income: number | null
          assigned_agent: string | null
          compared_plans: Json
          contact: Json | null
          correction_note: string | null
          county_fips: string | null
          created_at: string
          effective_date: string | null
          external_id: string | null
          field_corrections: Json
          handoff_at: string | null
          handoff_idempotency_key: string | null
          handoff_opened_at: string | null
          handoff_request_id: string | null
          handoff_status: string | null
          healthsherpa_client_apply_url: string | null
          healthsherpa_confirmation_id: string | null
          healthsherpa_enrollment_session_id: string | null
          healthsherpa_enrollment_url: string | null
          healthsherpa_shopping_url: string | null
          household_size: number | null
          id: string
          income_period: string | null
          last_reconciled_at: string | null
          last_reconciliation_attempt_at: string | null
          members: Json
          policy_status: Json
          public_token: string
          reconciliation_error: string | null
          reviewed_at: string | null
          saved_doctors: Json
          saved_prescriptions: Json
          selected_plan: Json | null
          state: string | null
          status: Database["public"]["Enums"]["enrollment_session_status"]
          updated_at: string
          zip_code: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "enrollment_sessions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      start_enrollment_session: {
        Args: never
        Returns: {
          id: string
          public_token: string
        }[]
      }
      validate_enrollment_session_row: {
        Args: { s: Database["public"]["Tables"]["enrollment_sessions"]["Row"] }
        Returns: string[]
      }
    }
    Enums: {
      app_role: "admin" | "agent"
      enrollment_session_status:
        | "intake_in_progress"
        | "ready_for_agent_review"
        | "needs_consumer_correction"
        | "agent_approved"
        | "healthsherpa_handoff_created"
        | "enrollment_completion_unknown"
        | "enrollment_confirmed"
        | "follow_up_required"
        | "in_agent_review"
        | "enrollment_in_progress"
        | "completed"
        | "reconciliation_required"
      intent_level: "low" | "medium" | "high" | "ready_for_agent"
      lead_status:
        | "new_tool_lead"
        | "partial_completion"
        | "doctor_search_completed"
        | "rx_search_completed"
        | "plan_compare_completed"
        | "high_intent_review"
        | "ready_for_agent"
        | "contacted"
        | "in_follow_up"
        | "plan_guidance"
        | "enrolled"
        | "lost"
        | "nurture"
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
      app_role: ["admin", "agent"],
      enrollment_session_status: [
        "intake_in_progress",
        "ready_for_agent_review",
        "needs_consumer_correction",
        "agent_approved",
        "healthsherpa_handoff_created",
        "enrollment_completion_unknown",
        "enrollment_confirmed",
        "follow_up_required",
        "in_agent_review",
        "enrollment_in_progress",
        "completed",
        "reconciliation_required",
      ],
      intent_level: ["low", "medium", "high", "ready_for_agent"],
      lead_status: [
        "new_tool_lead",
        "partial_completion",
        "doctor_search_completed",
        "rx_search_completed",
        "plan_compare_completed",
        "high_intent_review",
        "ready_for_agent",
        "contacted",
        "in_follow_up",
        "plan_guidance",
        "enrolled",
        "lost",
        "nurture",
      ],
    },
  },
} as const
