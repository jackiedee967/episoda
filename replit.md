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
- **Redesigned Pages**: Welcome screen, Phone Number Entry screen, Episode Hub, Post Page, and Profile Page are fully redesigned to match Figma specifications.
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
  - **TVMaze API**: Secondary source for posters and episode thumbnails (20 requests/10s rate limit)
  - **Search Enrichment System**: Background worker that enhances search results with complete metadata
    - **Throttled Parallel Fetching**: Max 4 concurrent API requests to respect rate limits
    - **Progressive Enhancement**: Displays basic results immediately, enriches with seasons/posters in background
    - **Smart Caching**: Only caches successful enrichments; failed attempts can retry
    - **Error Propagation**: API failures don't get cached, enabling automatic retry on next search
    - **TVMaze Integration**: Returns both poster URL and TVMaze ID for downstream episode fetching
  - **Database Persistence**: Shows and episodes saved to Supabase before post creation for consistency
  - **Search-to-Hub Flow**: Simplified single-source-of-truth architecture
    - **Search Screen**: Fetches from Trakt → Enriches with poster/seasons → Saves to Supabase → Navigates with DB ID
    - **ShowHub Screen**: Reads from Supabase only (no client-side Trakt fallback)
    - **Design Decision**: Eliminates redirect loops, state mismatches, and stuck spinners by removing complex hydration logic
    - **Error Handling**: ShowHub displays clean "Show not found" error if database lookup fails
    - **Tech Debt**: Episodes and friends watching still use mock data (to be implemented separately)
  - **PostModal Flow**: Search → Select show → Fetch episodes → Validate metadata → Save to DB → Create post
  - **Error Handling**: Pre-save validation alerts users if episode metadata incomplete (specials/unaired episodes)
- **Mock User Seeding**: Database seeding script (`scripts/seedMockUsers.ts`) creates 4 real mock users (jackie, max, mia, liz) in development database with auto-generated avatars and follow relationships. Run via `npm run seed:mock-users`. Requires `SUPABASE_SERVICE_ROLE_KEY` environment variable.
- **Account Management**: Implemented account deletion via Supabase Edge Functions and a phone number change feature for SMS-authenticated users.
- **Robust Authentication**: Addressed OTP verification race conditions and username persistence bugs for a smoother onboarding experience.

## External Dependencies
- **Supabase**: Database, authentication, and real-time functionalities.
- **Trakt API**: TV show metadata (TRAKT_CLIENT_ID, TRAKT_CLIENT_SECRET required)
- **TVMaze API**: Show posters and episode thumbnails (no auth required, rate limited to 20 requests/10s)
- **Expo**: Core framework for React Native development.
- **AsyncStorage**: Local storage for session persistence.
- **expo-symbols**: UI icons.
- **lucide-react-native**: UI icons (Edit, Settings, HelpCircle, Eye, Flame, EyeOff, Instagram, Music, Globe).
- **react-native-phone-number-input**: (Mobile only) Phone number input formatting.
- **LinearGradient**: Gradient backgrounds.
- **@expo-google-fonts/instrument-serif**: Custom font for typography.