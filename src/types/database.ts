export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      bodyweight_logs: {
        Row: {
          created_at: string;
          id: string;
          logged_at: string;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          logged_at?: string;
          user_id?: string;
          weight_kg: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          logged_at?: string;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'bodyweight_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bodyweight_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      exercise_library_meta: {
        Row: {
          id: boolean;
          updated_at: string;
          version: number;
        };
        Insert: {
          id?: boolean;
          updated_at?: string;
          version?: number;
        };
        Update: {
          id?: boolean;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      exercise_muscles: {
        Row: {
          exercise_id: string;
          muscle: Database['public']['Enums']['muscle'];
          role: Database['public']['Enums']['muscle_role'];
          weight: number;
        };
        Insert: {
          exercise_id: string;
          muscle: Database['public']['Enums']['muscle'];
          role: Database['public']['Enums']['muscle_role'];
          weight: number;
        };
        Update: {
          exercise_id?: string;
          muscle?: Database['public']['Enums']['muscle'];
          role?: Database['public']['Enums']['muscle_role'];
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'exercise_muscles_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
        ];
      };
      exercises: {
        Row: {
          aliases: string[];
          category: Database['public']['Enums']['exercise_category'];
          common_mistakes: string[];
          created_at: string;
          created_by: string | null;
          equipment: Database['public']['Enums']['equipment'];
          id: string;
          instructions: string[];
          is_public: boolean;
          is_rankable: boolean;
          log_type: Database['public']['Enums']['exercise_log_type'];
          mechanic: Database['public']['Enums']['exercise_mechanic'];
          media_url: string | null;
          met_value: number;
          name: string;
          rank_key: string | null;
          slug: string;
          tips: string[];
          unilateral: boolean;
          updated_at: string;
        };
        Insert: {
          aliases?: string[];
          category: Database['public']['Enums']['exercise_category'];
          common_mistakes?: string[];
          created_at?: string;
          created_by?: string | null;
          equipment: Database['public']['Enums']['equipment'];
          id?: string;
          instructions?: string[];
          is_public?: boolean;
          is_rankable?: boolean;
          log_type: Database['public']['Enums']['exercise_log_type'];
          mechanic: Database['public']['Enums']['exercise_mechanic'];
          media_url?: string | null;
          met_value?: number;
          name: string;
          rank_key?: string | null;
          slug: string;
          tips?: string[];
          unilateral?: boolean;
          updated_at?: string;
        };
        Update: {
          aliases?: string[];
          category?: Database['public']['Enums']['exercise_category'];
          common_mistakes?: string[];
          created_at?: string;
          created_by?: string | null;
          equipment?: Database['public']['Enums']['equipment'];
          id?: string;
          instructions?: string[];
          is_public?: boolean;
          is_rankable?: boolean;
          log_type?: Database['public']['Enums']['exercise_log_type'];
          mechanic?: Database['public']['Enums']['exercise_mechanic'];
          media_url?: string | null;
          met_value?: number;
          name?: string;
          rank_key?: string | null;
          slug?: string;
          tips?: string[];
          unilateral?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exercises_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'exercises_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      personal_records: {
        Row: {
          achieved_at: string;
          exercise_id: string;
          id: number;
          kind: Database['public']['Enums']['pr_kind'];
          previous_value: number | null;
          user_id: string;
          value: number;
          weight_kg: number | null;
          workout_id: string;
          workout_set_id: string | null;
        };
        Insert: {
          achieved_at: string;
          exercise_id: string;
          id?: never;
          kind: Database['public']['Enums']['pr_kind'];
          previous_value?: number | null;
          user_id: string;
          value: number;
          weight_kg?: number | null;
          workout_id: string;
          workout_set_id?: string | null;
        };
        Update: {
          achieved_at?: string;
          exercise_id?: string;
          id?: never;
          kind?: Database['public']['Enums']['pr_kind'];
          previous_value?: number | null;
          user_id?: string;
          value?: number;
          weight_kg?: number | null;
          workout_id?: string;
          workout_set_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'personal_records_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'personal_records_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'personal_records_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'personal_records_workout_id_fkey';
            columns: ['workout_id'];
            isOneToOne: false;
            referencedRelation: 'workouts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'personal_records_workout_set_id_fkey';
            columns: ['workout_set_id'];
            isOneToOne: false;
            referencedRelation: 'workout_sets';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_days: {
        Row: {
          created_at: string;
          date: string;
          id: string;
          label: string;
          original_date: string;
          plan_id: string;
          routine_id: string | null;
          status: Database['public']['Enums']['plan_day_status'];
          template_key: string;
          week: number;
        };
        Insert: {
          created_at?: string;
          date: string;
          id?: string;
          label: string;
          original_date: string;
          plan_id: string;
          routine_id?: string | null;
          status?: Database['public']['Enums']['plan_day_status'];
          template_key: string;
          week: number;
        };
        Update: {
          created_at?: string;
          date?: string;
          id?: string;
          label?: string;
          original_date?: string;
          plan_id?: string;
          routine_id?: string | null;
          status?: Database['public']['Enums']['plan_day_status'];
          template_key?: string;
          week?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_days_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_days_routine_id_fkey';
            columns: ['routine_id'];
            isOneToOne: false;
            referencedRelation: 'routines';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_weeks: {
        Row: {
          deload: boolean;
          id: string;
          plan_id: string;
          starts_on: string;
          week: number;
        };
        Insert: {
          deload?: boolean;
          id?: string;
          plan_id: string;
          starts_on: string;
          week: number;
        };
        Update: {
          deload?: boolean;
          id?: string;
          plan_id?: string;
          starts_on?: string;
          week?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'plan_weeks_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plans: {
        Row: {
          created_at: string;
          end_date: string;
          goal: Database['public']['Enums']['primary_goal'];
          id: string;
          name: string;
          paused_at: string | null;
          settings: NonNullable<Json>;
          start_date: string;
          status: Database['public']['Enums']['plan_status'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          end_date: string;
          goal: Database['public']['Enums']['primary_goal'];
          id?: string;
          name: string;
          paused_at?: string | null;
          settings?: NonNullable<Json>;
          start_date: string;
          status?: Database['public']['Enums']['plan_status'];
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          goal?: Database['public']['Enums']['primary_goal'];
          id?: string;
          name?: string;
          paused_at?: string | null;
          settings?: NonNullable<Json>;
          start_date?: string;
          status?: Database['public']['Enums']['plan_status'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'plans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plans_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          birth_year: number | null;
          city: string | null;
          college: string | null;
          country: string;
          created_at: string;
          display_name: string | null;
          experience_level: Database['public']['Enums']['experience_level'] | null;
          height_cm: number | null;
          id: string;
          onboarded_at: string | null;
          primary_goal: Database['public']['Enums']['primary_goal'] | null;
          sex_for_standards: Database['public']['Enums']['sex_for_standards'];
          units: Database['public']['Enums']['weight_unit'];
          updated_at: string;
          username: string | null;
          visibility: Database['public']['Enums']['profile_visibility'];
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          birth_year?: number | null;
          city?: string | null;
          college?: string | null;
          country?: string;
          created_at?: string;
          display_name?: string | null;
          experience_level?: Database['public']['Enums']['experience_level'] | null;
          height_cm?: number | null;
          id: string;
          onboarded_at?: string | null;
          primary_goal?: Database['public']['Enums']['primary_goal'] | null;
          sex_for_standards?: Database['public']['Enums']['sex_for_standards'];
          units?: Database['public']['Enums']['weight_unit'];
          updated_at?: string;
          username?: string | null;
          visibility?: Database['public']['Enums']['profile_visibility'];
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          birth_year?: number | null;
          city?: string | null;
          college?: string | null;
          country?: string;
          created_at?: string;
          display_name?: string | null;
          experience_level?: Database['public']['Enums']['experience_level'] | null;
          height_cm?: number | null;
          id?: string;
          onboarded_at?: string | null;
          primary_goal?: Database['public']['Enums']['primary_goal'] | null;
          sex_for_standards?: Database['public']['Enums']['sex_for_standards'];
          units?: Database['public']['Enums']['weight_unit'];
          updated_at?: string;
          username?: string | null;
          visibility?: Database['public']['Enums']['profile_visibility'];
        };
        Relationships: [];
      };
      rank_events: {
        Row: {
          created_at: string;
          from_division: number | null;
          from_tier: Database['public']['Enums']['rank_tier'] | null;
          id: number;
          key: string;
          kind: Database['public']['Enums']['rank_event_kind'];
          scope: Database['public']['Enums']['rank_scope'];
          score: number;
          to_division: number | null;
          to_tier: Database['public']['Enums']['rank_tier'];
          user_id: string;
          workout_id: string | null;
        };
        Insert: {
          created_at?: string;
          from_division?: number | null;
          from_tier?: Database['public']['Enums']['rank_tier'] | null;
          id?: never;
          key: string;
          kind: Database['public']['Enums']['rank_event_kind'];
          scope: Database['public']['Enums']['rank_scope'];
          score: number;
          to_division?: number | null;
          to_tier: Database['public']['Enums']['rank_tier'];
          user_id: string;
          workout_id?: string | null;
        };
        Update: {
          created_at?: string;
          from_division?: number | null;
          from_tier?: Database['public']['Enums']['rank_tier'] | null;
          id?: never;
          key?: string;
          kind?: Database['public']['Enums']['rank_event_kind'];
          scope?: Database['public']['Enums']['rank_scope'];
          score?: number;
          to_division?: number | null;
          to_tier?: Database['public']['Enums']['rank_tier'];
          user_id?: string;
          workout_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rank_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rank_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rank_events_workout_id_fkey';
            columns: ['workout_id'];
            isOneToOne: false;
            referencedRelation: 'workouts';
            referencedColumns: ['id'];
          },
        ];
      };
      rank_flags: {
        Row: {
          created_at: string;
          reason: Database['public']['Enums']['rank_flag_reason'];
          status: Database['public']['Enums']['rank_flag_status'];
          user_id: string;
          workout_set_id: string;
        };
        Insert: {
          created_at?: string;
          reason: Database['public']['Enums']['rank_flag_reason'];
          status?: Database['public']['Enums']['rank_flag_status'];
          user_id: string;
          workout_set_id: string;
        };
        Update: {
          created_at?: string;
          reason?: Database['public']['Enums']['rank_flag_reason'];
          status?: Database['public']['Enums']['rank_flag_status'];
          user_id?: string;
          workout_set_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rank_flags_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rank_flags_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rank_flags_workout_set_id_fkey';
            columns: ['workout_set_id'];
            isOneToOne: true;
            referencedRelation: 'workout_sets';
            referencedColumns: ['id'];
          },
        ];
      };
      rank_jobs: {
        Row: {
          queued_at: string;
          reason: string;
          user_id: string;
        };
        Insert: {
          queued_at?: string;
          reason: string;
          user_id: string;
        };
        Update: {
          queued_at?: string;
          reason?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      rank_lifts: {
        Row: {
          discipline: Database['public']['Enums']['rank_discipline'];
          max_hold_sec: number | null;
          max_ratio: number | null;
          max_reps: number | null;
          name: string;
          rank_key: string;
        };
        Insert: {
          discipline: Database['public']['Enums']['rank_discipline'];
          max_hold_sec?: number | null;
          max_ratio?: number | null;
          max_reps?: number | null;
          name: string;
          rank_key: string;
        };
        Update: {
          discipline?: Database['public']['Enums']['rank_discipline'];
          max_hold_sec?: number | null;
          max_ratio?: number | null;
          max_reps?: number | null;
          name?: string;
          rank_key?: string;
        };
        Relationships: [];
      };
      rank_region_weights: {
        Row: {
          region: Database['public']['Enums']['muscle_region'];
          weight: number;
        };
        Insert: {
          region: Database['public']['Enums']['muscle_region'];
          weight: number;
        };
        Update: {
          region?: Database['public']['Enums']['muscle_region'];
          weight?: number;
        };
        Relationships: [];
      };
      rank_settings: {
        Row: {
          active_standards_version: number;
          bw_window_days: number;
          discipline_min_lifts: number;
          id: boolean;
          inactive_days: number;
          max_score: number;
          placement_lifts: number;
          placement_regions: number;
          updated_at: string;
          window_days: number;
        };
        Insert: {
          active_standards_version?: number;
          bw_window_days?: number;
          discipline_min_lifts?: number;
          id?: boolean;
          inactive_days?: number;
          max_score?: number;
          placement_lifts?: number;
          placement_regions?: number;
          updated_at?: string;
          window_days?: number;
        };
        Update: {
          active_standards_version?: number;
          bw_window_days?: number;
          discipline_min_lifts?: number;
          id?: boolean;
          inactive_days?: number;
          max_score?: number;
          placement_lifts?: number;
          placement_regions?: number;
          updated_at?: string;
          window_days?: number;
        };
        Relationships: [];
      };
      rank_snapshots: {
        Row: {
          division: number | null;
          id: number;
          key: string;
          scope: Database['public']['Enums']['rank_scope'];
          score: number;
          standards_version: number;
          taken_at: string;
          tier: Database['public']['Enums']['rank_tier'];
          user_id: string;
        };
        Insert: {
          division?: number | null;
          id?: never;
          key: string;
          scope: Database['public']['Enums']['rank_scope'];
          score: number;
          standards_version: number;
          taken_at?: string;
          tier: Database['public']['Enums']['rank_tier'];
          user_id: string;
        };
        Update: {
          division?: number | null;
          id?: never;
          key?: string;
          scope?: Database['public']['Enums']['rank_scope'];
          score?: number;
          standards_version?: number;
          taken_at?: string;
          tier?: Database['public']['Enums']['rank_tier'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rank_snapshots_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rank_snapshots_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      rank_thresholds: {
        Row: {
          division: number | null;
          min_score: number;
          tier: Database['public']['Enums']['rank_tier'];
          version: number;
        };
        Insert: {
          division?: number | null;
          min_score: number;
          tier: Database['public']['Enums']['rank_tier'];
          version: number;
        };
        Update: {
          division?: number | null;
          min_score?: number;
          tier?: Database['public']['Enums']['rank_tier'];
          version?: number;
        };
        Relationships: [];
      };
      rank_variants: {
        Row: {
          rank_key: string;
          slug: string;
        };
        Insert: {
          rank_key: string;
          slug: string;
        };
        Update: {
          rank_key?: string;
          slug?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rank_variants_rank_key_fkey';
            columns: ['rank_key'];
            isOneToOne: false;
            referencedRelation: 'rank_lifts';
            referencedColumns: ['rank_key'];
          },
        ];
      };
      ranks_current: {
        Row: {
          best_set_id: string | null;
          details: Json | null;
          division: number | null;
          key: string;
          last_set_at: string | null;
          scope: Database['public']['Enums']['rank_scope'];
          score: number | null;
          standards_version: number;
          status: Database['public']['Enums']['rank_status'];
          tier: Database['public']['Enums']['rank_tier'] | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          best_set_id?: string | null;
          details?: Json | null;
          division?: number | null;
          key: string;
          last_set_at?: string | null;
          scope: Database['public']['Enums']['rank_scope'];
          score?: number | null;
          standards_version: number;
          status: Database['public']['Enums']['rank_status'];
          tier?: Database['public']['Enums']['rank_tier'] | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          best_set_id?: string | null;
          details?: Json | null;
          division?: number | null;
          key?: string;
          last_set_at?: string | null;
          scope?: Database['public']['Enums']['rank_scope'];
          score?: number | null;
          standards_version?: number;
          status?: Database['public']['Enums']['rank_status'];
          tier?: Database['public']['Enums']['rank_tier'] | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ranks_current_best_set_id_fkey';
            columns: ['best_set_id'];
            isOneToOne: false;
            referencedRelation: 'workout_sets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ranks_current_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ranks_current_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      routine_exercises: {
        Row: {
          created_at: string;
          exercise_id: string;
          id: string;
          notes: string | null;
          progression_rule: Json | null;
          rest_after_superset_seconds: number | null;
          rest_seconds: number;
          routine_id: string;
          sort_order: number;
          superset_group: number | null;
        };
        Insert: {
          created_at?: string;
          exercise_id: string;
          id?: string;
          notes?: string | null;
          progression_rule?: Json | null;
          rest_after_superset_seconds?: number | null;
          rest_seconds?: number;
          routine_id: string;
          sort_order?: number;
          superset_group?: number | null;
        };
        Update: {
          created_at?: string;
          exercise_id?: string;
          id?: string;
          notes?: string | null;
          progression_rule?: Json | null;
          rest_after_superset_seconds?: number | null;
          rest_seconds?: number;
          routine_id?: string;
          sort_order?: number;
          superset_group?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'routine_exercises_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routine_exercises_routine_id_fkey';
            columns: ['routine_id'];
            isOneToOne: false;
            referencedRelation: 'routines';
            referencedColumns: ['id'];
          },
        ];
      };
      routine_folders: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'routine_folders_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routine_folders_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      routine_sets: {
        Row: {
          created_at: string;
          distance_m: number | null;
          duration_sec: number | null;
          id: string;
          reps: number | null;
          reps_max: number | null;
          reps_min: number | null;
          rir: number | null;
          routine_exercise_id: string;
          rpe: number | null;
          set_type: Database['public']['Enums']['set_type'];
          sort_order: number;
          target_type: Database['public']['Enums']['target_type'];
          tempo: string | null;
          weight_kg: number | null;
          weight_mode: Database['public']['Enums']['weight_mode'];
          weight_percent: number | null;
        };
        Insert: {
          created_at?: string;
          distance_m?: number | null;
          duration_sec?: number | null;
          id?: string;
          reps?: number | null;
          reps_max?: number | null;
          reps_min?: number | null;
          rir?: number | null;
          routine_exercise_id: string;
          rpe?: number | null;
          set_type?: Database['public']['Enums']['set_type'];
          sort_order?: number;
          target_type?: Database['public']['Enums']['target_type'];
          tempo?: string | null;
          weight_kg?: number | null;
          weight_mode?: Database['public']['Enums']['weight_mode'];
          weight_percent?: number | null;
        };
        Update: {
          created_at?: string;
          distance_m?: number | null;
          duration_sec?: number | null;
          id?: string;
          reps?: number | null;
          reps_max?: number | null;
          reps_min?: number | null;
          rir?: number | null;
          routine_exercise_id?: string;
          rpe?: number | null;
          set_type?: Database['public']['Enums']['set_type'];
          sort_order?: number;
          target_type?: Database['public']['Enums']['target_type'];
          tempo?: string | null;
          weight_kg?: number | null;
          weight_mode?: Database['public']['Enums']['weight_mode'];
          weight_percent?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'routine_sets_routine_exercise_id_fkey';
            columns: ['routine_exercise_id'];
            isOneToOne: false;
            referencedRelation: 'routine_exercises';
            referencedColumns: ['id'];
          },
        ];
      };
      routines: {
        Row: {
          archived: boolean;
          colour: string | null;
          created_at: string;
          description: string | null;
          estimated_duration_min: number;
          folder_id: string | null;
          id: string;
          name: string;
          sort_order: number;
          source: Database['public']['Enums']['routine_source'];
          source_ref: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          archived?: boolean;
          colour?: string | null;
          created_at?: string;
          description?: string | null;
          estimated_duration_min?: number;
          folder_id?: string | null;
          id?: string;
          name: string;
          sort_order?: number;
          source?: Database['public']['Enums']['routine_source'];
          source_ref?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          archived?: boolean;
          colour?: string | null;
          created_at?: string;
          description?: string | null;
          estimated_duration_min?: number;
          folder_id?: string | null;
          id?: string;
          name?: string;
          sort_order?: number;
          source?: Database['public']['Enums']['routine_source'];
          source_ref?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'routines_folder_same_owner';
            columns: ['folder_id', 'user_id'];
            isOneToOne: false;
            referencedRelation: 'routine_folders';
            referencedColumns: ['id', 'user_id'];
          },
          {
            foreignKeyName: 'routines_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'routines_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      strength_age_brackets: {
        Row: {
          factor: number;
          max_age: number | null;
          min_age: number;
        };
        Insert: {
          factor: number;
          max_age?: number | null;
          min_age: number;
        };
        Update: {
          factor?: number;
          max_age?: number | null;
          min_age?: number;
        };
        Relationships: [];
      };
      strength_standards: {
        Row: {
          anchor_scores: number[];
          anchor_values: number[];
          bw_max: number;
          bw_min: number;
          id: number;
          max_score: number;
          metric: Database['public']['Enums']['standard_metric'];
          rank_key: string;
          sex: Database['public']['Enums']['sex_for_standards'];
          variant: string;
          version: number;
        };
        Insert: {
          anchor_scores: number[];
          anchor_values: number[];
          bw_max: number;
          bw_min: number;
          id?: never;
          max_score?: number;
          metric: Database['public']['Enums']['standard_metric'];
          rank_key: string;
          sex: Database['public']['Enums']['sex_for_standards'];
          variant?: string;
          version: number;
        };
        Update: {
          anchor_scores?: number[];
          anchor_values?: number[];
          bw_max?: number;
          bw_min?: number;
          id?: never;
          max_score?: number;
          metric?: Database['public']['Enums']['standard_metric'];
          rank_key?: string;
          sex?: Database['public']['Enums']['sex_for_standards'];
          variant?: string;
          version?: number;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          bar_weight_kg: number;
          created_at: string;
          effort_metric: Database['public']['Enums']['effort_metric'];
          notification_prefs: NonNullable<Json>;
          plate_inventory: NonNullable<Json>;
          rest_timer_default_sec: number;
          theme: Database['public']['Enums']['theme_mode'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          bar_weight_kg?: number;
          created_at?: string;
          effort_metric?: Database['public']['Enums']['effort_metric'];
          notification_prefs?: NonNullable<Json>;
          plate_inventory?: NonNullable<Json>;
          rest_timer_default_sec?: number;
          theme?: Database['public']['Enums']['theme_mode'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bar_weight_kg?: number;
          created_at?: string;
          effort_metric?: Database['public']['Enums']['effort_metric'];
          notification_prefs?: NonNullable<Json>;
          plate_inventory?: NonNullable<Json>;
          rest_timer_default_sec?: number;
          theme?: Database['public']['Enums']['theme_mode'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_settings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_exercises: {
        Row: {
          exercise_id: string;
          id: string;
          notes: string | null;
          rest_after_superset_seconds: number | null;
          rest_seconds: number;
          sort_order: number;
          superset_group: number | null;
          workout_id: string;
        };
        Insert: {
          exercise_id: string;
          id: string;
          notes?: string | null;
          rest_after_superset_seconds?: number | null;
          rest_seconds?: number;
          sort_order?: number;
          superset_group?: number | null;
          workout_id: string;
        };
        Update: {
          exercise_id?: string;
          id?: string;
          notes?: string | null;
          rest_after_superset_seconds?: number | null;
          rest_seconds?: number;
          sort_order?: number;
          superset_group?: number | null;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_exercises_exercise_id_fkey';
            columns: ['exercise_id'];
            isOneToOne: false;
            referencedRelation: 'exercises';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_exercises_workout_id_fkey';
            columns: ['workout_id'];
            isOneToOne: false;
            referencedRelation: 'workouts';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_revisions: {
        Row: {
          created_at: string;
          id: string;
          revision: number;
          snapshot: NonNullable<Json>;
          user_id: string;
          workout_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          revision: number;
          snapshot: NonNullable<Json>;
          user_id: string;
          workout_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          revision?: number;
          snapshot?: NonNullable<Json>;
          user_id?: string;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_revisions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_revisions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_revisions_workout_id_fkey';
            columns: ['workout_id'];
            isOneToOne: false;
            referencedRelation: 'workouts';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_rewards: {
        Row: {
          rewards: NonNullable<Json>;
          updated_at: string;
          user_id: string;
          workout_id: string;
        };
        Insert: {
          rewards: NonNullable<Json>;
          updated_at?: string;
          user_id: string;
          workout_id: string;
        };
        Update: {
          rewards?: NonNullable<Json>;
          updated_at?: string;
          user_id?: string;
          workout_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_rewards_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_rewards_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workout_rewards_workout_id_fkey';
            columns: ['workout_id'];
            isOneToOne: true;
            referencedRelation: 'workouts';
            referencedColumns: ['id'];
          },
        ];
      };
      workout_sets: {
        Row: {
          completed: boolean;
          completed_at: string | null;
          distance_m: number | null;
          duration_sec: number | null;
          failed: boolean;
          id: string;
          is_pr: boolean;
          reps: number | null;
          rir: number | null;
          rpe: number | null;
          set_type: Database['public']['Enums']['set_type'];
          sort_order: number;
          target_distance_m: number | null;
          target_duration_sec: number | null;
          target_reps: number | null;
          target_reps_max: number | null;
          target_reps_min: number | null;
          target_rir: number | null;
          target_rpe: number | null;
          target_type: Database['public']['Enums']['target_type'] | null;
          target_weight_kg: number | null;
          tempo: string | null;
          weight_kg: number | null;
          weight_mode: Database['public']['Enums']['weight_mode'];
          workout_exercise_id: string;
        };
        Insert: {
          completed?: boolean;
          completed_at?: string | null;
          distance_m?: number | null;
          duration_sec?: number | null;
          failed?: boolean;
          id: string;
          is_pr?: boolean;
          reps?: number | null;
          rir?: number | null;
          rpe?: number | null;
          set_type?: Database['public']['Enums']['set_type'];
          sort_order?: number;
          target_distance_m?: number | null;
          target_duration_sec?: number | null;
          target_reps?: number | null;
          target_reps_max?: number | null;
          target_reps_min?: number | null;
          target_rir?: number | null;
          target_rpe?: number | null;
          target_type?: Database['public']['Enums']['target_type'] | null;
          target_weight_kg?: number | null;
          tempo?: string | null;
          weight_kg?: number | null;
          weight_mode?: Database['public']['Enums']['weight_mode'];
          workout_exercise_id: string;
        };
        Update: {
          completed?: boolean;
          completed_at?: string | null;
          distance_m?: number | null;
          duration_sec?: number | null;
          failed?: boolean;
          id?: string;
          is_pr?: boolean;
          reps?: number | null;
          rir?: number | null;
          rpe?: number | null;
          set_type?: Database['public']['Enums']['set_type'];
          sort_order?: number;
          target_distance_m?: number | null;
          target_duration_sec?: number | null;
          target_reps?: number | null;
          target_reps_max?: number | null;
          target_reps_min?: number | null;
          target_rir?: number | null;
          target_rpe?: number | null;
          target_type?: Database['public']['Enums']['target_type'] | null;
          target_weight_kg?: number | null;
          tempo?: string | null;
          weight_kg?: number | null;
          weight_mode?: Database['public']['Enums']['weight_mode'];
          workout_exercise_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workout_sets_workout_exercise_id_fkey';
            columns: ['workout_exercise_id'];
            isOneToOne: false;
            referencedRelation: 'workout_exercises';
            referencedColumns: ['id'];
          },
        ];
      };
      workouts: {
        Row: {
          bodyweight_kg: number | null;
          calories_est: number | null;
          client_updated_at: string;
          created_at: string;
          duration_sec: number | null;
          ended_at: string | null;
          id: string;
          name: string;
          notes: string | null;
          perceived_effort: number | null;
          photo_path: string | null;
          plan_day_id: string | null;
          revision: number;
          routine_id: string | null;
          started_at: string;
          status: Database['public']['Enums']['workout_status'];
          total_volume_kg: number;
          updated_at: string;
          user_id: string;
          visibility: Database['public']['Enums']['profile_visibility'];
        };
        Insert: {
          bodyweight_kg?: number | null;
          calories_est?: number | null;
          client_updated_at: string;
          created_at?: string;
          duration_sec?: number | null;
          ended_at?: string | null;
          id: string;
          name: string;
          notes?: string | null;
          perceived_effort?: number | null;
          photo_path?: string | null;
          plan_day_id?: string | null;
          revision?: number;
          routine_id?: string | null;
          started_at: string;
          status?: Database['public']['Enums']['workout_status'];
          total_volume_kg?: number;
          updated_at?: string;
          user_id: string;
          visibility?: Database['public']['Enums']['profile_visibility'];
        };
        Update: {
          bodyweight_kg?: number | null;
          calories_est?: number | null;
          client_updated_at?: string;
          created_at?: string;
          duration_sec?: number | null;
          ended_at?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          perceived_effort?: number | null;
          photo_path?: string | null;
          plan_day_id?: string | null;
          revision?: number;
          routine_id?: string | null;
          started_at?: string;
          status?: Database['public']['Enums']['workout_status'];
          total_volume_kg?: number;
          updated_at?: string;
          user_id?: string;
          visibility?: Database['public']['Enums']['profile_visibility'];
        };
        Relationships: [
          {
            foreignKeyName: 'workouts_routine_id_fkey';
            columns: ['routine_id'];
            isOneToOne: false;
            referencedRelation: 'routines';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workouts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'workouts_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      public_profile_cards: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          college: string | null;
          country: string | null;
          display_name: string | null;
          id: string | null;
          username: string | null;
          visibility: Database['public']['Enums']['profile_visibility'] | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      are_friends: { Args: { a: string; b: string }; Returns: boolean };
      can_use_exercise: { Args: { p_exercise_id: string }; Returns: boolean };
      can_view_profile_details: {
        Args: {
          owner: string;
          viewer: string;
          vis: Database['public']['Enums']['profile_visibility'];
        };
        Returns: boolean;
      };
      get_rank_predictions: { Args: Record<PropertyKey, never>; Returns: Json };
      get_ranks: {
        Args: Record<PropertyKey, never>;
        Returns: {
          details: Json;
          division: number;
          inactive: boolean;
          key: string;
          last_set_at: string;
          scope: Database['public']['Enums']['rank_scope'];
          score: number;
          status: Database['public']['Enums']['rank_status'];
          tier: Database['public']['Enums']['rank_tier'];
        }[];
      };
      get_workout_rewards: { Args: { p_workout: string }; Returns: Json };
      is_reserved_username: { Args: { name: string }; Returns: boolean };
      owns_plan: { Args: { p_plan_id: string }; Returns: boolean };
      owns_routine: { Args: { p_routine_id: string }; Returns: boolean };
      owns_routine_exercise: { Args: { p_routine_exercise_id: string }; Returns: boolean };
      owns_workout: { Args: { p_workout_id: string }; Returns: boolean };
      process_rank_jobs: { Args: { p_max?: number }; Returns: number };
      rank_age_factor: { Args: { p_birth_year: number }; Returns: number };
      rank_e1rm: { Args: { p_load: number; p_reps: number }; Returns: number };
      rank_enqueue: { Args: { p_reason: string; p_user: string }; Returns: undefined };
      rank_flag_reason: {
        Args: {
          p_bw: number;
          p_duration: number;
          p_log_type: Database['public']['Enums']['exercise_log_type'];
          p_max_hold: number;
          p_max_ratio: number;
          p_max_reps: number;
          p_reps: number;
          p_weight: number;
          p_weight_mode: Database['public']['Enums']['weight_mode'];
        };
        Returns: Database['public']['Enums']['rank_flag_reason'];
      };
      rank_interp: { Args: { p_x: number; p_xs: number[]; p_ys: number[] }; Returns: number };
      rank_metric_score: {
        Args: {
          p_cap: number;
          p_max_score: number;
          p_scores: number[];
          p_vals: number[];
          p_value: number;
        };
        Returns: number;
      };
      rank_ordinal: {
        Args: { p_division: number; p_tier: Database['public']['Enums']['rank_tier'] };
        Returns: number;
      };
      rank_recompute_user: { Args: { p_user: string; p_workout?: string }; Returns: Json };
      rank_rep_factor: { Args: { p_reps: number }; Returns: number };
      rank_set_score: {
        Args: {
          p_age_factor: number;
          p_bw: number;
          p_cap: number;
          p_duration: number;
          p_key: string;
          p_log_type: Database['public']['Enums']['exercise_log_type'];
          p_reps: number;
          p_sex: Database['public']['Enums']['sex_for_standards'];
          p_variant: string;
          p_version: number;
          p_weight: number;
          p_weight_mode: Database['public']['Enums']['weight_mode'];
        };
        Returns: Record<string, unknown>;
      };
      rank_standard_at: {
        Args: {
          p_bw: number;
          p_key: string;
          p_metric: Database['public']['Enums']['standard_metric'];
          p_sex: Database['public']['Enums']['sex_for_standards'];
          p_variant: string;
          p_version: number;
        };
        Returns: Record<string, unknown>;
      };
      rank_tier_for: {
        Args: { p_score: number; p_version: number };
        Returns: Record<string, unknown>;
      };
      refresh_workout_totals: { Args: { p_id: string }; Returns: undefined };
      region_of_muscle: {
        Args: { m: Database['public']['Enums']['muscle'] };
        Returns: Database['public']['Enums']['muscle_region'];
      };
      save_custom_exercise: {
        Args: {
          p_equipment: Database['public']['Enums']['equipment'];
          p_id: string;
          p_log_type: Database['public']['Enums']['exercise_log_type'];
          p_name: string;
          p_primary: Database['public']['Enums']['muscle'][];
          p_secondary?: Database['public']['Enums']['muscle'][];
        };
        Returns: string;
      };
      save_plan: { Args: { p: Json }; Returns: string };
      save_routine: { Args: { p: Json }; Returns: string };
      save_workout: { Args: { p: Json }; Returns: Json };
      set_workout_photo: { Args: { p_id: string; p_path?: string }; Returns: undefined };
      username_available: { Args: { name: string }; Returns: boolean };
      workout_snapshot: { Args: { p_id: string }; Returns: Json };
    };
    Enums: {
      effort_metric: 'rir' | 'rpe' | 'both';
      equipment:
        | 'barbell'
        | 'dumbbell'
        | 'machine'
        | 'cable'
        | 'bodyweight'
        | 'kettlebell'
        | 'band'
        | 'smith'
        | 'other';
      exercise_category: 'strength' | 'calisthenics' | 'cardio' | 'mobility';
      exercise_log_type:
        | 'weight_reps'
        | 'bodyweight_reps'
        | 'weighted_bodyweight'
        | 'assisted_bodyweight'
        | 'duration'
        | 'distance_duration';
      exercise_mechanic: 'compound' | 'isolation';
      experience_level: 'beginner' | 'intermediate' | 'advanced';
      muscle:
        | 'upper_chest'
        | 'mid_lower_chest'
        | 'front_delts'
        | 'side_delts'
        | 'rear_delts'
        | 'biceps'
        | 'triceps'
        | 'forearms'
        | 'lats'
        | 'upper_back'
        | 'traps'
        | 'lower_back'
        | 'abs'
        | 'obliques'
        | 'quads'
        | 'hamstrings'
        | 'glutes'
        | 'adductors'
        | 'abductors'
        | 'calves'
        | 'neck';
      muscle_region: 'chest' | 'shoulders' | 'arms' | 'back' | 'core' | 'legs';
      muscle_role: 'primary' | 'secondary' | 'stabiliser';
      plan_day_status: 'pending' | 'done' | 'missed' | 'moved';
      plan_status: 'active' | 'completed' | 'abandoned';
      pr_kind: 'e1rm' | 'weight' | 'reps_at_weight' | 'set_volume' | 'session_volume' | 'hold';
      primary_goal:
        'stronger' | 'muscle' | 'fat' | 'gain' | 'toned' | 'curvier' | 'calisthenics' | 'general';
      profile_visibility: 'public' | 'friends' | 'private';
      rank_discipline: 'weightlifting' | 'calisthenics';
      rank_event_kind: 'placed' | 'rank_up' | 'rank_down';
      rank_flag_reason: 'reps_over_limit' | 'e1rm_over_limit' | 'hold_over_limit';
      rank_flag_status: 'pending' | 'approved' | 'rejected';
      rank_scope: 'lift' | 'muscle' | 'region' | 'overall' | 'weightlifting' | 'calisthenics';
      rank_status: 'ranked' | 'placement';
      rank_tier:
        'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'champion';
      routine_source: 'manual' | 'plan' | 'copied' | 'generated';
      set_type: 'warmup' | 'working' | 'top' | 'backoff' | 'drop' | 'failure' | 'amrap';
      sex_for_standards: 'male' | 'female' | 'unspecified';
      standard_metric: 'e1rm_ratio' | 'reps' | 'hold_seconds';
      target_type: 'reps' | 'rep_range' | 'duration' | 'distance';
      theme_mode: 'dark' | 'light' | 'system';
      weight_mode: 'absolute' | 'percent_of_1rm' | 'percent_of_top_set' | 'bodyweight' | 'assisted';
      weight_unit: 'kg' | 'lb';
      workout_status: 'in_progress' | 'completed' | 'discarded';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      effort_metric: ['rir', 'rpe', 'both'],
      equipment: [
        'barbell',
        'dumbbell',
        'machine',
        'cable',
        'bodyweight',
        'kettlebell',
        'band',
        'smith',
        'other',
      ],
      exercise_category: ['strength', 'calisthenics', 'cardio', 'mobility'],
      exercise_log_type: [
        'weight_reps',
        'bodyweight_reps',
        'weighted_bodyweight',
        'assisted_bodyweight',
        'duration',
        'distance_duration',
      ],
      exercise_mechanic: ['compound', 'isolation'],
      experience_level: ['beginner', 'intermediate', 'advanced'],
      muscle: [
        'upper_chest',
        'mid_lower_chest',
        'front_delts',
        'side_delts',
        'rear_delts',
        'biceps',
        'triceps',
        'forearms',
        'lats',
        'upper_back',
        'traps',
        'lower_back',
        'abs',
        'obliques',
        'quads',
        'hamstrings',
        'glutes',
        'adductors',
        'abductors',
        'calves',
        'neck',
      ],
      muscle_region: ['chest', 'shoulders', 'arms', 'back', 'core', 'legs'],
      muscle_role: ['primary', 'secondary', 'stabiliser'],
      plan_day_status: ['pending', 'done', 'missed', 'moved'],
      plan_status: ['active', 'completed', 'abandoned'],
      pr_kind: ['e1rm', 'weight', 'reps_at_weight', 'set_volume', 'session_volume', 'hold'],
      primary_goal: [
        'stronger',
        'muscle',
        'fat',
        'gain',
        'toned',
        'curvier',
        'calisthenics',
        'general',
      ],
      profile_visibility: ['public', 'friends', 'private'],
      rank_discipline: ['weightlifting', 'calisthenics'],
      rank_event_kind: ['placed', 'rank_up', 'rank_down'],
      rank_flag_reason: ['reps_over_limit', 'e1rm_over_limit', 'hold_over_limit'],
      rank_flag_status: ['pending', 'approved', 'rejected'],
      rank_scope: ['lift', 'muscle', 'region', 'overall', 'weightlifting', 'calisthenics'],
      rank_status: ['ranked', 'placement'],
      rank_tier: ['iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'champion'],
      routine_source: ['manual', 'plan', 'copied', 'generated'],
      set_type: ['warmup', 'working', 'top', 'backoff', 'drop', 'failure', 'amrap'],
      sex_for_standards: ['male', 'female', 'unspecified'],
      standard_metric: ['e1rm_ratio', 'reps', 'hold_seconds'],
      target_type: ['reps', 'rep_range', 'duration', 'distance'],
      theme_mode: ['dark', 'light', 'system'],
      weight_mode: ['absolute', 'percent_of_1rm', 'percent_of_top_set', 'bodyweight', 'assisted'],
      weight_unit: ['kg', 'lb'],
      workout_status: ['in_progress', 'completed', 'discarded'],
    },
  },
} as const;
