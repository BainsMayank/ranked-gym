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
      user_settings: {
        Row: {
          bar_weight_kg: number;
          created_at: string;
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
      can_view_profile_details: {
        Args: {
          owner: string;
          viewer: string;
          vis: Database['public']['Enums']['profile_visibility'];
        };
        Returns: boolean;
      };
      is_reserved_username: { Args: { name: string }; Returns: boolean };
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
      username_available: { Args: { name: string }; Returns: boolean };
    };
    Enums: {
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
      primary_goal:
        'stronger' | 'muscle' | 'fat' | 'gain' | 'toned' | 'curvier' | 'calisthenics' | 'general';
      profile_visibility: 'public' | 'friends' | 'private';
      sex_for_standards: 'male' | 'female' | 'unspecified';
      theme_mode: 'dark' | 'light' | 'system';
      weight_unit: 'kg' | 'lb';
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
      sex_for_standards: ['male', 'female', 'unspecified'],
      theme_mode: ['dark', 'light', 'system'],
      weight_unit: ['kg', 'lb'],
    },
  },
} as const;
