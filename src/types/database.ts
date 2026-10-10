export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string;
          blocker_id: string;
          created_at: string;
        };
        Insert: {
          blocked_id: string;
          blocker_id: string;
          created_at?: string;
        };
        Update: {
          blocked_id?: string;
          blocker_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocked_id_fkey';
            columns: ['blocked_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'blocks_blocker_id_fkey';
            columns: ['blocker_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
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
      comments: {
        Row: {
          author_id: string;
          body: string | null;
          created_at: string;
          deleted_at: string | null;
          edited_at: string | null;
          id: string;
          parent_id: string | null;
          post_id: string;
        };
        Insert: {
          author_id: string;
          body?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          parent_id?: string | null;
          post_id: string;
        };
        Update: {
          author_id?: string;
          body?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          edited_at?: string | null;
          id?: string;
          parent_id?: string | null;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
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
      follows: {
        Row: {
          created_at: string;
          followee_id: string;
          follower_id: string;
        };
        Insert: {
          created_at?: string;
          followee_id: string;
          follower_id: string;
        };
        Update: {
          created_at?: string;
          followee_id?: string;
          follower_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'follows_followee_id_fkey';
            columns: ['followee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_followee_id_fkey';
            columns: ['followee_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      friendships: {
        Row: {
          addressee_id: string;
          created_at: string;
          id: string;
          requester_id: string;
          responded_at: string | null;
          status: Database['public']['Enums']['friendship_status'];
        };
        Insert: {
          addressee_id: string;
          created_at?: string;
          id?: string;
          requester_id: string;
          responded_at?: string | null;
          status?: Database['public']['Enums']['friendship_status'];
        };
        Update: {
          addressee_id?: string;
          created_at?: string;
          id?: string;
          requester_id?: string;
          responded_at?: string | null;
          status?: Database['public']['Enums']['friendship_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'friendships_addressee_id_fkey';
            columns: ['addressee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_addressee_id_fkey';
            columns: ['addressee_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'friendships_requester_id_fkey';
            columns: ['requester_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      goals: {
        Row: {
          achieved_at: string | null;
          auto_post: boolean;
          created_at: string;
          deadline: string | null;
          id: string;
          start_value: number;
          status: string;
          target: NonNullable<Json>;
          type: string;
          updated_at: string;
          user_id: string;
          goal_observations: Json | null;
          goal_target_value: number | null;
        };
        Insert: {
          achieved_at?: string | null;
          auto_post?: boolean;
          created_at?: string;
          deadline?: string | null;
          id?: string;
          start_value?: number;
          status?: string;
          target: NonNullable<Json>;
          type: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          achieved_at?: string | null;
          auto_post?: boolean;
          created_at?: string;
          deadline?: string | null;
          id?: string;
          start_value?: number;
          status?: string;
          target?: NonNullable<Json>;
          type?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'goals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'goals_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      league_challenges: {
        Row: {
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          kind: Database['public']['Enums']['challenge_kind'];
          league_id: string;
          rank_key: string | null;
          starts_at: string;
          target: number | null;
          title: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: string;
          kind: Database['public']['Enums']['challenge_kind'];
          league_id: string;
          rank_key?: string | null;
          starts_at: string;
          target?: number | null;
          title: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['challenge_kind'];
          league_id?: string;
          rank_key?: string | null;
          starts_at?: string;
          target?: number | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'league_challenges_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'league_challenges_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'league_challenges_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'league_challenges_rank_key_fkey';
            columns: ['rank_key'];
            isOneToOne: false;
            referencedRelation: 'rank_lifts';
            referencedColumns: ['rank_key'];
          },
        ];
      };
      league_members: {
        Row: {
          final_points: number | null;
          final_position: number | null;
          joined_at: string;
          league_id: string;
          outcome: Database['public']['Enums']['league_outcome'] | null;
          result_seen_at: string | null;
          seed_score: number;
          user_id: string;
        };
        Insert: {
          final_points?: number | null;
          final_position?: number | null;
          joined_at?: string;
          league_id: string;
          outcome?: Database['public']['Enums']['league_outcome'] | null;
          result_seen_at?: string | null;
          seed_score?: number;
          user_id: string;
        };
        Update: {
          final_points?: number | null;
          final_position?: number | null;
          joined_at?: string;
          league_id?: string;
          outcome?: Database['public']['Enums']['league_outcome'] | null;
          result_seen_at?: string | null;
          seed_score?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'league_members_league_id_fkey';
            columns: ['league_id'];
            isOneToOne: false;
            referencedRelation: 'leagues';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'league_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'league_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      league_seasons: {
        Row: {
          ends_at: string;
          id: number;
          number: number;
          starts_at: string;
          status: Database['public']['Enums']['league_status'];
        };
        Insert: {
          ends_at: string;
          id?: never;
          number: number;
          starts_at: string;
          status?: Database['public']['Enums']['league_status'];
        };
        Update: {
          ends_at?: string;
          id?: never;
          number?: number;
          starts_at?: string;
          status?: Database['public']['Enums']['league_status'];
        };
        Relationships: [];
      };
      league_standing: {
        Row: {
          division: Database['public']['Enums']['league_division'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          division?: Database['public']['Enums']['league_division'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          division?: Database['public']['Enums']['league_division'];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'league_standing_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'league_standing_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      league_weeks: {
        Row: {
          closed_at: string | null;
          ends_at: string;
          id: number;
          season_id: number;
          starts_at: string;
          status: Database['public']['Enums']['league_status'];
          week_no: number;
        };
        Insert: {
          closed_at?: string | null;
          ends_at: string;
          id?: never;
          season_id: number;
          starts_at: string;
          status?: Database['public']['Enums']['league_status'];
          week_no: number;
        };
        Update: {
          closed_at?: string | null;
          ends_at?: string;
          id?: never;
          season_id?: number;
          starts_at?: string;
          status?: Database['public']['Enums']['league_status'];
          week_no?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'league_weeks_season_id_fkey';
            columns: ['season_id'];
            isOneToOne: false;
            referencedRelation: 'league_seasons';
            referencedColumns: ['id'];
          },
        ];
      };
      leagues: {
        Row: {
          community_id: string | null;
          created_at: string;
          division: Database['public']['Enums']['league_division'] | null;
          ends_at: string;
          group_no: number | null;
          id: string;
          invite_code: string | null;
          kind: Database['public']['Enums']['league_kind'];
          max_members: number;
          name: string;
          owner_id: string | null;
          scoring: Database['public']['Enums']['league_scoring'];
          scoring_rank_key: string | null;
          starts_at: string;
          status: Database['public']['Enums']['league_status'];
          week_id: number | null;
        };
        Insert: {
          community_id?: string | null;
          created_at?: string;
          division?: Database['public']['Enums']['league_division'] | null;
          ends_at: string;
          group_no?: number | null;
          id?: string;
          invite_code?: string | null;
          kind: Database['public']['Enums']['league_kind'];
          max_members?: number;
          name: string;
          owner_id?: string | null;
          scoring?: Database['public']['Enums']['league_scoring'];
          scoring_rank_key?: string | null;
          starts_at: string;
          status?: Database['public']['Enums']['league_status'];
          week_id?: number | null;
        };
        Update: {
          community_id?: string | null;
          created_at?: string;
          division?: Database['public']['Enums']['league_division'] | null;
          ends_at?: string;
          group_no?: number | null;
          id?: string;
          invite_code?: string | null;
          kind?: Database['public']['Enums']['league_kind'];
          max_members?: number;
          name?: string;
          owner_id?: string | null;
          scoring?: Database['public']['Enums']['league_scoring'];
          scoring_rank_key?: string | null;
          starts_at?: string;
          status?: Database['public']['Enums']['league_status'];
          week_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'leagues_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leagues_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'leagues_scoring_rank_key_fkey';
            columns: ['scoring_rank_key'];
            isOneToOne: false;
            referencedRelation: 'rank_lifts';
            referencedColumns: ['rank_key'];
          },
          {
            foreignKeyName: 'leagues_week_id_fkey';
            columns: ['week_id'];
            isOneToOne: false;
            referencedRelation: 'league_weeks';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          actor_id: string;
          comment_id: string | null;
          created_at: string;
          id: string;
          kind: Database['public']['Enums']['notification_kind'];
          post_id: string | null;
          read_at: string | null;
          user_id: string;
        };
        Insert: {
          actor_id: string;
          comment_id?: string | null;
          created_at?: string;
          id?: string;
          kind: Database['public']['Enums']['notification_kind'];
          post_id?: string | null;
          read_at?: string | null;
          user_id: string;
        };
        Update: {
          actor_id?: string;
          comment_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: Database['public']['Enums']['notification_kind'];
          post_id?: string | null;
          read_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
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
            referencedRelation: 'home_working_sets';
            referencedColumns: ['workout_id'];
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
            referencedRelation: 'home_working_sets';
            referencedColumns: ['set_id'];
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
      post_likes: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'post_likes_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'post_likes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
        ];
      };
      posts: {
        Row: {
          author_id: string;
          body: string | null;
          comment_count: number;
          created_at: string;
          data: NonNullable<Json>;
          edited_at: string | null;
          goal_id: string | null;
          id: string;
          like_count: number;
          media: NonNullable<Json>;
          milestone_key: string | null;
          type: Database['public']['Enums']['post_type'];
          visibility: Database['public']['Enums']['profile_visibility'];
          workout_id: string | null;
          workout_summary: Json | null;
        };
        Insert: {
          author_id: string;
          body?: string | null;
          comment_count?: number;
          created_at?: string;
          data?: NonNullable<Json>;
          edited_at?: string | null;
          goal_id?: string | null;
          id?: string;
          like_count?: number;
          media?: NonNullable<Json>;
          milestone_key?: string | null;
          type: Database['public']['Enums']['post_type'];
          visibility?: Database['public']['Enums']['profile_visibility'];
          workout_id?: string | null;
          workout_summary?: Json | null;
        };
        Update: {
          author_id?: string;
          body?: string | null;
          comment_count?: number;
          created_at?: string;
          data?: NonNullable<Json>;
          edited_at?: string | null;
          goal_id?: string | null;
          id?: string;
          like_count?: number;
          media?: NonNullable<Json>;
          milestone_key?: string | null;
          type?: Database['public']['Enums']['post_type'];
          visibility?: Database['public']['Enums']['profile_visibility'];
          workout_id?: string | null;
          workout_summary?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'public_profile_cards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_goal_id_fkey';
            columns: ['goal_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'posts_workout_id_fkey';
            columns: ['workout_id'];
            isOneToOne: false;
            referencedRelation: 'home_working_sets';
            referencedColumns: ['workout_id'];
          },
          {
            foreignKeyName: 'posts_workout_id_fkey';
            columns: ['workout_id'];
            isOneToOne: false;
            referencedRelation: 'workouts';
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
            referencedRelation: 'home_working_sets';
            referencedColumns: ['workout_id'];
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
            referencedRelation: 'home_working_sets';
            referencedColumns: ['set_id'];
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
            referencedRelation: 'home_working_sets';
            referencedColumns: ['set_id'];
          },
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
      reports: {
        Row: {
          comment_id: string | null;
          created_at: string;
          details: string | null;
          id: string;
          post_id: string | null;
          reason: Database['public']['Enums']['report_reason'];
          reporter_id: string;
          status: string;
        };
        Insert: {
          comment_id?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          post_id?: string | null;
          reason: Database['public']['Enums']['report_reason'];
          reporter_id?: string;
          status?: string;
        };
        Update: {
          comment_id?: string | null;
          created_at?: string;
          details?: string | null;
          id?: string;
          post_id?: string | null;
          reason?: Database['public']['Enums']['report_reason'];
          reporter_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_post_id_fkey';
            columns: ['post_id'];
            isOneToOne: false;
            referencedRelation: 'posts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_reporter_id_fkey';
            columns: ['reporter_id'];
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
          source_label: string | null;
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
          source_label?: string | null;
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
          source_label?: string | null;
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
      season_rewards: {
        Row: {
          badge_key: string;
          best_division: Database['public']['Enums']['league_division'];
          frame_key: string | null;
          granted_at: string;
          season_id: number;
          user_id: string;
        };
        Insert: {
          badge_key: string;
          best_division: Database['public']['Enums']['league_division'];
          frame_key?: string | null;
          granted_at?: string;
          season_id: number;
          user_id: string;
        };
        Update: {
          badge_key?: string;
          best_division?: Database['public']['Enums']['league_division'];
          frame_key?: string | null;
          granted_at?: string;
          season_id?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'season_rewards_season_id_fkey';
            columns: ['season_id'];
            isOneToOne: false;
            referencedRelation: 'league_seasons';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'season_rewards_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'season_rewards_user_id_fkey';
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
          milestone_posts: Database['public']['Enums']['milestone_post_mode'];
          notification_prefs: NonNullable<Json>;
          plate_inventory: NonNullable<Json>;
          recovery_speed: string;
          rest_timer_default_sec: number;
          theme: Database['public']['Enums']['theme_mode'];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          bar_weight_kg?: number;
          created_at?: string;
          effort_metric?: Database['public']['Enums']['effort_metric'];
          milestone_posts?: Database['public']['Enums']['milestone_post_mode'];
          notification_prefs?: NonNullable<Json>;
          plate_inventory?: NonNullable<Json>;
          recovery_speed?: string;
          rest_timer_default_sec?: number;
          theme?: Database['public']['Enums']['theme_mode'];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bar_weight_kg?: number;
          created_at?: string;
          effort_metric?: Database['public']['Enums']['effort_metric'];
          milestone_posts?: Database['public']['Enums']['milestone_post_mode'];
          notification_prefs?: NonNullable<Json>;
          plate_inventory?: NonNullable<Json>;
          recovery_speed?: string;
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
            referencedRelation: 'home_working_sets';
            referencedColumns: ['workout_id'];
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
            referencedRelation: 'home_working_sets';
            referencedColumns: ['workout_id'];
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
            referencedRelation: 'home_working_sets';
            referencedColumns: ['workout_id'];
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
      home_working_sets: {
        Row: {
          at: string | null;
          exercise_id: string | null;
          reps: number | null;
          rir: number | null;
          rpe: number | null;
          set_id: string | null;
          started_at: string | null;
          user_id: string | null;
          volume_kg: number | null;
          weight_kg: number | null;
          weight_mode: Database['public']['Enums']['weight_mode'] | null;
          workout_id: string | null;
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
      add_comment: {
        Args: { p_body: string; p_id: string; p_parent?: string; p_post: string };
        Returns: string;
      };
      are_friends: { Args: { a: string; b: string }; Returns: boolean };
      block_user: { Args: { p_user: string }; Returns: undefined };
      can_use_exercise: { Args: { p_exercise_id: string }; Returns: boolean };
      can_view_comment: { Args: { comment: string; viewer: string }; Returns: boolean };
      can_view_post: { Args: { post: string; viewer: string }; Returns: boolean };
      can_view_post_row: {
        Args: {
          author: string;
          viewer: string;
          vis: Database['public']['Enums']['profile_visibility'];
        };
        Returns: boolean;
      };
      can_view_profile: { Args: { owner: string; viewer: string }; Returns: boolean };
      can_view_profile_details: {
        Args: {
          owner: string;
          viewer: string;
          vis: Database['public']['Enums']['profile_visibility'];
        };
        Returns: boolean;
      };
      can_view_workout_photo: { Args: { path: string; viewer: string }; Returns: boolean };
      cancel_friend_request: { Args: { p_id: string }; Returns: undefined };
      create_custom_league: {
        Args: {
          p_name: string;
          p_rank_key?: string;
          p_scoring: Database['public']['Enums']['league_scoring'];
          p_weeks: number;
        };
        Returns: Json;
      };
      create_league_challenge: {
        Args: {
          p_kind: Database['public']['Enums']['challenge_kind'];
          p_league: string;
          p_rank_key?: string;
          p_target?: number;
          p_title: string;
        };
        Returns: string;
      };
      create_milestone_post: {
        Args: {
          p_kind: Database['public']['Enums']['post_type'];
          p_ref: Json;
          p_visibility?: Database['public']['Enums']['profile_visibility'];
        };
        Returns: string;
      };
      create_post: { Args: { p: Json }; Returns: string };
      delete_comment: { Args: { p_id: string }; Returns: undefined };
      edit_comment: { Args: { p_body: string; p_id: string }; Returns: undefined };
      edit_post: {
        Args: {
          p_body: string;
          p_id: string;
          p_keep_media?: string[];
          p_visibility?: Database['public']['Enums']['profile_visibility'];
        };
        Returns: undefined;
      };
      follow_user: { Args: { p_user: string }; Returns: undefined };
      get_discover: {
        Args: { p_as_of?: string; p_exclude?: string[]; p_filters?: string[]; p_limit?: number };
        Returns: Json;
      };
      get_feed: {
        Args: { p_before_at?: string; p_before_id?: string; p_limit?: number };
        Returns: Json;
      };
      get_friend_requests: { Args: Record<PropertyKey, never>; Returns: Json };
      get_friends: { Args: Record<PropertyKey, never>; Returns: Json };
      get_goals: { Args: { p_zone?: string }; Returns: Json };
      get_home_analytics: {
        Args: { p_end: string; p_start: string; p_zone?: string };
        Returns: Json;
      };
      get_league_challenges: { Args: { p_league: string }; Returns: Json };
      get_league_history: { Args: Record<PropertyKey, never>; Returns: Json };
      get_league_home: { Args: Record<PropertyKey, never>; Returns: Json };
      get_league_standings: { Args: { p_league: string }; Returns: Json };
      get_lift_bests: {
        Args: Record<PropertyKey, never>;
        Returns: {
          achieved_at: string;
          bodyweight_kg: number;
          duration_sec: number;
          e1rm: number;
          exercise_name: string;
          log_type: Database['public']['Enums']['exercise_log_type'];
          rank_key: string;
          reps: number;
          weight_kg: number;
        }[];
      };
      get_lift_detail: { Args: { p_rank_key: string }; Returns: Json };
      get_lift_percentile: { Args: { p_rank_key: string }; Returns: Json };
      get_notifications: {
        Args: { p_before_at?: string; p_before_id?: string; p_limit?: number };
        Returns: Json;
      };
      get_people_suggestions: { Args: { p_limit?: number }; Returns: Json };
      get_personal_records: {
        Args: Record<PropertyKey, never>;
        Returns: {
          achieved_at: string;
          exercise_id: string;
          exercise_name: string;
          kind: Database['public']['Enums']['pr_kind'];
          log_type: Database['public']['Enums']['exercise_log_type'];
          previous_value: number;
          rank_key: string;
          set_duration_sec: number;
          set_reps: number;
          set_weight_kg: number;
          set_weight_mode: Database['public']['Enums']['weight_mode'];
          value: number;
          weight_kg: number;
          workout_id: string;
          workout_name: string;
        }[];
      };
      get_post: { Args: { p_id: string }; Returns: Json };
      get_profile: { Args: { p_username: string }; Returns: Json };
      get_rank_events: {
        Args: { p_since: string };
        Returns: {
          at: string;
          from_division: number;
          from_tier: Database['public']['Enums']['rank_tier'];
          key: string;
          kind: Database['public']['Enums']['rank_event_kind'];
          scope: Database['public']['Enums']['rank_scope'];
          score: number;
          to_division: number;
          to_tier: Database['public']['Enums']['rank_tier'];
          workout_id: string;
        }[];
      };
      get_rank_history: {
        Args: {
          p_key: string;
          p_scope: Database['public']['Enums']['rank_scope'];
          p_since: string;
        };
        Returns: Json;
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
      get_season_recap: { Args: { p_season: number }; Returns: Json };
      get_unread_notification_count: { Args: Record<PropertyKey, never>; Returns: number };
      get_user_posts: {
        Args: { p_before_at?: string; p_before_id?: string; p_limit?: number; p_user: string };
        Returns: Json;
      };
      get_workout_rewards: { Args: { p_workout: string }; Returns: Json };
      goal_observations: {
        Args: { g: Database['public']['Tables']['goals']['Row'] };
        Returns: Json;
      };
      goal_target_value: {
        Args: { g: Database['public']['Tables']['goals']['Row'] };
        Returns: number;
      };
      goal_value: {
        Args: { g: Database['public']['Tables']['goals']['Row']; p_now: string; p_zone: string };
        Returns: number;
      };
      is_blocked: { Args: { a: string; b: string }; Returns: boolean };
      is_league_member: { Args: { p_league: string }; Returns: boolean };
      is_reserved_username: { Args: { name: string }; Returns: boolean };
      join_league: { Args: { p_code: string }; Returns: string };
      league_add_challenges: { Args: { p_league: string; p_pick: number }; Returns: undefined };
      league_challenge_value: {
        Args: { c: Database['public']['Tables']['league_challenges']['Row']; p_user: string };
        Returns: number;
      };
      league_close_league: { Args: { p_at: string; p_league: string }; Returns: undefined };
      league_lp: { Args: { p_from: string; p_to: string; p_user: string }; Returns: number };
      league_lp_breakdown: {
        Args: { p_from: string; p_to: string; p_user: string };
        Returns: Json;
      };
      league_member_points: {
        Args: {
          p_league: Database['public']['Tables']['leagues']['Row'];
          p_to: string;
          p_user: string;
        };
        Returns: number;
      };
      league_now: { Args: Record<PropertyKey, never>; Returns: string };
      league_open_week: { Args: { p_now: string }; Returns: number };
      league_place: {
        Args: {
          p_at: string;
          p_user: string;
          p_week: Database['public']['Tables']['league_weeks']['Row'];
        };
        Returns: string;
      };
      league_qualifying_workouts: {
        Args: { p_from: string; p_to: string; p_user: string };
        Returns: {
          ist_day: string;
          plan_day_id: string;
          sets: number;
          started_at: string;
          workout_id: string;
        }[];
      };
      league_ranking: {
        Args: { p_league: string; p_to: string };
        Returns: {
          last_at: string;
          place: number;
          points: number;
          user_id: string;
        }[];
      };
      league_run_cycle: { Args: { p_now?: string }; Returns: Json };
      league_seed_score: { Args: { p_at: string; p_user: string }; Returns: number };
      league_week_start: { Args: { p_at: string }; Returns: string };
      league_zone_size: { Args: { p_members: number }; Returns: number };
      leave_league: { Args: { p_league: string }; Returns: undefined };
      mark_league_result_seen: { Args: { p_league: string }; Returns: undefined };
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number };
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
      recovery_half_life: { Args: { p: Database['public']['Enums']['muscle'] }; Returns: number };
      refresh_workout_totals: { Args: { p_id: string }; Returns: undefined };
      region_of_muscle: {
        Args: { m: Database['public']['Enums']['muscle'] };
        Returns: Database['public']['Enums']['muscle_region'];
      };
      remove_friend: { Args: { p_user: string }; Returns: undefined };
      report_content: {
        Args: {
          p_comment?: string;
          p_details?: string;
          p_post?: string;
          p_reason: Database['public']['Enums']['report_reason'];
        };
        Returns: undefined;
      };
      respond_friend_request: { Args: { p_accept: boolean; p_id: string }; Returns: string };
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
      save_goal: {
        Args: {
          p_archive?: boolean;
          p_auto_post?: boolean;
          p_deadline?: string;
          p_id: string;
          p_target: Json;
          p_type: string;
          p_zone?: string;
        };
        Returns: string;
      };
      save_plan: { Args: { p: Json }; Returns: string };
      save_routine: { Args: { p: Json }; Returns: string };
      save_workout: { Args: { p: Json }; Returns: Json };
      search_profiles: { Args: { p_limit?: number; p_query: string }; Returns: Json };
      send_friend_request: { Args: { p_user: string }; Returns: string };
      set_workout_photo: { Args: { p_id: string; p_path?: string }; Returns: undefined };
      social_build_milestone: {
        Args: { p_kind: Database['public']['Enums']['post_type']; p_ref: Json; p_user: string };
        Returns: Json;
      };
      social_friends_of: { Args: { p_user: string }; Returns: string[] };
      social_insert_milestone: {
        Args: {
          p_built: Json;
          p_kind: Database['public']['Enums']['post_type'];
          p_user: string;
          p_visibility: Database['public']['Enums']['profile_visibility'];
        };
        Returns: string;
      };
      social_mentions: { Args: { p_text: string }; Returns: string[] };
      social_mutual_friends: { Args: { a: string; b: string }; Returns: number };
      social_notify: {
        Args: {
          p_actor: string;
          p_comment?: string;
          p_kind: Database['public']['Enums']['notification_kind'];
          p_post?: string;
          p_user: string;
        };
        Returns: undefined;
      };
      social_notify_mentions: {
        Args: {
          p_actor: string;
          p_comment: string;
          p_post: string;
          p_skip?: string[];
          p_text: string;
        };
        Returns: undefined;
      };
      social_page: { Args: { p_limit: number; p_rows: Json }; Returns: Json };
      social_person_json: { Args: { p_user: string; p_viewer: string }; Returns: Json };
      social_post_json: { Args: { p_post: string; p_viewer: string }; Returns: Json };
      social_require_target: { Args: { p_me: string; p_user: string }; Returns: undefined };
      social_require_user: { Args: Record<PropertyKey, never>; Returns: string };
      social_sync_workout_post: { Args: { p_workout: string }; Returns: undefined };
      social_training_days: { Args: { p_at: string; p_user: string }; Returns: number };
      social_valid_media: {
        Args: { p_media: Json; p_post: string; p_user: string };
        Returns: Json;
      };
      social_workout_summary: { Args: { p_workout: string }; Returns: Json };
      training_streak: { Args: { p_now: string; p_zone: string }; Returns: number };
      try_uuid: { Args: { t: string }; Returns: string };
      unblock_user: { Args: { p_user: string }; Returns: undefined };
      unfollow_user: { Args: { p_user: string }; Returns: undefined };
      username_available: { Args: { name: string }; Returns: boolean };
      valid_goal_target: { Args: { p_type: string; t: Json }; Returns: boolean };
      visibility_rank: {
        Args: { v: Database['public']['Enums']['profile_visibility'] };
        Returns: number;
      };
      workout_snapshot: { Args: { p_id: string }; Returns: Json };
    };
    Enums: {
      challenge_kind: 'most_reps' | 'lift_frequency' | 'workouts';
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
      friendship_status: 'pending' | 'accepted' | 'declined';
      league_division: 'rookie' | 'contender' | 'elite' | 'legend';
      league_kind: 'ranked' | 'custom' | 'community';
      league_outcome: 'promoted' | 'stayed' | 'demoted';
      league_scoring: 'lp' | 'volume' | 'lift_improvement' | 'attendance';
      league_status: 'open' | 'closed';
      milestone_post_mode: 'auto' | 'ask' | 'never';
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
      notification_kind:
        | 'respect'
        | 'comment'
        | 'reply'
        | 'mention'
        | 'friend_request'
        | 'friend_accepted'
        | 'follow';
      plan_day_status: 'pending' | 'done' | 'missed' | 'moved';
      plan_status: 'active' | 'completed' | 'abandoned';
      post_type: 'workout' | 'text' | 'photo' | 'pr' | 'rank_up' | 'goal' | 'league_result';
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
      report_reason:
        | 'spam'
        | 'harassment'
        | 'hate'
        | 'nudity'
        | 'violence'
        | 'self_harm'
        | 'false_info'
        | 'other';
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
      challenge_kind: ['most_reps', 'lift_frequency', 'workouts'],
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
      friendship_status: ['pending', 'accepted', 'declined'],
      league_division: ['rookie', 'contender', 'elite', 'legend'],
      league_kind: ['ranked', 'custom', 'community'],
      league_outcome: ['promoted', 'stayed', 'demoted'],
      league_scoring: ['lp', 'volume', 'lift_improvement', 'attendance'],
      league_status: ['open', 'closed'],
      milestone_post_mode: ['auto', 'ask', 'never'],
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
      notification_kind: [
        'respect',
        'comment',
        'reply',
        'mention',
        'friend_request',
        'friend_accepted',
        'follow',
      ],
      plan_day_status: ['pending', 'done', 'missed', 'moved'],
      plan_status: ['active', 'completed', 'abandoned'],
      post_type: ['workout', 'text', 'photo', 'pr', 'rank_up', 'goal', 'league_result'],
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
      report_reason: [
        'spam',
        'harassment',
        'hate',
        'nudity',
        'violence',
        'self_harm',
        'false_info',
        'other',
      ],
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
