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
- **Explore Page**: Redesigned search/explore page featuring 6 distinct curated content rows: (1) For You - merges friend activity + trending shows sorted by rating, (2) Trending - top trending shows from Trakt, (3-5) Because You Watched - 3 dynamic rows with hybrid similarity-scored recommendations (Phase 1: Trakt collaborative filtering + weighted similarity algorithm; genres 50%, keywords 15%, demographics 15%, era 10%, rating 10%; minimum score threshold 20), auto-hides rows with <6 quality recommendations, (6) Popular Rewatches - most rewatched shows from getPlayedShows(). Genres redesigned to 2 horizontal scrollable rows with larger buttons and snap paging for improved UX. All rows feature "View More" buttons for full results. Includes horizontal scrolling ExploreShowSection component displaying 2.5 shows, conditional TabSelector (hidden when not searching), robust UUID normalization for Trakt-only shows, and seamless integration with user interests service. Empty sections are filtered out to prevent blank displays.
- **Genre Discovery System (Updated Nov 21, 2025)**: Three-view routing architecture: (1) Explore page with genre grid, (2) Genre detail pages with 3-column poster grid and infinite scroll, (3) Section detail pages (For You, Trending, Popular Rewatches) with same 3-column grid layout. **Nano-genre filtering removed** per user request. Genre pages fetch 2 TMDB pages initially (40 shows, ensuring 30+ after Trakt enrichment) and auto-load additional pages on scroll. Section pages fetch 30 shows per page with pagination support via Trakt API page parameters. Uses official TMDB TV genre IDs (10759 Action, 16 Animation, 35 Comedy, 80 Crime, 99 Documentary, 18 Drama, 10751 Family, 10762 Kids, 9648 Mystery, 10763 News, 10764 Reality, 10765 Sci-Fi & Fantasy, 10766 Soap, 10767 Talk, 10768 War & Politics, 37 Western). Fallback genres (Music→Drama, Horror→Mystery, Thriller/Romance/History→Drama) use keyword filtering for precision. TMDB Discover API integration with genre filtering. FlatList implementation with `onEndReached` for automatic pagination at 50% scroll threshold.
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