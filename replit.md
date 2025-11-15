# EPISODA - TV Show Social Media App

## Overview
EPISODA is a social media application for TV show enthusiasts, built with Expo and React Native. It allows users to share watching experiences, create show playlists, follow friends, and engage through posts, likes, comments, and reposts. The project aims to foster a vibrant community for TV show discussions and recommendations.

## User Preferences
I prefer iterative development, focusing on one feature or fix at a time. Please ask for confirmation before making large-scale changes or refactoring. I value clear, concise explanations and prefer to focus on high-level architectural decisions and critical features rather than minor implementation details. Do not make changes to files related to authentication without explicit instruction.

## System Architecture

### UI/UX Decisions
The application features a pixel-perfect UI overhaul aligned with Figma specifications, utilizing a comprehensive design token system for consistent styling (colors, typography, spacing). Gradient backgrounds are used for visual consistency, and components are styled according to design tokens.

### Technical Implementations
- **Framework**: Expo Router v6 (React Native 0.81.4, React 19.1.0)
- **Backend**: Supabase (authentication, database, real-time)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API
- **Styling**: StyleSheet API with a centralized design token system (`styles/tokens.ts`)
- **Authentication**: Supabase Auth (phone OTP, Apple Sign-In) with a 7-screen onboarding flow.
- **Architecture**: Comprehensive state/actions/selectors refactor for improved data flow stability.

### Feature Specifications
- **Social Features**: Posting, liking, commenting, reposting, following, friend activity feed, user profiles.
- **TV Show Management**: Show/episode pages, playlists, watch history, recommended titles, dynamic episode progress bar.
- **Authentication Flow**: Robust 7-screen onboarding with progressive data collection and authentication guards. Includes:
  - Pixel-perfect welcome screen with redesigned title and decorative elements
  - Phone number entry screen (Step 2/7) with international country code picker supporting 30+ countries
  - OTP verification screen
  - Display name selection
  - Auto-generated profile pictures
  - Account deletion capability
- **UI Enhancements**: Relative time display, refined progress bar, accurate episode counts, standardized episode formatting, navigation highlighting, custom profile tab display.
- **Redesigned Pages**: Welcome screen, Phone Number Entry screen, Episode Hub, Post Page, Profile Page, and Show Hub are fully redesigned to match Figma specifications.
- **Modular & Component-Based**: Organized into logical directories with reusable UI components (PhoneInput, PaginationDots, ButtonL) and centralized styling.

### System Design Choices
- **Development vs Production**: Separate Supabase instances for development and production, ensuring isolation.
- **Data Management**: All mock data has been removed; users interact only with real Supabase data. A Supabase-backed user profile cache is implemented.
- **TV Show Data Integration**: 
  - **Trakt API**: Primary data source for TV show metadata (search, show details, seasons, episodes)
  - **Production-Grade Architecture**: Hybrid API approach designed for 1M+ users
    - **Development Mode**: Direct Trakt API calls via Expo Constants (works in Expo Go + web preview)
    - **Production Mode**: Secure backend proxy routes at `app/api/trakt/` (ready for rate limiting, caching, authentication)
    - **Security**: Trakt Client ID (public) exposed via `app.config.js` for dev; Client Secret (private) stays server-side
    - **Scalability**: Backend routes ready for autoscale deployment with monitoring and request throttling
  - **OMDB API**: High-quality posters and IMDb ID enrichment (OMDB_API_KEY required, stored in Replit Secrets)
    - **Three-Tier Poster Fallback**: OMDB → TVMaze → Deterministic SVG Placeholder
    - **Poster Placeholder System**: Hash-based generator creates consistent 2:3 aspect ratio SVG placeholders with gradient backgrounds from design tokens and show initials
    - **expo-image Integration**: All poster-displaying components use expo-image for SVG data URI support (ShowCard, WatchHistoryCard, search, ShowHub, PostModal)
    - **Smart Enrichment**: Show enrichment preserves IMDb IDs even when posters unavailable, ensuring database always stores highest-quality metadata
  - **Rating Conversion System**: Production-grade 10-point to 5-star rating conversion with half-star support
    - **Conversion Function**: `convertToFiveStarRating()` utility converts API ratings using precise bucket mapping (0-0.9→0.5★, 1-1.9→1★, up to 9-10→5★)
    - **Half-Star Rendering**: StarRatings component uses SVG gradients for React Native/web compatibility (no font icon dependencies)
    - **Data Integrity**: Original 10-point ratings stored in database, conversion applied only at presentation layer
    - **Comprehensive Application**: Conversion applied consistently across all surfaces (search, show pages, episode pages, post pages, cards)
    - **Scalability**: Simple calculation-based approach suitable for 1M+ users with no performance overhead
  - **TVMaze API**: Secondary source for posters and episode thumbnails (20 requests/10s rate limit)
  - **Search Enrichment System**: Background worker that enhances search results with complete metadata
    - **Throttled Parallel Fetching**: Max 4 concurrent API requests to respect rate limits
    - **Progressive Enhancement**: Displays basic results immediately, enriches with seasons/posters in background
    - **Smart Caching**: Only caches successful enrichments; failed attempts can retry
    - **Error Propagation**: API failures don't get cached, enabling automatic retry on next search
    - **TVMaze Integration**: Returns both poster URL and TVMaze ID for downstream episode fetching
  - **Database Persistence**: Shows and episodes saved to Supabase before post creation for consistency
  - **Search-to-Hub Flow**: Simplified single-source-of-truth architecture
    - **Search Screen**: Fetches from Trakt → Enriches with poster/seasons/backdrop → Saves to Supabase → Navigates with DB ID
    - **ShowHub Screen**: Reads from Supabase only (no client-side Trakt fallback)
    - **Design Decision**: Eliminates redirect loops, state mismatches, and stuck spinners by removing complex hydration logic
    - **Error Handling**: ShowHub displays clean "Show not found" error if database lookup fails
  - **Show Hub Redesign (Nov 2025)**: Production-ready banner system and live data integration
    - **Banner System**: Edge-to-edge backdrop images (160px height, rounded bottom corners) fetched from free TVMaze API, stored in `backdrop_url` column
    - **Layout Updates**: Title repositioned inside bio container, poster increased to 120×180 (2:3 ratio), full-width tabs, refined spacing
    - **Live Data - Show Metadata**: Season/episode counts from database (show.totalSeasons/totalEpisodes with fallbacks)
    - **Live Data - Friends Watching**: Real-time calculation from posts by followed users (replaced mock data)
    - **Live Data - Episodes Tab**: Fetches episodes from database via getEpisodesByShowId, maps to Episode type with postCount, groups into seasons, handles show transitions correctly
    - **Log Episodes Integration**: FloatingTabBar transforms to "Log X episode(s)" button when episodes selected, opens PostModal with pre-selected episodes
  - **PostModal Flow**: Search → Select show → Fetch episodes → Validate metadata → Save to DB → Create post
  - **Error Handling**: Pre-save validation alerts users if episode metadata incomplete (specials/unaired episodes)
  - **Smart Show Recommendations (Nov 2025)**: Production-grade personalized recommendation system with instant-loading caching
    - **Data Source**: Uses `posts` table as source of truth for user's watched shows (not a separate watch_history table)
    - **Recommendation Algorithm**: Combines recently logged shows (from user posts) + genre-based recommendations (from Trakt) + trending shows (fallback)
    - **Hybrid Architecture**: Database-backed shows fetched from Supabase with Trakt metadata; Trakt-only shows lazy-persisted on click
    - **UI Integration**: 3×4 grid of recommended shows (126×172px posters) displayed when search query is empty, matching Explore tab styling
    - **Instant-Loading Cache System**: In-memory recommendation caching for zero-delay PostModal opening
      - **Preload Strategy**: Recommendations fetched automatically on user authentication, before PostModal opens
      - **10-Minute TTL**: Fresh caches served instantly; stale caches refetched automatically
      - **Mutex Pattern**: Prevents concurrent fetch requests, coalesces duplicate calls
      - **Cross-User Safety**: User ID verification prevents recommendation contamination during logout/login sequences
      - **Empty Result Handling**: Timestamp-based freshness checks prevent infinite refetch loops on empty recommendations
      - **Mutation Hooks**: Cache invalidated automatically when user creates/deletes posts (watch history changes)
      - **Fallback Retry**: PostModal triggers reload if cache unavailable (resilient to auth race conditions)
    - **Production-Safe**: Post-sorted limiting (handles 100+ logged shows), refetch fallback uses stored `traktId` (handles both UUID and Trakt IDs)
    - **Services**: `services/recommendations.ts` (getRecentlyLoggedShows, getUserGenreInterests, getGenreBasedRecommendations, getCombinedRecommendations)
- **Mock User Seeding**: Database seeding script (`scripts/seedMockUsers.ts`) creates 4 real mock users (jackie, max, mia, liz) in development database with auto-generated avatars and follow relationships. Run via `npm run seed:mock-users`. Requires `SUPABASE_SERVICE_ROLE_KEY` environment variable.
- **Account Management**: Implemented account deletion via Supabase Edge Functions and a phone number change feature for SMS-authenticated users.
- **Robust Authentication**: Addressed OTP verification race conditions and username persistence bugs for a smoother onboarding experience.

## Database Schema
**CRITICAL: Always verify table names before writing queries. Use `execute_sql_tool` to check schema if unsure.**

### Supabase Tables (Verified Schema):
- `profiles` — User profiles (username, display_name, avatar_url, bio, etc.)
- `posts` — User posts about shows/episodes
- `shows` — TV show metadata (title, poster_url, backdrop_url, etc.)
- `episodes` — Episode metadata (season_number, episode_number, title, etc.)
- `playlists` — User-created show playlists
- `playlist_shows` — Many-to-many relationship between playlists and shows
- `likes` — Post likes (NOT "post_likes")
- `reposts` — Post reposts (NOT "post_reposts")  
- `comments` — Post comments
- `follows` — User follow relationships
- `post_episodes` — Many-to-many relationship between posts and episodes
- `social_links` — User social media links
- `help_desk_posts` — Support/help desk posts

**Note**: Watch history is tracked through the `posts` table (user's logged episodes), not a separate `watch_history` table. Recommendation systems query `posts.show_id` and `posts.created_at` to determine viewing patterns.

### Query Best Practices:
1. **Before writing any new query**: Check existing queries in `contexts/DataContext.tsx` to see table names
2. **If unsure**: Use `execute_sql_tool` with `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
3. **Never assume table names** - verify first

## External Dependencies
- **Supabase**: Database, authentication, and real-time functionalities.
- **Trakt API**: TV show metadata (TRAKT_CLIENT_ID, TRAKT_CLIENT_SECRET required)
- **OMDB API**: High-quality show posters and IMDb ID enrichment (OMDB_API_KEY required)
- **TVMaze API**: Show posters and episode thumbnails (no auth required, rate limited to 20 requests/10s)
- **Expo**: Core framework for React Native development.
- **AsyncStorage**: Local storage for session persistence.
- **expo-symbols**: UI icons.
- **lucide-react-native**: UI icons (Edit, Settings, HelpCircle, Eye, Flame, EyeOff, Instagram, Music, Globe).
- **react-native-phone-number-input**: (Mobile only) Phone number input formatting.
- **LinearGradient**: Gradient backgrounds.
- **@expo-google-fonts/instrument-serif**: Custom font for typography.