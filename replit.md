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
- **Authentication**: Supabase Auth with a 7-screen onboarding flow and specific fixes for production stability.
- **Architecture**: Comprehensive state/actions/selectors refactor for improved data flow stability.
- **Database Schema**: All table names standardized to match Supabase PostgREST cached schema (e.g., `post_likes`, `post_reposts`, `comments`). Table names cannot be changed due to Supabase managed PostgREST cache.

### Feature Specifications
- **Social Features**: Posting, liking, commenting (4-tier recursive nesting), reposting, following, friend activity feed with infinite scroll, user profiles, "You May Know" suggestions, user mention system with autocomplete and notifications.
- **TV Show Management**: Show/episode pages, playlists, watchlist, watch history, personalized recommended titles, dynamic episode progress bar, "Currently Watching" section, show-level rating, and a favorites section. Includes robust poster fallback chain and episode metadata/thumbnail refresh systems.
- **Explore Page**: Redesigned search/explore page featuring 6 distinct curated content rows, intelligent year/year-range display, mutual friends count, and genre-based filtering.
- **Recommendation Algorithm**: Production-grade system with strict universal hard filters and progressive relaxation, using composite ranking based on similarity (60%) and popularity (40%).
- **Genre Discovery System**: Three-view routing architecture using Trakt's native genre API with production-grade pagination.
- **Streaming Providers Display**: ShowHub displays streaming service logos using TMDB Watch Providers API with intelligent deduplication and fallback logic.
- **Rewatch Episode Tracking**: 3-click cycling for episode selection states (unselected → watched → rewatched → unselected) with visual indicators and database tracking.
- **Account Management**: Account deletion and phone number change features.
- **Invite Friends System**: Two-trigger invite modal for user acquisition.
- **Founders Welcome Modal**: One-time welcome popup for first-time users featuring personalized message from founders Jasmine & Jackie, encouraging feedback and community engagement.
- **Push Notifications System**: Expo Push Notifications with Supabase Edge Functions for delivery. Notification types: likes, comments, follows, mentions, admin announcements, friend logs watched show, friend logs playlist show. Permission prompt appears in onboarding after "Select 3 Shows" step before Founders modal.

### System Design Choices
- **Development vs Production**: Separate Supabase instances for safe development.
  - **EPISODA-Dev** (atzrteveximvujzoneuu): Development/testing database
  - **EPISODA-Prod** (mbwuoqoktdgudzaemjhx): Production database with real users
- **Environment Switching**: Automatic via Replit environment variables:
  - Development environment → Dev database
  - Production environment → Prod database
- **Production Credential Management**: Supabase credentials stored as `EXPO_PUBLIC_` environment variables, split by environment.
- **Data Management**: All data managed via real Supabase data; Supabase-backed user profile cache.
- **TV Show Data Integration**: Utilizes multiple APIs (Trakt, TMDB, OMDB, TVMaze) with a robust fallback system.
- **Search Enrichment System**: Background worker for enhancing search results with metadata, progressive enhancement, and caching.
- **Performance Optimizations**: Database-first approach, lazy loading, background loading, and optimized queries.
- **Smart Show Recommendations**: Personalized system with instant-loading caching and friend-based recommendations.
- **API Reliability**: Comprehensive Trakt API health check and database fallback system.
- **Database Schema**: Key tables include `profiles`, `posts`, `shows`, `episodes`, `playlists`, `post_likes`, `post_reposts`, `comments`, `follows`, `social_links`, `watch_history`, `show_ratings`, `post_mentions`, `comment_mentions`, `notifications`. `post_likes` and `post_reposts` are locked by Supabase PostgREST cache. `profiles` table now includes `expo_push_token` and `notification_preferences` (JSONB) columns for push notifications.

## Development & Deployment Workflow

### Environment Setup
1. **Development (Replit)**: Uses EPISODA-Dev Supabase automatically
2. **Production (EAS Build)**: Uses EPISODA-Prod Supabase automatically

### Safe Deployment Process

**1. Database Changes**
- Test all schema changes in dev database first
- Use `supabase/dev_database_schema.sql` as reference for dev setup
- Make changes additive (add new columns, don't delete old ones immediately)
- Backup production before any migration

**2. App Updates**
- **Over-the-Air (OTA)**: For UI fixes, feature updates (instant, no App Store)
- **Full Build**: For native code changes, new permissions (1-3 day Apple review)

**3. Pre-Launch Checklist**
- [ ] Test in dev environment
- [ ] Check signup/login still works
- [ ] Verify old user accounts aren't broken
- [ ] Backup production database
- [ ] Test on real iPhone

**4. Rollback Plan**
- Database: Restore from Supabase automatic backups
- App (OTA): Instantly revert to previous version via Expo
- App (Store): Re-submit old version (1-3 days)

### Key Files
- `supabase/dev_database_schema.sql`: Complete schema for dev database setup
- `integrations/supabase/client.ts`: Auto-switches between dev/prod based on environment
- `supabase/migrations/`: Version-controlled database migrations

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