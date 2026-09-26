export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      calendar_events: {
        Row: {
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
      families: {
        Row: { id: string; join_code: string; name: string; owner_id: string | null; tagline: string };
        Insert: { id: string; join_code?: string; name: string; owner_id?: string | null; tagline?: string };
        Update: { id?: string; join_code?: string; name?: string; owner_id?: string | null; tagline?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          family_id: string | null;
          id: string;
          member_id: string | null;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          family_id?: string | null;
          id: string;
          member_id?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          family_id?: string | null;
          id?: string;
          member_id?: string | null;
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
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
