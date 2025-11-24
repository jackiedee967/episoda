export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
        Relationships: []
      }
      playlists: {
        Row: {
          id: string
          user_id: string
          name: string
          is_public: boolean
          show_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          is_public?: boolean
          show_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          is_public?: boolean
          show_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      playlist_shows: {
        Row: {
          id: string
          playlist_id: string
          show_id: string
          added_at: string
        }
        Insert: {
          id?: string
          playlist_id: string
          show_id: string
          added_at?: string
        }
        Update: {
          id?: string
          playlist_id?: string
          show_id?: string
          added_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_shows_playlist_id_fkey"
            columns: ["playlist_id"]
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          }
        ]
      }
      shows: {
        Row: {
          id: string
          trakt_id: number
          imdb_id: string | null
          tvdb_id: number | null
          tmdb_id: number | null
          tvmaze_id: number | null
          title: string
          description: string | null
          poster_url: string | null
          backdrop_url: string | null
          rating: number | null
          total_seasons: number | null
          total_episodes: number | null
          color_scheme: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trakt_id: number
          imdb_id?: string | null
          tvdb_id?: number | null
          tmdb_id?: number | null
          tvmaze_id?: number | null
          title: string
          description?: string | null
          poster_url?: string | null
          backdrop_url?: string | null
          rating?: number | null
          total_seasons?: number | null
          total_episodes?: number | null
          color_scheme?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trakt_id?: number
          imdb_id?: string | null
          tvdb_id?: number | null
          tmdb_id?: number | null
          tvmaze_id?: number | null
          title?: string
          description?: string | null
          poster_url?: string | null
          backdrop_url?: string | null
          rating?: number | null
          total_seasons?: number | null
          total_episodes?: number | null
          color_scheme?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      episodes: {
        Row: {
          id: string
          show_id: string
          trakt_id: number | null
          imdb_id: string | null
          tvdb_id: number | null
          tmdb_id: number | null
          season_number: number
          episode_number: number
          title: string
          description: string | null
          thumbnail_url: string | null
          rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          show_id: string
          trakt_id?: number | null
          imdb_id?: string | null
          tvdb_id?: number | null
          tmdb_id?: number | null
          season_number: number
          episode_number: number
          title: string
          description?: string | null
          thumbnail_url?: string | null
          rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          show_id?: string
          trakt_id?: number | null
          imdb_id?: string | null
          tvdb_id?: number | null
          tmdb_id?: number | null
          season_number?: number
          episode_number?: number
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          rating?: number | null
          created_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          user_id: string
          show_id: string
          show_title: string
          show_poster: string
          episode_ids: string[]
          title: string | null
          body: string
          rating: number | null
          tags: string[]
          likes: number
          comments: number
          reposts: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          show_id: string
          show_title: string
          show_poster: string
          episode_ids?: string[]
          title?: string | null
          body: string
          rating?: number | null
          tags?: string[]
          likes?: number
          comments?: number
          reposts?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          show_id?: string
          show_title?: string
          show_poster?: string
          episode_ids?: string[]
          title?: string | null
          body?: string
          rating?: number | null
          tags?: string[]
          likes?: number
          comments?: number
          reposts?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            referencedRelation: "posts"
            referencedColumns: ["id"]
          }
        ]
      }
      post_reposts: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reposts_post_id_fkey"
            columns: ["post_id"]
            referencedRelation: "posts"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          id: string
          user_id: string | null
          post_id: string | null
          comment_text: string
          created_at: string
          parent_comment_id: string | null
          is_deleted: boolean
        }
        Insert: {
          id?: string
          user_id?: string | null
          post_id?: string | null
          comment_text: string
          created_at?: string
          parent_comment_id?: string | null
          is_deleted?: boolean
        }
        Update: {
          id?: string
          user_id?: string | null
          post_id?: string | null
          comment_text?: string
          created_at?: string
          parent_comment_id?: string | null
          is_deleted?: boolean
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          id: string
          user_id: string
          comment_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          comment_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          comment_id?: string
          created_at?: string
        }
        Relationships: []
      }
      post_episodes: {
        Row: {
          id: string
          post_id: string
          episode_id: string
        }
        Insert: {
          id?: string
          post_id: string
          episode_id: string
        }
        Update: {
          id?: string
          post_id?: string
          episode_id?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          id: string
          user_id: string | null
          platform: string
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          platform: string
          url: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          platform?: string
          url?: string
          created_at?: string
        }
        Relationships: []
      }
      watch_history: {
        Row: {
          id: string
          user_id: string
          show_id: string
          episode_id: string
          watched_at: string
        }
        Insert: {
          id?: string
          user_id: string
          show_id: string
          episode_id: string
          watched_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          show_id?: string
          episode_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_history_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "watch_history_show_id_fkey"
            columns: ["show_id"]
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_history_episode_id_fkey"
            columns: ["episode_id"]
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          user_id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          birthday: string | null
          onboarding_completed: boolean
          avatar_color_scheme: number | null
          avatar_icon: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          username: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          onboarding_completed?: boolean
          avatar_color_scheme?: number | null
          avatar_icon?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          username?: string
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthday?: string | null
          onboarding_completed?: boolean
          avatar_color_scheme?: number | null
          avatar_icon?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_desk_posts: {
        Row: {
          id: string
          user_id: string
          username: string
          title: string
          details: string
          category: string
          likes_count: number
          comments_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          username: string
          title: string
          details: string
          category: string
          likes_count?: number
          comments_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          username?: string
          title?: string
          details?: string
          category?: string
          likes_count?: number
          comments_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          actor_id: string
          post_id: string | null
          comment_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          actor_id: string
          post_id?: string | null
          comment_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          actor_id?: string
          post_id?: string | null
          comment_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      comment_mentions: {
        Row: {
          id: string
          comment_id: string
          mentioned_user_id: string
          mentioned_username: string
          created_at: string
        }
        Insert: {
          id?: string
          comment_id: string
          mentioned_user_id: string
          mentioned_username: string
          created_at?: string
        }
        Update: {
          id?: string
          comment_id?: string
          mentioned_user_id?: string
          mentioned_username?: string
          created_at?: string
        }
        Relationships: []
      }
      post_mentions: {
        Row: {
          id: string
          post_id: string
          mentioned_user_id: string
          mentioned_username: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          mentioned_user_id: string
          mentioned_username: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          mentioned_user_id?: string
          mentioned_username?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_user_profile_stats: {
        Args: {
          user_id: string
        }
        Returns: undefined
      }
      search_users_for_mentions: {
        Args: {
          search_term: string
          current_user_id: string
          following_ids: string[]
          result_limit?: number
        }
        Returns: {
          user_id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          avatar_color_scheme: number | null
          avatar_icon: string | null
          mutual_friends: number
          is_following: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
