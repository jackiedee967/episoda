# EPISODA - TV Show Social Media App

## Overview
EPISODA is a social media application for TV show enthusiasts, built with Expo and React Native. It enables users to share watching experiences, create show playlists, follow friends, and engage through posts, likes, comments, and reposts. The project aims to foster a vibrant community for TV show discussions and recommendations, with a focus on a pixel-perfect UI and robust data integration. The business vision is to become the leading social platform for TV show fans, offering a unique blend of community interaction and personalized content discovery.

## User Preferences
I prefer iterative development, focusing on one feature or fix at a time. Please ask for confirmation before making large-scale changes or refactoring. I value clear, concise explanations and prefer to focus on high-level architectural decisions and critical features rather than minor implementation details. 

**CRITICAL - ZERO TOLERANCE FOR REGRESSIONS:**
- Do not make changes to files related to authentication without explicit instruction
- Do not modify `integrations/supabase/client.ts` without explicit approval
- Do not modify `app.config.js` without understanding production vs dev implications
- This is an ACTIVE PRODUCTION APP with users - breaking changes are unacceptable

## System Architecture

### UI/UX Decisions
The application features a pixel-perfect UI aligned with Figma specifications, utilizing a comprehensive design token system for consistent styling. Gradient backgrounds are used for visual consistency. A professional skeleton loader system with shimmer animation provides seamless loading states, and a smooth crossfade transition system eliminates loading jumpiness.

### Technical Implementations
- **Framework**: Expo Router v6 (React Native 0.81.4, React 19.1.0)
- **Backend**: Supabase (authentication, database, real-time)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API
- **Styling**: StyleSheet API with a centralized design token system (`styles/tokens.ts`)
- **Authentication**: Supabase Auth with a 7-screen onboarding flow and production stability fixes.
- **Architecture**: Comprehensive state/actions/selectors refactor for improved data flow stability.
- **Database Schema**: All table names standardized to match Supabase PostgREST cached schema (e.g., `post_likes`, `post_reposts`, `comments`). Table names cannot be changed due to Supabase managed PostgREST cache.

### Feature Specifications
- **Social Features**: Posting, liking, commenting (4-tier recursive nesting), reposting, following, activity feed with infinite scroll, user profiles, "You May Know" suggestions, user mention system with autocomplete and notifications.
- **TV Show Management**: Show/episode pages, playlists, watchlist, watch history, personalized recommendations, dynamic episode progress, "Currently Watching" section, show-level rating, and a favorites section. Includes robust poster fallback chain and episode metadata/thumbnail refresh.
- **Explore Page**: Redesigned search/explore page featuring 6 distinct curated content rows, intelligent year/year-range display, mutual friends count, and genre-based filtering.
- **Recommendation Algorithm**: Production-grade system with strict universal hard filters and progressive relaxation, using composite ranking based on similarity (60%) and popularity (40%).
- **Genre Discovery System**: Three-view routing architecture using Trakt's native genre API with production-grade pagination.
- **Streaming Providers Display**: ShowHub displays streaming service logos using TMDB Watch Providers API with intelligent deduplication and fallback logic.
- **Rewatch Episode Tracking**: 3-click cycling for episode selection states with visual indicators and database tracking.
- **Account Management**: Account deletion and phone number change features.
- **Invite Friends System**: Two-trigger invite modal for user acquisition.
- **Founders Welcome Modal**: One-time welcome popup for first-time users.
- **Push Notifications System**: Expo Push Notifications with Supabase Edge Functions for delivery. Notification types include likes, comments, follows, mentions, admin announcements, friend activity. Permission prompt appears during onboarding.
- **Legal & Attribution**: Terms of Service and Privacy Policy accessible via clickable links on signup screen with slide-up modal. Acknowledgments page (`/settings/acknowledgments`) displays required attribution for TMDB, Trakt, and TVMaze APIs.

### System Design Choices
- **Development vs Production**: Separate Supabase instances for safe development (`EPISODA-Dev`) and production (`EPISODA-Prod`), with automatic environment switching via Replit environment variables.
- **Production Credential Management**: Supabase credentials stored as `EXPO_PUBLIC_` environment variables, split by environment.
- **Data Management**: All data managed via real Supabase data; Supabase-backed user profile cache.
- **TV Show Data Integration**: Utilizes multiple APIs (Trakt, TMDB, OMDB, TVMaze) with a robust fallback system.
- **Search Enrichment System**: Background worker for enhancing search results with metadata, progressive enhancement, and caching.
- **Performance Optimizations**: Database-first approach, lazy loading, background loading, and optimized queries. TV show metadata caching via `services/showCache.ts` (memory LRU + AsyncStorage with 24hr TTL). SQL COUNT aggregates for episode watched counts.
- **Smart Show Recommendations**: Personalized system with instant-loading caching and friend-based recommendations.
- **Scalability Infrastructure**: Comprehensive scaling guide at `supabase/SCALING_GUIDE.md` covering Supabase tier upgrades, connection pooling, read replicas, and monitoring. Database performance indexes in `supabase/migrations/004_performance_indexes.sql`.
- **API Reliability**: Comprehensive Trakt API health check and database fallback system.
- **Database Schema**: Key tables include `profiles`, `posts`, `shows`, `episodes`, `playlists`, `post_likes`, `post_reposts`, `comments`, `follows`, `social_links`, `watch_history`, `show_ratings`, `post_mentions`, `comment_mentions`, `notifications`, `post_reports`, `user_reports`. `post_likes` and `post_reposts` are locked by Supabase PostgREST cache. `profiles` table now includes `expo_push_token`, `notification_preferences` (JSONB), `is_admin`, `is_suspended`, `suspended_at`, and `suspended_reason` columns.
- **Admin Dashboard**: In-app admin panel at `/settings/admin` with server-side authorization. Features: overview stats, reports queue, user management, flagged content moderation. All admin RPC functions check `is_current_user_admin()` for authorization. Migration: `supabase/migrations/007_admin_dashboard.sql`.
- **Content Moderation System**: Automated word-list based detection of harmful slurs in posts and comments. Flagged content appears in admin dashboard "Flagged" tab for review. Implementation: `services/contentModeration.ts` for detection, integration in `contexts/DataContext.tsx` (posts) and `app/post/[id].tsx` (comments). Migration: `supabase/migrations/008_content_moderation.sql`.
- **Error Boundary & Logging System**: Custom error boundary (`components/ErrorBoundary.tsx`) catches unhandled React errors, displays a friendly error page, logs errors to `app_errors` table, and sends push notifications to admins. Admin dashboard "Errors" tab shows error statistics, top error screens, and recent unresolved errors. Migration: `supabase/migrations/009_app_errors.sql`.
- **Security Hardening**: API keys loaded from environment variables only. Admin column protection via database triggers (`supabase/migrations/010_protect_admin_columns.sql`). Server-side input length validation (`supabase/migrations/011_input_length_validation.sql`). Rate limiting infrastructure (`supabase/migrations/012_rate_limiting.sql`) with client-side integration (`services/rateLimiting.ts`) for OTP, posts, comments, follows. Auth tokens stored in encrypted SecureStore on iOS/Android (`services/secureStorage.ts`). Enhanced XSS prevention in `services/contentModeration.ts`. Full security documentation in `supabase/SECURITY_NOTES.md`.
- **iOS Crash Prevention**: Multiple iOS-specific crash fixes implemented for sharing, photo uploads, and bookmark icons. `PostModal` now uses `KeyboardAvoidingView` for proper keyboard handling.
- **iOS Animation Improvements**: Comprehensive iOS animation fixes using `react-native-reanimated` for smoother performance in `FadeInView.tsx`, `AnimatedCollapsible.tsx`, `SlideUpModal.tsx`, `GradientPlaceholder.tsx`, and `FadeInImage.tsx`. Homepage show posters now use `ShowPosterPlaceholder` wrappers.
- **Playlist Data Flow**: Critical fix to ensure playlists always show their shows. All playlist mutations refresh data from Supabase after successful DB operations using `loadPlaylistsRef` pattern. Runtime validation in `loadPlaylists` detects and logs `show_count` mismatches. `AsyncStorage` is only used as fallback for non-authenticated users. Architecture uses `useRef` to solve circular dependency between mutations and `loadPlaylists`.

### Protected Critical Paths (DO NOT MODIFY WITHOUT REVIEW)
- **`contexts/DataContext.tsx` - Playlist mutations**: All 5 playlist mutation functions MUST call `refreshPlaylistsFromSupabase()` after successful Supabase operations. This ensures UI always reflects database state.
- **`contexts/DataContext.tsx` - loadPlaylistsRef pattern**: The `loadPlaylistsRef.current = loadPlaylists` assignment MUST remain after `loadPlaylists` definition. This enables mutations to refresh without circular dependencies.
- **`integrations/supabase/client.ts`**: Authentication and database connection - DO NOT MODIFY without explicit approval.

## External Dependencies
- **Supabase**: Database, authentication, real-time.
- **Trakt API**: TV show metadata.
- **TMDB API**: Primary poster source.
- **OMDB API**: Fallback posters and IMDb ID enrichment.
- **TVMaze API**: Tertiary poster source and episode thumbnails.
- **Expo**: Core framework for React Native.
- **AsyncStorage**: Local storage.
- **expo-symbols**: UI icons.
- **lucide-react-native**: UI icons.
- **react-native-phone-number-input**: Phone number input formatting.
- **LinearGradient**: Gradient backgrounds.
- **@expo-google-fonts/instrument-serif**: Custom font.
- **expo-notifications**: Push notification handling.
- **expo-device**: Device detection for push notification eligibility.
- **expo-secure-store**: Encrypted storage for auth tokens on iOS/Android.