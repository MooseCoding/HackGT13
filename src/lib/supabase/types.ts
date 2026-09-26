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
        Row: { id: string; name: string; tagline: string };
        Insert: { id: string; name: string; tagline?: string };
        Update: { id?: string; name?: string; tagline?: string };
        Relationships: [];
      };
      members: {
        Row: {
          age: number;
          clinical_opt_in: boolean;
          color: string;
          easy_mode_default: boolean;
          family_id: string;
          id: string;
          initials: string;
          location: string;
          name: string;
          role: string;
        };
        Insert: {
          age: number;
          clinical_opt_in?: boolean;
          color: string;
          easy_mode_default?: boolean;
          family_id: string;
          id: string;
          initials: string;
          location: string;
          name: string;
          role: string;
        };
        Update: {
          age?: number;
          clinical_opt_in?: boolean;
          color?: string;
          easy_mode_default?: boolean;
          family_id?: string;
          id?: string;
          initials?: string;
          location?: string;
          name?: string;
          role?: string;
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
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
