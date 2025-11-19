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
- **Authentication**: Supabase Auth (phone OTP, Apple Sign-In) with a 7-screen onboarding flow.
- **Architecture**: Comprehensive state/actions/selectors refactor for improved data flow stability.

### Feature Specifications
- **Social Features**: Posting, liking, commenting (4-tier recursive nesting), reposting, following, friend activity feed, user profiles, "You May Know" suggestions with mutual friends.
- **TV Show Management**: Show/episode pages, playlists, watchlist, watch history, personalized recommended titles, dynamic episode progress bar, and "Currently Watching" section for quick logging. Includes a production-grade rating conversion system and a robust poster fallback chain.
- **Authentication Flow**: Robust 7-screen onboarding with progressive data collection and authentication guards.
- **UI Enhancements**: Relative time display, refined progress bar, accurate episode counts, standardized episode formatting, navigation highlighting, custom profile tab display.
- **Redesigned Pages**: Welcome, Phone Number Entry, Episode Hub, Post Page, Profile Page, and Show Hub are fully redesigned.
- **Modular & Component-Based**: Organized into logical directories with reusable UI components.
- **PostModal Flow**: Guides users through selecting a show, fetching/validating episodes, saving to DB, creating a post, and redirecting. Supports custom tags and a half-star rating system with tap and drag gestures.
- **Account Management**: Account deletion and phone number change features.

### System Design Choices
- **Development vs Production**: Separate Supabase instances.
- **Data Management**: All mock data removed, users interact only with real Supabase data. Supabase-backed user profile cache.
- **TV Show Data Integration**: Utilizes multiple APIs (Trakt, TMDB, OMDB, TVMaze) with a robust fallback system for metadata, posters, and episode thumbnails.
- **Search Enrichment System**: Background worker enhances search results with complete metadata using throttled parallel fetching, progressive enhancement, and smart caching.
- **Database Persistence**: Shows and episodes saved to Supabase before post creation, with robust UUID management for playlist integrity.
- **Performance Optimizations**: Database-first approach for episode loading, lazy loading of seasons, background loading for remaining seasons, smart season logic, and optimized queries for community and friend feeds.
- **Smart Show Recommendations**: Personalized recommendation system using user posts, genre interests, and trending shows with an instant-loading caching system, including friend-based recommendations.
- **API Reliability**: Comprehensive Trakt API health check and database fallback system for zero-downtime operation.
- **Database Schema**: `profiles`, `posts`, `shows`, `episodes`, `playlists`, `playlist_shows`, `likes`, `reposts`, `comments`, `follows`, `post_episodes`, `social_links`, `help_desk_posts`.

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