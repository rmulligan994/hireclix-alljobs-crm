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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      campaign_emails: {
        Row: {
          bee_json: Json | null
          campaign_id: string
          compose_kind: string | null
          created_at: string
          delay_days: number
          delay_hours: number
          email_template_id: string | null
          form_payload: Json | null
          html_content: string | null
          id: string
          step_order: number
          subject: string
          updated_at: string
        }
        Insert: {
          bee_json?: Json | null
          campaign_id: string
          compose_kind?: string | null
          created_at?: string
          delay_days?: number
          delay_hours?: number
          email_template_id?: string | null
          form_payload?: Json | null
          html_content?: string | null
          id?: string
          step_order?: number
          subject: string
          updated_at?: string
        }
        Update: {
          bee_json?: Json | null
          campaign_id?: string
          compose_kind?: string | null
          created_at?: string
          delay_days?: number
          delay_hours?: number
          email_template_id?: string | null
          form_payload?: Json | null
          html_content?: string | null
          id?: string
          step_order?: number
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_emails_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          candidate_id: string
          clicked_at: string | null
          created_at: string
          id: string
          message_id: string | null
          opened_at: string | null
          responded_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          candidate_id: string
          clicked_at?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          opened_at?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          candidate_id?: string
          clicked_at?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          opened_at?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_recipients_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          archived_at: string | null
          audience_filter: Json | null
          created_at: string
          folder_id: string | null
          goal: string | null
          id: string
          is_organization_campaign: boolean | null
          job_id: string | null
          name: string
          schedule_recurrence: Json | null
          scheduled_at: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          audience_filter?: Json | null
          created_at?: string
          folder_id?: string | null
          goal?: string | null
          id?: string
          is_organization_campaign?: boolean | null
          job_id?: string | null
          name: string
          schedule_recurrence?: Json | null
          scheduled_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          audience_filter?: Json | null
          created_at?: string
          folder_id?: string | null
          goal?: string | null
          id?: string
          is_organization_campaign?: boolean | null
          job_id?: string | null
          name?: string
          schedule_recurrence?: Json | null
          scheduled_at?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "campaign_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_resumes: {
        Row: {
          candidate_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          is_primary: boolean
          mime_type: string | null
          uploaded_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          candidate_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          is_primary?: boolean
          mime_type?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          candidate_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          is_primary?: boolean
          mime_type?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "candidate_resumes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_resumes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          marketing_email_unsubscribed: boolean
          phone: string | null
          search_vector: unknown
          source: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          marketing_email_unsubscribed?: boolean
          phone?: string | null
          /** Omitted on insert — maintained by DB trigger / generated column */
          search_vector?: unknown
          source?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          marketing_email_unsubscribed?: boolean
          phone?: string | null
          search_vector?: unknown
          source?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      communications: {
        Row: {
          campaign_recipient_id: string | null
          candidate_id: string
          content: string | null
          created_at: string
          created_by: string | null
          direction: string | null
          external_message_id: string | null
          id: string
          occurred_at: string
          subject: string | null
          type: string
        }
        Insert: {
          campaign_recipient_id?: string | null
          candidate_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string | null
          external_message_id?: string | null
          id?: string
          occurred_at?: string
          subject?: string | null
          type: string
        }
        Update: {
          campaign_recipient_id?: string | null
          candidate_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string | null
          external_message_id?: string | null
          id?: string
          occurred_at?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_campaign_recipient_id_fkey"
            columns: ["campaign_recipient_id"]
            isOneToOne: false
            referencedRelation: "campaign_recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          bee_json: Json | null
          category: string
          compose_kind: string | null
          created_at: string
          form_payload: Json | null
          html_content: string | null
          id: string
          is_default: boolean
          name: string
          preheader: string | null
          subject: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bee_json?: Json | null
          category?: string
          compose_kind?: string | null
          created_at?: string
          form_payload?: Json | null
          html_content?: string | null
          id?: string
          is_default?: boolean
          name: string
          preheader?: string | null
          subject?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bee_json?: Json | null
          category?: string
          compose_kind?: string | null
          created_at?: string
          form_payload?: Json | null
          html_content?: string | null
          id?: string
          is_default?: boolean
          name?: string
          preheader?: string | null
          subject?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_ai_usage: {
        Row: {
          created_at: string
          id: string
          mode: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string
          department: string | null
          description: string | null
          id: string
          last_updated: string | null
          location: string | null
          posted_date: string | null
          req_id: string | null
          slug: string | null
          title: string
          type: string | null
          updated_at: string
          url: string | null
          view_url: string | null
          webflow_item_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          last_updated?: string | null
          location?: string | null
          posted_date?: string | null
          req_id?: string | null
          slug?: string | null
          title: string
          type?: string | null
          updated_at?: string
          url?: string | null
          view_url?: string | null
          webflow_item_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          last_updated?: string | null
          location?: string | null
          posted_date?: string | null
          req_id?: string | null
          slug?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          url?: string | null
          view_url?: string | null
          webflow_item_id?: string
        }
        Relationships: []
      }
      jobs_sync_logs: {
        Row: {
          completed_at: string | null
          error_detail: string | null
          error_message: string | null
          id: string
          jobs_fetched: number | null
          jobs_upserted: number | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_detail?: string | null
          error_message?: string | null
          id?: string
          jobs_fetched?: number | null
          jobs_upserted?: number | null
          started_at?: string
          status: string
        }
        Update: {
          completed_at?: string | null
          error_detail?: string | null
          error_message?: string | null
          id?: string
          jobs_fetched?: number | null
          jobs_upserted?: number | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          candidate_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates_enriched"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          base_url: string | null
          brand_name: string | null
          career_site_base_url: string | null
          company_name: string | null
          created_at: string
          id: string
          updated_at: string
          webflow_api_token: string | null
          webflow_collection_id: string | null
          webflow_job_field_mapping: Json | null
          webflow_site_id: string | null
          welcome_email_enabled: boolean
          welcome_email_template_id: string | null
        }
        Insert: {
          base_url?: string | null
          brand_name?: string | null
          career_site_base_url?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          webflow_api_token?: string | null
          webflow_collection_id?: string | null
          webflow_job_field_mapping?: Json | null
          webflow_site_id?: string | null
          welcome_email_enabled?: boolean
          welcome_email_template_id?: string | null
        }
        Update: {
          base_url?: string | null
          brand_name?: string | null
          career_site_base_url?: string | null
          company_name?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          webflow_api_token?: string | null
          webflow_collection_id?: string | null
          webflow_job_field_mapping?: Json | null
          webflow_site_id?: string | null
          welcome_email_enabled?: boolean
          welcome_email_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_welcome_email_template_id_fkey"
            columns: ["welcome_email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_candidates: {
        Row: {
          added_at: string
          candidate_id: string
          id: string
          pipeline_id: string
          stage: string
          updated_at: string
        }
        Insert: {
          added_at?: string
          candidate_id: string
          id?: string
          pipeline_id: string
          stage: string
          updated_at?: string
        }
        Update: {
          added_at?: string
          candidate_id?: string
          id?: string
          pipeline_id?: string
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_candidates_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          stages: Json
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          stages?: Json
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          stages?: Json
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          linkedin_url: string | null
          phone: string | null
          role: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          phone?: string | null
          role?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          linkedin_url?: string | null
          phone?: string | null
          role?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          campaign_email_id: string
          campaign_id: string
          campaign_recipient_id: string
          created_at: string
          error_message: string | null
          id: string
          recurrence: string | null
          scheduled_at: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_email_id: string
          campaign_id: string
          campaign_recipient_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          recurrence?: string | null
          scheduled_at: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_email_id?: string
          campaign_id?: string
          campaign_recipient_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          recurrence?: string | null
          scheduled_at?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_campaign_email_id_fkey"
            columns: ["campaign_email_id"]
            isOneToOne: false
            referencedRelation: "campaign_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_emails_campaign_recipient_id_fkey"
            columns: ["campaign_recipient_id"]
            isOneToOne: false
            referencedRelation: "campaign_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pool_candidates: {
        Row: {
          added_at: string
          candidate_id: string
          id: string
          talent_pool_id: string
        }
        Insert: {
          added_at?: string
          candidate_id: string
          id?: string
          talent_pool_id: string
        }
        Update: {
          added_at?: string
          candidate_id?: string
          id?: string
          talent_pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_pool_candidates_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates_enriched"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_pool_candidates_talent_pool_id_fkey"
            columns: ["talent_pool_id"]
            isOneToOne: false
            referencedRelation: "talent_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pools: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      candidates_enriched: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          first_name: string | null
          id: string | null
          last_activity_at: string | null
          last_contact_at: string | null
          last_name: string | null
          linkedin_url: string | null
          location: string | null
          marketing_email_unsubscribed: boolean | null
          phone: string | null
          pipeline_associations: Json | null
          source: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_activity_at?: never
          last_contact_at?: never
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          pipeline_associations?: never
          source?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_activity_at?: never
          last_contact_at?: never
          last_name?: string | null
          linkedin_url?: string | null
          location?: string | null
          phone?: string | null
          pipeline_associations?: never
          source?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      candidate_title_experience_tags: {
        Args: { title: string }
        Returns: string[]
      }
      get_candidate_duplicate_groups: { Args: never; Returns: Json }
      search_candidates_enriched: {
        Args: {
          p_adv_company?: string
          p_adv_date_added_from?: string
          p_adv_date_added_to?: string
          p_adv_email?: string
          p_adv_last_contact_from?: string
          p_adv_last_contact_to?: string
          p_adv_location?: string
          p_adv_name?: string
          p_adv_phone?: string
          p_adv_skills?: string[]
          p_adv_title?: string
          p_exclude_ids?: string[]
          p_filter_companies?: string[]
          p_filter_date_added_from?: string
          p_filter_date_added_to?: string
          p_filter_experience_levels?: string[]
          p_filter_last_contact_from?: string
          p_filter_last_contact_never?: boolean
          p_filter_last_contact_to?: string
          p_filter_locations?: string[]
          p_filter_pipeline_stages?: string[]
          p_filter_pipelines?: string[]
          p_filter_skills?: string[]
          p_filter_sources?: string[]
          p_filter_talent_pool_names?: string[]
          p_include_all_if_under?: number
          p_limit?: number
          p_offset?: number
          p_scope_candidate_ids?: string[]
          p_search?: string
          p_sort?: string
          p_use_websearch?: boolean
        }
        Returns: Json
      }
      search_pipelines_campaigns_fuzzy: {
        Args: {
          p_campaign_limit?: number
          p_pipeline_limit?: number
          p_query: string
        }
        Returns: Json
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      trigger_jobs_sync: { Args: never; Returns: undefined }
      trigger_process_scheduled_emails: { Args: never; Returns: undefined }
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
