export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      calendar_events: {
        Row: {
          attending: Json;
          supplies: Json;
          attendees: string[];
          created_by: string;
          ends_at: string | null;
          family_id: string;
          id: string;
          location: string | null;
          source_text: string;
          starts_at: string;
          title: string;
        };
        Insert: {
          attending?: Json;
          supplies?: Json;
          attendees?: string[];
          created_by: string;
          ends_at?: string | null;
          family_id: string;
          id: string;
          location?: string | null;
          source_text?: string;
          starts_at: string;
          title: string;
        };
        Update: {
          attending?: Json;
          supplies?: Json;
          attendees?: string[];
          created_by?: string;
          ends_at?: string | null;
          family_id?: string;
          id?: string;
          location?: string | null;
          source_text?: string;
          starts_at?: string;
          title?: string;
        };
        Relationships: [];
      };
      digests: {
        Row: {
          family_id: string;
          generated_at: string;
          highlights: string[];
          id: string;
          narrative: string;
          title: string;
          week_of: string;
        };
        Insert: {
          family_id: string;
          generated_at?: string;
          highlights?: string[];
          id: string;
          narrative: string;
          title: string;
          week_of: string;
        };
        Update: {
          family_id?: string;
          generated_at?: string;
          highlights?: string[];
          id?: string;
          narrative?: string;
          title?: string;
          week_of?: string;
        };
        Relationships: [];
      };
      family_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          email: string;
          family_id: string;
          id: string;
          invited_by: string | null;
          invitee_name: string;
          member_id: string;
          role: string;
          status: string;
          token: string;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          email: string;
          family_id: string;
          id: string;
          invited_by?: string | null;
          invitee_name: string;
          member_id: string;
          role?: string;
          status?: string;
          token: string;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          email?: string;
          family_id?: string;
          id?: string;
          invited_by?: string | null;
          invitee_name?: string;
          member_id?: string;
          role?: string;
          status?: string;
          token?: string;
        };
        Relationships: [];
      };
      families: {
        Row: {
          auto_add_family_calls: boolean;
          id: string;
          join_code: string;
          name: string;
          owner_id: string | null;
          tagline: string;
        };
        Insert: {
          auto_add_family_calls?: boolean;
          id: string;
          join_code?: string;
          name: string;
          owner_id?: string | null;
          tagline?: string;
        };
        Update: {
          auto_add_family_calls?: boolean;
          id?: string;
          join_code?: string;
          name?: string;
          owner_id?: string | null;
          tagline?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          account_role: string;
          created_at: string;
          display_name: string | null;
          family_id: string | null;
          id: string;
          member_id: string | null;
        };
        Insert: {
          account_role?: string;
          created_at?: string;
          display_name?: string | null;
          family_id?: string | null;
          id: string;
          member_id?: string | null;
        };
        Update: {
          account_role?: string;
          created_at?: string;
          display_name?: string | null;
          family_id?: string | null;
          id?: string;
          member_id?: string | null;
        };
        Relationships: [];
      };
      clinical_analysis_runs: {
        Row: {
          id: string;
          started_at: string;
          completed_at: string | null;
          status: string;
          patient_count: number;
          queued_count: number;
          error: string | null;
        };
        Insert: {
          id?: string;
          started_at?: string;
          completed_at?: string | null;
          status?: string;
          patient_count?: number;
          queued_count?: number;
          error?: string | null;
        };
        Update: {
          completed_at?: string | null;
          status?: string;
          patient_count?: number;
          queued_count?: number;
          error?: string | null;
        };
        Relationships: [];
      };
      clinical_snapshots: {
        Row: {
          id: string;
          run_id: string;
          member_id: string;
          family_id: string;
          risk_level: string;
          confidence: string;
          assessed_at: string;
          snapshot: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          member_id: string;
          family_id: string;
          risk_level: string;
          confidence: string;
          assessed_at: string;
          snapshot: Json;
          created_at?: string;
        };
        Update: {
          risk_level?: string;
          confidence?: string;
          assessed_at?: string;
          snapshot?: Json;
        };
        Relationships: [];
      };
      clinical_alerts: {
        Row: {
          id: string;
          snapshot_id: string;
          member_id: string;
          family_id: string;
          risk_level: string;
          status: string;
          fingerprint: string;
          title: string;
          summary: string;
          suggested_action: string;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          snapshot_id: string;
          member_id: string;
          family_id: string;
          risk_level: string;
          status?: string;
          fingerprint: string;
          title: string;
          summary: string;
          suggested_action: string;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
          reviewed_at?: string | null;
        };
        Update: {
          snapshot_id?: string;
          risk_level?: string;
          status?: string;
          title?: string;
          summary?: string;
          suggested_action?: string;
          assigned_to?: string | null;
          updated_at?: string;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      clinical_patient_assignments: {
        Row: {
          member_id: string;
          clinician_id: string;
          assigned_at: string;
        };
        Insert: {
          member_id: string;
          clinician_id: string;
          assigned_at?: string;
        };
        Update: {
          clinician_id?: string;
          assigned_at?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          age: number;
          apt: string;
          city: string;
          clinical_opt_in: boolean;
          color: string;
          country: string;
          easy_mode_default: boolean;
          family_id: string;
          id: string;
          initials: string;
          location: string;
          name: string;
          postal_code: string;
          role: string;
          state: string;
          street: string;
          user_id: string | null;
        };
        Insert: {
          age: number;
          apt?: string;
          city?: string;
          clinical_opt_in?: boolean;
          color: string;
          country?: string;
          easy_mode_default?: boolean;
          family_id: string;
          id: string;
          initials: string;
          location: string;
          name: string;
          postal_code?: string;
          role: string;
          state?: string;
          street?: string;
          user_id?: string | null;
        };
        Update: {
          age?: number;
          apt?: string;
          city?: string;
          clinical_opt_in?: boolean;
          color?: string;
          country?: string;
          easy_mode_default?: boolean;
          family_id?: string;
          id?: string;
          initials?: string;
          location?: string;
          name?: string;
          postal_code?: string;
          role?: string;
          state?: string;
          street?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          family_id: string;
          id: string;
          kind: string;
          photo_alt: string | null;
          photo_url: string | null;
          thread_id: string | null;
          transcript: string | null;
          voice_seconds: number | null;
          source_channel: string;
          external_message_id: string | null;
          audio_metrics: Json | null;
          raw_retained: boolean;
          linked_event_id: string | null;
        };
        Insert: {
          author_id: string;
          body?: string;
          created_at?: string;
          family_id: string;
          id: string;
          kind: string;
          photo_alt?: string | null;
          photo_url?: string | null;
          thread_id?: string | null;
          transcript?: string | null;
          voice_seconds?: number | null;
          source_channel?: string;
          external_message_id?: string | null;
          audio_metrics?: Json | null;
          raw_retained?: boolean;
          linked_event_id?: string | null;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          family_id?: string;
          id?: string;
          kind?: string;
          photo_alt?: string | null;
          photo_url?: string | null;
          thread_id?: string | null;
          transcript?: string | null;
          voice_seconds?: number | null;
          source_channel?: string;
          external_message_id?: string | null;
          audio_metrics?: Json | null;
          raw_retained?: boolean;
          linked_event_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_family_circle: {
        Args: {
          family_id_input: string;
          family_name_input: string;
          tagline_input: string;
          join_code_input: string;
          members_input: Json;
          you_member_id_input: string;
        };
        Returns: string;
      };
      join_family: {
        Args: { invite_code_input: string; member_name_input: string };
        Returns: boolean;
      };
      has_family_access: { Args: { fid: string }; Returns: boolean };
      is_family_owner: { Args: { fid: string }; Returns: boolean };
      get_invitation_by_token: {
        Args: { token_input: string };
        Returns: {
          id: string;
          family_id: string;
          family_name: string;
          invitee_name: string;
          role: string;
          email: string;
          status: string;
        }[];
      };
      accept_family_invitation: {
        Args: { token_input: string };
        Returns: boolean;
      };
      set_active_family: {
        Args: { family_id_input: string };
        Returns: boolean;
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
