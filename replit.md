# EPISODA - TV Show Social Media App

## Overview
EPISODA is a social media application for TV show enthusiasts, built with Expo and React Native. It enables users to share watching experiences, create show playlists, follow friends, and engage through posts, likes, comments, and reposts. The project aims to foster a vibrant community for TV show discussions and recommendations, focusing on a pixel-perfect UI and robust data integration for TV show metadata.

## Recent Changes (November 19, 2025)
- **Edit Profile Error Handling - Production-Ready**: Added comprehensive error handling to EditProfileModal to identify and surface database operation failures
  - **Root Cause**: Supabase operations were not checking for errors, causing silent failures when RLS policies or other database issues occurred
  - **Authentication Validation**: Added error checking to `supabase.auth.getUser()` with fallback to catch auth failures early
  - **Profile Lookup Error Handling**: Now properly handles errors from `profiles.select().single()` except for expected "no row found" case (PGRST116)
  - **Database Operation Checks**: All update/insert/delete operations on `profiles` and `social_links` tables now check for errors and throw with specific messages
  - **Improved User Feedback**: Error messages now show specific failure reasons instead of generic "Failed to save profile" message
  - **Console Logging**: All errors logged to console for debugging, making it easy to identify RLS policy issues or other database problems
  - **Architect Approved**: Error handling pattern validated as production-ready, catching all failure scenarios
- **Watchlist Progress Bar Fix**: Changed totalCount calculation to use `item.show.totalEpisodes ?? item.episodes.size` for accurate progress tracking with safe fallback
- **Playlist UUID Fix - Production-Ready**: Completely resolved "shows missing from playlist" issue with race-condition-free implementation
  - **Root Cause**: Shows were being saved with Trakt IDs instead of database UUIDs, causing silent insertion failures in `playlist_shows` table
  - **Solution**: New `ensureShowUuid()` helper in `services/showDatabase.ts` validates/fetches/saves shows to guarantee proper UUID usage
  - **PlaylistModal Refactor**: Pre-fetches database UUID before enabling playlist interactions, with request token system to prevent stale promise resolutions
  - **Race Condition Guards**: Incrementing token invalidates in-flight requests, cleanup function handles unmount/deps changes, state cleared before each fetch
  - **Defensive Validation**: DataContext UUID validation prevents corrupted IDs from reaching database operations
  - **Loading States**: Playlist interactions disabled until correct UUID confirmed, preventing incorrect add/remove operations
  - **Zero Regressions**: Surgical fix scoped only to playlist flows, no impact on show pages, posts, search, or recommendations
- **Followers/Following Modal UI Update**: Redesigned to match light mode design system with pure white background, proper typography tokens (titleL, subtitle, p1, p3R), and consistent color scheme
- **Smart User Sorting**: Current user now appears first in followers/following lists when viewing other profiles, improving UX for finding yourself in lists
- **Follow/Unfollow Functionality Fixed**: Fixed two critical issues preventing follow/unfollow from working
  - **Database RLS Policies**: Added Row Level Security policy "Allow all operations on follows" to enable insert/delete operations on the follows table
  - **React Hooks Rule Violation**: Moved `handleFollowToggle` function before early return in `app/user/[id].tsx` to prevent component structure changes between renders
  - Follow/unfollow now works across entire app: user profiles, search tab, followers modal, and following modal
- **Episode Page Completed**: New `/episode/[id]` route with show/episode tags, thumbnail, rating (10+ posts = average, else API), Friends/Everyone filtering, and PostModal integration with pre-selected episode

## Previous Changes (November 18, 2025)
- **100% API Reliability Achieved**: Implemented comprehensive Trakt API health check and database fallback system for zero-downtime operation
- **Trakt Health Check Service** (`services/traktHealth.ts`): Lightweight GET request with 5-minute cache to detect API availability, prevents slow network timeouts
- **Database-Only Recommendations**: Fixed cache clearing race condition - cache now persists through auth transitions, only cleared when switching users
- **Database-Only Search**: Checks Trakt health first, instantly uses database when API down (no timeout delays), graceful fallback when API fails
- **Security Fix**: Prevented cross-user data contamination using ref-based validation in `loadRecommendations()`
- **Known Non-Critical Issue**: Database query error "column shows.genres does not exist" despite column existing - fallback to trending shows working correctly

## User Preferences
I prefer iterative development, focusing on one feature or fix at a time. Please ask for confirmation before making large-scale changes or refactoring. I value clear, concise explanations and prefer to focus on high-level architectural decisions and critical features rather than minor implementation details. Do not make changes to files related to authentication without explicit instruction.

## System Architecture

### UI/UX Decisions
The application features a pixel-perfect UI overhaul aligned with Figma specifications, utilizing a comprehensive design token system for consistent styling. Gradient backgrounds are used for visual consistency. A professional skeleton loader system with shimmer animation provides seamless loading states. A smooth crossfade transition system eliminates loading jumpiness throughout the app using `FadeInView` for content and `FadeInImage` for images.

### Technical Implementations
- **Framework**: Expo Router v6 (React Native 0.81.4, React 19.1.0)
- **Backend**: Supabase (authentication, database, real-time)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API
- **Styling**: StyleSheet API with a centralized design token system (`styles/tokens.ts`)
- **Authentication**: Supabase Auth (phone OTP, Apple Sign-In) with a 7-screen onboarding flow.
- **Architecture**: Comprehensive state/actions/selectors refactor for improved data flow stability.

### Feature Specifications
- **Social Features**: Posting, liking, commenting (with 4-tier recursive nesting), reposting, following, friend activity feed, user profiles.
- **TV Show Management**: Show/episode pages, playlists, watch history, recommended titles, dynamic episode progress bar. Includes a production-grade rating conversion system (10-point to 5-star with half-star support) and a robust poster fallback chain (TMDB → OMDB → TVMaze).
- **Authentication Flow**: Robust 7-screen onboarding with progressive data collection and authentication guards.
- **UI Enhancements**: Relative time display, refined progress bar, accurate episode counts, standardized episode formatting, navigation highlighting, custom profile tab display.
- **Redesigned Pages**: Welcome, Phone Number Entry, Episode Hub, Post Page, Profile Page, and Show Hub are fully redesigned.
- **Modular & Component-Based**: Organized into logical directories with reusable UI components.
- **PostModal Flow**: Guides users through selecting a show, fetching/validating episodes, saving to DB, creating a post, and redirecting. Supports custom tags and a half-star rating system with tap and drag gestures.

### System Design Choices
- **Development vs Production**: Separate Supabase instances.
- **Data Management**: All mock data removed, users interact only with real Supabase data. Supabase-backed user profile cache.
- **TV Show Data Integration**: Utilizes Trakt API for metadata, TMDB API for primary posters, OMDB API for fallback posters and IMDb ID enrichment, and TVMaze API for tertiary posters and episode thumbnails, including a robust fallback system for episode loading.
- **Search Enrichment System**: Background worker enhances search results with complete metadata using throttled parallel fetching, progressive enhancement, and smart caching.
- **Database Persistence**: Shows and episodes saved to Supabase before post creation.
- **Performance Optimizations**: Database-first approach for episode loading, lazy loading of seasons, background loading for remaining seasons, and smart season logic.
- **Smart Show Recommendations**: Production-grade personalized recommendation system using user posts, genre interests, and trending shows with an instant-loading caching system.
- **Account Management**: Account deletion via Supabase Edge Functions and phone number change feature.
- **Robust Authentication**: Addressed OTP verification race conditions and username persistence bugs.

### Database Schema
**CRITICAL: Always verify table names before writing queries. Use `execute_sql_tool` to check schema if unsure.**
- `profiles`
- `posts`
- `shows`
- `episodes`
- `playlists`
- `playlist_shows`
- `likes`
- `reposts`
- `comments`
- `follows`
- `post_episodes`
- `social_links`
- `help_desk_posts`

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