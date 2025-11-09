# Natively (EPISODA) - TV Show Social Media App

## Overview
Natively (EPISODA) is a social media application built with Expo and React Native, designed for TV show enthusiasts. It enables users to share their watching experiences, create show playlists, follow friends, and engage through posts, likes, comments, and reposts. The project aims to create a vibrant community around TV show discussions and recommendations, fostering a dedicated platform for TV show discussions and recommendations.

## User Preferences
I prefer iterative development, focusing on one feature or fix at a time. Please ask for confirmation before making large-scale changes or refactoring. I value clear, concise explanations and prefer to focus on high-level architectural decisions and critical features rather than minor implementation details. Do not make changes to files related to authentication without explicit instruction.

## System Architecture

### UI/UX Decisions
The application features a pixel-perfect UI overhaul, matching Figma specifications, utilizing a comprehensive design token system for consistent styling (colors, typography, spacing). Gradient backgrounds are used for visual consistency. Components are meticulously styled according to design tokens.

### Technical Implementations
- **Framework**: Expo Router v6 (React Native 0.81.4, React 19.1.0)
- **Backend**: Supabase (authentication, database, real-time)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API
- **Styling**: StyleSheet API with a centralized design token system (`styles/tokens.ts`)
- **Authentication**: Supabase Auth (phone OTP, Apple Sign-In) with a comprehensive 7-screen onboarding flow. Configured for iOS, Android, and Web with platform-specific adjustments.
- **Architecture**: Comprehensive state/actions/selectors refactor for improved stability and reliability of data flow across the application.

### Feature Specifications
- **Social Features**: Posting, liking, commenting, reposting, following, friend activity feed, user profiles.
- **TV Show Management**: Show/episode pages, playlists, watch history, recommended titles, dynamic episode progress bar.
- **Authentication Flow**: 7-screen onboarding with progressive data collection and robust authentication guards ensuring proper onboarding completion.
- **UI Enhancements**: Relative time display, refined progress bar, accurate episode counts, standardized episode formatting, navigation highlighting, custom profile tab display (user's profile picture).
- **Redesigned Pages**: Episode Hub, Post Page, and Profile Page are fully redesigned to match Figma specifications, incorporating custom components, dynamic data display, and interactive elements.
- **Modular & Component-Based**: Organized into logical directories with reusable UI components and centralized styling using a design token system.

## External Dependencies
- **Supabase**: Database, authentication, and real-time functionalities.
- **Expo**: Core framework for React Native development.
- **AsyncStorage**: Local storage for session persistence.
- **expo-symbols**: UI icons.
- **lucide-react-native**: UI icons (Edit, Settings, HelpCircle, Eye, Flame, EyeOff, Instagram, Music, Globe).
- **react-native-phone-number-input**: (Mobile only) Phone number input formatting.
- **LinearGradient**: Gradient backgrounds.
- **@expo-google-fonts/instrument-serif**: Custom font for typography.