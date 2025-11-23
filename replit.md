# EPISODA - TV Show Social Media App

## Overview
EPISODA is a social media application for TV show enthusiasts, built with Expo and React Native. It enables users to share watching experiences, create show playlists, follow friends, and engage through posts, likes, comments, and reposts. The project aims to foster a vibrant community for TV show discussions and recommendations, focusing on a pixel-perfect UI and robust data integration for TV show metadata. The business vision is to become the leading social platform for TV show fans, offering a unique blend of community interaction and personalized content discovery.

## User Preferences
I prefer iterative development, focusing on one feature or fix at a time. Please ask for confirmation before making large-scale changes or refactoring. I value clear, concise explanations and prefer to focus on high-level architectural decisions and critical features rather than minor implementation details. Do not make changes to files related to authentication without explicit instruction.

## System Architecture

### UI/UX Decisions
The application features a pixel-perfect UI aligned with Figma specifications, utilizing a comprehensive design token system for consistent styling. Gradient backgrounds are used for visual consistency. A professional skeleton loader system with shimmer animation provides seamless loading states, and a smooth crossfade transition system eliminates loading jumpiness.

### Technical Implementations
- **Framework**: Expo Router v6 (React Native 0.81.4, React 19.1.0)
- **Backend**: Supabase (authentication, database, real-time)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API
- **Styling**: StyleSheet API with a centralized design token system (`styles/tokens.ts`)
- **Authentication**: Supabase Auth (phone OTP, Apple Sign-In) with a 7-screen onboarding flow. **CRITICAL FIX (Nov 2025)**: Resolved production "Unknown User" bug caused by race condition during session initialization. AuthContext now uses `authReady` flag to signal when bootstrap completes, preventing DataContext from clearing caches prematurely. User state initialized to `undefined` (not `null`) during startup, and DataContext only clears data when `authReady=true AND user=null`.
- **Architecture**: Comprehensive state/actions/selectors refactor for improved data flow stability.
- **Database Schema Alignment (Nov 21, 2025)**: Comprehensive schema alignment completed to ensure 100% consistency between code and database. All table names standardized to match Supabase PostgREST cached schema: `post_likes`, `post_reposts`, `comments` with `comment_text` field (no image support). Social links properly fetched from `social_links` table. User type updated with correct `socialLinks: SocialLink[]` array type. **CRITICAL**: Table names cannot be changed due to Supabase managed PostgREST cache - attempting to rename tables will break persistence.

### Feature Specifications
- **Social Features**: Posting, liking, commenting (4-tier recursive nesting), reposting, following, friend activity feed with infinite scroll, user profiles, "You May Know" suggestions with mutual friends.
- **Infinite Scroll**: Homepage activity feed uses FlatList virtualization with automatic pagination. Loads 10 posts initially, fetches more community posts when scrolling near bottom (onEndReached), displays loading states and "end of feed" message. Posts are chronologically sorted with timestamp sanitization for robust rendering.
- **TV Show Management**: Show/episode pages, playlists, watchlist, watch history, personalized recommended titles, dynamic episode progress bar, and "Currently Watching" section for quick logging. Includes a production-grade rating conversion system and a robust poster fallback chain.
- **Explore Page**: Redesigned search/explore page featuring 6 distinct curated content rows: (1) For You - merges friend activity + trending shows sorted by rating, (2) Trending - top trending shows from Trakt, (3-5) Because You Watched - 3 dynamic rows with production-grade recommendations, (6) Popular Rewatches - most rewatched shows from getPlayedShows(). Genres redesigned to 2 horizontal scrollable rows with larger buttons and snap paging for improved UX. All rows feature "View More" buttons for full results. Includes horizontal scrolling ExploreShowSection component displaying 2.5 shows, conditional TabSelector (hidden when not searching), robust UUID normalization for Trakt-only shows, and seamless integration with user interests service. Empty sections are filtered out to prevent blank displays.
- **Recommendation Algorithm (Nov 23, 2025)**: Production-grade system with strict universal hard filters preventing irrelevant cross-genre/vintage/foreign/animated/low-quality content. **CRITICAL FIX**: Filter execution order ensures animation/language/rating checks ALWAYS apply before genre checks, preventing bypass via missing metadata. **Progressive Relaxation System**: Guarantees minimum 20+ recommendations per show via 2-tier filtering: (1) Strict filters first, (2) If <20 survivors, apply relaxed filters (±10 years, any genre overlap, rating ≥6.0) while PRESERVING animation/language/rating blocks. **Centralized Filtering**: `applyHardFilters()` in recommendationScoring.ts enforces (in order): (1) Animation/anime blocked unless seed is animated, (2) Language must be English (en) OR country in [us, gb, ca, au] - rejects if EITHER field is non-English, (3) Minimum Trakt rating ≥6.5, (4) Primary genre MUST match, (5) Multi-genre shows require ≥2 genre overlap, (6) Must be within ±5 years. **Candidate Pool Expansion**: Fetches 100 Trakt related shows; if <60 candidates, blends 50 popular shows from seed's primary genre as fallback. **Composite Ranking**: finalScore = similarity (60%) + popularity (40%), where popularity = normalized votes (70%) + rating (30%) - surfaces mainstream shows first. **Similarity Scoring**: Weighted matching - genres 50%, keywords 15%, demographics 15%, era 10%, rating 10%; minimum threshold 15 (lowered from 20). **Display**: Shows 3+ recommendations per section, ordered by composite score. **Section Detail Pages**: "Because You Watched" sections link to full paginated views with 3-column grid layout, infinite scroll, and all ranked recommendations. **Production Validation (Nov 23, 2025)**: Zero-bypass filter stack - ALL foreign/anime/low-rated shows blocked even when metadata missing. Fresh seed metadata fetched from Trakt API before filtering.
- **Genre Discovery System (Updated Nov 23, 2025)**: Three-view routing architecture: (1) Explore page with genre grid, (2) Genre detail pages with 3-column poster grid and infinite scroll, (3) Section detail pages (For You, Trending, Popular Rewatches) with same 3-column grid layout. **CRITICAL MIGRATION (Nov 23, 2025)**: Entire genre system migrated from TMDB to Trakt's native genre API to fix critical bug where TMDB TV lacks Romance, Thriller, Horror, and History genres (all mapped to Drama ID 18 causing identical results). New system uses Trakt `/shows/popular?genres=` endpoint with proper filtering across ALL genres. Music genre removed from grid. Genre pages fetch 2 Trakt pages initially (40 shows) with automatic poster enrichment. Section pages fetch 30 shows per page. **Production-Grade Pagination (Nov 23, 2025)**: Architect-approved pagination resilience with (1) Trakt pagination header integration (`X-Pagination-Page-Count`) as authoritative end-of-data source, (2) Retry logic with exponential backoff (2 attempts, 250ms/750ms delays) for empty responses, (3) Defensive null handling - only trust pageCount headers, never assume `<20 shows = end`, (4) Alert.alert notifications for rate-limit and network errors with user-friendly messages, (5) Keeps `hasMore=true` during transient failures allowing manual retry via scroll, (6) `lastSuccessfulPage` tracking to prevent redundant fetches. 3-tier empty response handling: pageCount confirms end → stop, pageCount null + empty → Alert + manual retry, pageCount null + partial → keep alive. Zero tolerance for UX regressions in production pagination.
- **Authentication Flow**: Robust 7-screen onboarding with progressive data collection and authentication guards.
- **UI Enhancements**: Relative time display, refined progress bar, accurate episode counts, standardized episode formatting, navigation highlighting, custom profile tab display.
- **Redesigned Pages**: Welcome, Phone Number Entry, Episode Hub, Post Page, Profile Page, Show Hub, and Explore Page are fully redesigned.
- **Modular & Component-Based**: Organized into logical directories with reusable UI components.
- **PostModal Flow**: Guides users through selecting a show, fetching/validating episodes, saving to DB, creating a post, and redirecting. Supports custom tags and a half-star rating system with tap and drag gestures.
- **Account Management**: Account deletion and phone number change features.

### System Design Choices
- **Development vs Production**: Separate Supabase instances.
- **Data Management**: All mock data removed, users interact only with real Supabase data. Supabase-backed user profile cache.
- **TV Show Data Integration**: Utilizes multiple APIs (Trakt, TMDB, OMDB, TVMaze) with a robust fallback system for metadata, posters, and episode thumbnails.
- **Search Enrichment System**: Background worker enhances search results with complete metadata using throttled parallel fetching, progressive enhancement, and smart caching.
- **Database Persistence**: Shows and episodes saved to Supabase before post creation, with robust UUID management for playlist integrity.
- **Performance Optimizations**: Database-first approach for episode loading, lazy loading of seasons, background loading for remaining seasons, smart season logic, and optimized queries for community and friend feeds. Homepage uses cached recommendations from DataContext to eliminate redundant Trakt API calls.
- **Smart Show Recommendations**: Personalized recommendation system using user posts, genre interests, and trending shows with an instant-loading caching system (25 recommendations, 5-minute TTL), including friend-based recommendations. DataContext caches enriched recommendations that homepage accesses directly, preventing duplicate API requests.
- **API Reliability**: Comprehensive Trakt API health check and database fallback system for zero-downtime operation.
- **Database Schema**: `profiles`, `posts`, `shows`, `episodes`, `playlists`, `playlist_shows`, `post_likes`, `post_reposts`, `comments` (with `comment_text` field), `follows`, `post_episodes`, `social_links`, `help_desk_posts`, `comment_likes`, `watch_history`, `notification_preferences`, `reports`. **NOTE**: Table names `post_likes` and `post_reposts` are locked by Supabase PostgREST cache and cannot be renamed without breaking production.

## External Dependencies
- **Supabase**: Database, authentication, real-time.
- **Trakt API**: TV show metadata.
- **TMDB API**: Primary poster source.
- **OMDB API**: Fallback posters and IMDb ID enrichment.
- **TVMaze API**: Tertiary poster source and episode thumbnails.
- **Expo**: Core framework for React Native.
- **AsyncStorage**: Local storage.
- **expo-symbols**: UI icons.
- **lucide-react-native**: UI icons (Edit, Settings, HelpCircle, Eye, Flame, EyeOff, Instagram, Music, Globe).
- **react-native-phone-number-input**: Phone number input formatting.
- **LinearGradient**: Gradient backgrounds.
- **@expo-google-fonts/instrument-serif**: Custom font.