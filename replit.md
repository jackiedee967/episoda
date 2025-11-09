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

## Database & User Data Management

### Development vs Production
- **Development Database**: Separate Supabase instance for testing and development (current environment)
- **Production Database**: Separate Supabase instance for live users (when deployed via Replit publish)
- These environments are completely isolated - changes in dev will never affect production users
- Real users who sign up on the published app will NOT appear in the dev database

### Real Users vs Mock Data
- **Real Users**: Authentication flow now creates actual user profiles in Supabase `profiles` table
- **Mock Users**: Pre-seeded demo accounts remain in database for feature testing/development
- When logged in with a real account, you see your own authentic data
- Mock users continue to be visible for testing social features

### Recent Changes (November 2025)
- Fixed signup flow: Phone OTP verification now properly creates user profiles in Supabase
- `verify-otp.tsx` updated to use `AuthContext.verifyOTP` function for profile creation
- Username and birthday are saved to the `profiles` table during onboarding
- Age validation enforced at 13+ years minimum
- Birthday format changed from DD/MM/YYYY to MM/DD/YYYY (American standard)
- Moved auth components from `app/auth/_components/` to `components/auth/` to prevent Expo Router treating them as routes
- Removed setTimeout delay from AuthNavigator for immediate auth redirects
- DataContext now loads authenticated user's actual profile data via `loadCurrentUserProfile` function
- Added `/auth/reset` page to clear all cached sessions (localStorage, AsyncStorage, Supabase session)
- Added "Trouble signing in? Reset session" button on splash screen for easy session reset during development/testing

## Safe Deployment Checklist

### Pre-Deployment Checklist
Before pushing any update to production:
- [ ] Test all changes thoroughly in dev environment
- [ ] Verify signup/login still works correctly
- [ ] Check that existing user accounts aren't broken
- [ ] Backup production database (automatic in Supabase)
- [ ] Test on real device (iOS/Android), not just simulator
- [ ] Review database migrations for safety

### Database Migration Safety
- **Always additive**: Add new columns/tables, don't delete immediately
- **Backup first**: Supabase maintains automatic backups
- **Test on dev**: Run migrations in dev environment first
- **Low-traffic timing**: Deploy during off-peak hours
- **Rollback ready**: Know how to restore from backup if needed

### App Deployment Options

**Over-the-Air Updates (Expo EAS Update)**
- Use for: Bug fixes, UI changes, feature updates (JS/React Native code)
- Benefits: Instant deployment, no App Store approval needed
- Users get updates automatically in background
- Use this for 90% of updates

**Full App Store Submission (EAS Build)**
- Use for: Native code changes, new permissions, major versions
- Process: 1-3 days for Apple review
- Required only for significant runtime changes

### Feature Flags
- Toggle features on/off without redeployment
- Gradual rollout strategy (10% → 50% → 100% of users)
- Quick rollback if issues arise

### Rollback Procedures
**Database**: Restore from Supabase automatic backup
**App**: 
  - Expo: Instantly revert to previous OTA update
  - App Store: Re-submit previous version (takes 1-3 days)

### Monitoring Post-Deployment
- Watch for error logs in Supabase
- Monitor user reports/feedback
- Check authentication success rates
- Verify new signups are working

## Notes for Future Development
- Deployment safety procedures managed by AI assistant
- Follow checklist before each production push
- Maintain separate dev/prod Supabase projects
- Never test experimental features on production database