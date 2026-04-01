/**
 * Supabase Database Type Definitions
 * Auto-generated schema types for 10xUnicorn
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          display_name: string | null;
          emoji: string | null;
          phone: string | null;
          linkedin_url: string | null;
          avatar_url: string | null;
          bio: string | null;
          company: string | null;
          title: string | null;
          website: string | null;
          twitter_url: string | null;
          instagram_url: string | null;
          youtube_url: string | null;
          tiktok_url: string | null;
          timezone: string | null;
          services_offered: string[] | null;
          industries: string[] | null;
          needs: string[] | null;
          onboarding_completed: boolean;
          daily_compound_target: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; email: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          target_date: string | null;
          target_number: number | null;
          progress: number;
          status: 'active' | 'completed' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['goals']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['goals']['Row']>;
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          title: string | null;
          website: string | null;
          linkedin_url: string | null;
          twitter_url: string | null;
          instagram_url: string | null;
          youtube_url: string | null;
          tiktok_url: string | null;
          type: ContactType;
          is_wormhole: boolean;
          connection_level: number;
          engagement_tags: string[] | null;
          reciprocity_notes: string | null;
          details: string | null;
          location: string | null;
          leverage_potential: string[] | null;
          best_contact_method: string | null;
          activation_next_step: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contacts']['Row'], 'id' | 'created_at' | 'updated_at' | 'connection_level'> & { id?: string; connection_level?: number };
        Update: Partial<Database['public']['Tables']['contacts']['Row']>;
      };
      contact_notes: {
        Row: {
          id: string;
          contact_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contact_notes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['contact_notes']['Row']>;
      };
      interactions: {
        Row: {
          id: string;
          contact_id: string;
          user_id: string;
          type: InteractionType;
          description: string | null;
          impact_rating: number | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['interactions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['interactions']['Row']>;
      };
      signals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          details: string | null;
          type: SignalType;
          status: SignalStatus;
          due_date: string | null;
          score: number | null;
          is_public: boolean;
          contact_id: string | null;
          deal_id: string | null;
          duration_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['signals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['signals']['Row']>;
      };
      signal_notes: {
        Row: {
          id: string;
          signal_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['signal_notes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['signal_notes']['Row']>;
      };
      deals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          value: number | null;
          stage: DealStage;
          contact_id: string | null;
          expected_close_date: string | null;
          details: string | null;
          service_needs: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['deals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['deals']['Row']>;
      };
      deal_notes: {
        Row: {
          id: string;
          deal_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['deal_notes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['deal_notes']['Row']>;
      };
      daily_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          status: DayStatus;
          determination_level: number;
          intention: string | null;
          ten_x_action: string | null;
          ten_x_action_completed: boolean;
          compound_count: number;
          wormhole_contact_id: string | null;
          focus_reflection: string | null;
          future_self_journal: string | null;
          future_self_date: string | null;
          future_self_completed: boolean;
          checklist: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['daily_entries']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['daily_entries']['Row']>;
      };
      daily_signals: {
        Row: {
          id: string;
          daily_entry_id: string;
          signal_id: string;
          completed: boolean;
          completed_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['daily_signals']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['daily_signals']['Row']>;
      };
      ai_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_type: string;
          is_complete: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_sessions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ai_sessions']['Row']>;
      };
      ai_messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ai_messages']['Row']>;
      };
      streaks: {
        Row: {
          id: string;
          user_id: string;
          streak_type: StreakType;
          current_count: number;
          longest_count: number;
          last_date: string | null;
        };
        Insert: Omit<Database['public']['Tables']['streaks']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['streaks']['Row']>;
      };
      points: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          reason: string;
          signal_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['points']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['points']['Row']>;
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Enum types
export type ContactType = 'prospect' | 'referral_partner' | 'strategic_partner' | 'client' | 'resource' | 'other';
export type InteractionType = 'text' | 'voice_note' | 'call' | 'email' | 'in_person' | 'introduction' | 'social_media' | 'video_call' | 'gift' | 'referral';
export type SignalType = 'revenue_generating' | '10x_action' | 'marketing' | 'general_business' | 'relational';
export type SignalStatus = 'not_started' | 'in_progress' | 'complete';
export type DealStage = 'lead' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
export type DayStatus = 'not_prepared' | 'ready' | 'stacking_wins' | 'priority_win' | 'ten_x_unicorn_win' | 'course_corrected_win' | 'lesson_win' | 'miss';
export type StreakType = 'win' | 'compound' | 'determination';

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Goal = Database['public']['Tables']['goals']['Row'];
export type Contact = Database['public']['Tables']['contacts']['Row'];
export type ContactNote = Database['public']['Tables']['contact_notes']['Row'];
export type Interaction = Database['public']['Tables']['interactions']['Row'];
export type Signal = Database['public']['Tables']['signals']['Row'];
export type Deal = Database['public']['Tables']['deals']['Row'];
export type DailyEntry = Database['public']['Tables']['daily_entries']['Row'];
export type AiSession = Database['public']['Tables']['ai_sessions']['Row'];
export type AiMessage = Database['public']['Tables']['ai_messages']['Row'];
export type Streak = Database['public']['Tables']['streaks']['Row'];
export type Points = Database['public']['Tables']['points']['Row'];
