# Natively (EPISODA) - TV Show Social Media App

## Overview
Natively (EPISODA) is a social media application built with Expo and React Native, designed for TV show enthusiasts. It enables users to share their watching experiences, create show playlists, follow friends, and engage through posts, likes, comments, and reposts. The project aims to create a vibrant community around TV show discussions and recommendations.

## User Preferences
I prefer iterative development, focusing on one feature or fix at a time. Please ask for confirmation before making large-scale changes or refactoring. I value clear, concise explanations and prefer to focus on high-level architectural decisions and critical features rather than minor implementation details. Do not make changes to files related to authentication without explicit instruction.

## System Architecture

### UI/UX Decisions
The application features a pixel-perfect UI overhaul, matching Figma specifications. It utilizes a comprehensive design token system for consistent styling, including colors, typography, and spacing. Gradient backgrounds (purple-to-orange) are used for visual consistency across key pages. Components like SortDropdown, FriendsWatchingModal, and various cards are meticulously styled according to design tokens.

### Technical Implementations
- **Framework**: Expo Router v6 (React Native 0.81.4, React 19.1.0)
- **Backend**: Supabase (authentication, database, real-time)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API
- **Styling**: StyleSheet API with a centralized design token system (`styles/tokens.ts`)
- **Authentication**: Supabase Auth (phone OTP, Apple Sign-In)
- **Platform Adaptations**: Configured for iOS, Android, and Web with platform-specific adjustments for features like phone input and authentication.

### Feature Specifications
- **Social Features**: Posting about TV shows, liking, commenting, reposting, following users, friend activity feed, user profiles.
- **TV Show Management**: Show and episode pages, playlists, watch history tracking, recommended titles.
- **Progress Tracking**: Dynamic episode progress bar on Show Hub, showing most recently logged episodes and percentage completion.
- **UI Enhancements**: Relative time display for posts, refined progress bar visibility, accurate episode counts based on logged data, standardized "S# E#" episode formatting.
- **Friends Tab Logic**: Displays posts from followed users AND the current user's own posts.
- **Post-Creation Navigation**: Users are automatically navigated to their newly created post.
- **Navigation Highlighting**: FloatingTabBar treats show pages (`/show/[id]`) as part of the home route, keeping the home icon highlighted (black) when viewing show pages.

### System Design Choices
- **Modular Structure**: Organized into logical directories for tabs, authentication, episodes, integrations, playlists, posts, settings, shows, and users.
- **Component-Based**: Reusable UI components are stored in the `components/` directory.
- **Centralized Styling**: All styling uses a design token system to ensure consistency and maintainability.
- **Data Management**: React Context API is used for global state, and Supabase handles data persistence and real-time updates.
- **Development Environment**: Configured for Replit with specific port and host settings, and includes custom Babel plugins for editable components in development.

## External Dependencies
- **Supabase**: Used for database, authentication, and real-time functionalities.
- **Expo**: Core framework for React Native development.
- **AsyncStorage**: Local storage for session persistence.
- **expo-symbols**: For UI icons.
- **lucide-react-native**: For UI icons.
- **react-native-phone-number-input**: (Mobile only) For phone number input formatting.
- **LinearGradient**: For gradient backgrounds.