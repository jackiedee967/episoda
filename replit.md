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
  - **TVMaze API**: Secondary source for posters and episode thumbnails (20 requests/10s rate limit)
  - **Database Persistence**: Shows and episodes saved to Supabase before post creation for consistency
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