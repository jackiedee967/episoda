# EPISODA - TV Show Social Media App

## Overview
EPISODA is a social media application for TV show enthusiasts, built with Expo and React Native. It enables users to share watching experiences, create show playlists, follow friends, and engage through posts, likes, comments, and reposts. The project aims to foster a vibrant community for TV show discussions and recommendations.

## Recent Changes (Nov 2025)
- **Progress Bar Layout Fix**: Removed `maxWidth` constraint from ShowsEpisodeProgressBar component to allow full-width display within containers
- **Currently Watching Posters**: Added `getPosterUrl()` helper to normalize poster URLs across profile pages (handles `posterUrl`, `poster_path`, and `poster` field variations)
- **Console Error Elimination**: Fixed "Unexpected text node" React Native Web errors by converting `&&` conditionals to ternaries with explicit `null` returns and adding null checks to stat card maps

## User Preferences
I prefer iterative development, focusing on one feature or fix at a time. Please ask for confirmation before making large-scale changes or refactoring. I value clear, concise explanations and prefer to focus on high-level architectural decisions and critical features rather than minor implementation details. Do not make changes to files related to authentication without explicit instruction.

## System Architecture

### UI/UX Decisions
The application features a pixel-perfect UI overhaul aligned with Figma specifications, utilizing a comprehensive design token system for consistent styling (colors, typography, spacing). Gradient backgrounds are used for visual consistency.

- **Skeleton Loader System**: Professional loading states with shimmer animation using `expo-linear-gradient` and Animated API. Replaces blank screens throughout the app with contextual skeleton components:
  - **Base Components**: SkeletonContainer (with shimmer + fade-out), SkeletonLine, SkeletonCircle, SkeletonBlock for building custom skeletons
  - **Specialized Components**: CommentSkeleton, StatCardSkeleton, ProgressBarSkeleton, PosterSkeleton, PostCardSkeleton, SearchResultSkeleton
  - **Implemented In**: Home feed, search results, post comments, profile stats (both user profiles and main profile page)
  - **Architecture**: Local loading states (not DataContext-based) for component-specific control and better perceived performance
  
- **Fade Transition System**: Smooth crossfade animations eliminate loading jumpiness across the entire app:
  - **FadeInView Component**: Reusable wrapper with configurable duration (default 300ms) and staggered delays for sequential items
  - **FadeInImage Component**: Specialized component for image fade-in on load using expo-image with Animated API wrapper. Supports both `style` (applied to image) and `containerStyle` (applied to wrapper) for flexible layout control
  - **Crossfade Pattern**: Skeleton fades out 200ms → content fades in 300ms for smooth visual transition
  - **Implemented In**: 
    - Content fade-ins: Home feed posts, search results, profile stats, post comments (FadeInView with staggered delays)
    - Image fade-ins: Episode thumbnails, show posters, user avatars, rotation posters, search placeholder image, empty state emojis, comment show posters, stat icons, notification avatars, action button icons (FadeInImage)
    - Empty states: Logs, watch history, and playlists empty state images (FadeInImage)
    - Progress bars (wrapped with FadeInView)
  - **Technical**: Uses React Native Animated API with `useNativeDriver: false` for web compatibility. All static and remote images use FadeInImage for consistent smooth loading throughout app. Image-specific styles (borderRadius, tintColor) are preserved via the `style` prop

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
- **Authentication Flow**: Robust 7-screen onboarding with progressive data collection and authentication guards.
- **UI Enhancements**: Relative time display, refined progress bar, accurate episode counts, standardized episode formatting, navigation highlighting, custom profile tab display.
- **Redesigned Pages**: Welcome, Phone Number Entry, Episode Hub, Post Page, Profile Page, and Show Hub are fully redesigned to match Figma specifications.
- **Modular & Component-Based**: Organized into logical directories with reusable UI components.

### System Design Choices
- **Development vs Production**: Separate Supabase instances for development and production.
- **Data Management**: All mock data removed, users interact only with real Supabase data. Supabase-backed user profile cache.
- **TV Show Data Integration**:
  - **Trakt API**: Primary data source for metadata (search, show details, seasons, episodes). Hybrid API approach for scalability (direct calls in dev, secure backend proxy in prod).
  - **TMDB API**: Primary poster source for near-99% coverage, especially for international shows. Integrated via Expo Constants and environment variables.
  - **OMDB API**: High-quality posters and IMDb ID enrichment (fallback after TMDB). Features `expo-image` integration.
  - **TVMaze API**: Tertiary poster source and episode thumbnails. Used for ID-based lookups (IMDb/TVDB) and title-based search as final fallback.
  - **Poster Fallback Chain**: TMDB → OMDB → TVMaze (ID lookup) → TVMaze (title search) → Deterministic SVG placeholder with full show title in P1 text style.
  - **Search Result Sorting**: Shows with actual posters display first, placeholder shows appear at bottom for better UX.
  - **Rating Conversion System**: Production-grade 10-point to 5-star rating conversion with half-star support using a `convertToFiveStarRating()` utility.
  - **Search Enrichment System**: Background worker enhances search results with complete metadata using throttled parallel fetching, progressive enhancement, and smart caching.
  - **Database Persistence**: Shows and episodes saved to Supabase before post creation.
  - **Search-to-Hub Flow**: Simplified single-source-of-truth architecture where Search saves to Supabase and ShowHub reads from Supabase.
  - **Show Hub Redesign**: Production-ready banner system with edge-to-edge backdrop images from TVMaze API, updated layout, and live data integration for show metadata, friends watching, and episodes.
  - **PostModal Flow**: Guides users through selecting a show, fetching/validating episodes, saving to DB, creating a post, and redirecting to the post page.
    - **Validation**: Rating is the ONLY required field. Title, body text, and tags are all optional.
    - **Custom Tags**: Users can create custom tags that appear as toggleable buttons alongside predefined tags, allowing selection/deselection for flexible post categorization.
    - **Half-Star Rating System**: Cross-platform (web, iOS, Android) implementation using Lucide icons. Supports 0.5-5.0 ratings in 0.5 increments with tap-on-half detection (left half = X.5, right half = X.0) and drag gesture support with haptic feedback. Uses overlay technique with 50% clipped filled star over outline star for consistent half-star rendering across all platforms.
  - **Performance Optimizations**: Database-first approach for episode loading, lazy loading of seasons, and background loading for remaining seasons.
  - **Smart Season Logic**: Intelligent season dropdown expansion based on watch history for PostModal and ShowHub.
  - **Smart Show Recommendations**: Production-grade personalized recommendation system using user posts, genre interests, and trending shows. Features an instant-loading caching system with preloading, TTL, mutex patterns, and cache invalidation.
- **Mock User Seeding**: Script (`scripts/seedMockUsers.ts`) to create mock users in the development database.
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
**Note**: Watch history is tracked through the `posts` table.

## External Dependencies
- **Supabase**: Database, authentication, and real-time functionalities.
- **Trakt API**: TV show metadata (search, details, seasons, episodes).
- **TMDB API**: Primary poster source (near-99% coverage).
- **OMDB API**: Fallback posters and IMDb ID enrichment.
- **TVMaze API**: Tertiary poster source and episode thumbnails.
- **Expo**: Core framework for React Native development.
- **AsyncStorage**: Local storage for session persistence.
- **expo-symbols**: UI icons.
- **lucide-react-native**: UI icons (Edit, Settings, HelpCircle, Eye, Flame, EyeOff, Instagram, Music, Globe).
- **react-native-phone-number-input**: Phone number input formatting.
- **LinearGradient**: Gradient backgrounds.
- **@expo-google-fonts/instrument-serif**: Custom font.