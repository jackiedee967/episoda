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
- **Real Users**: Authentication flow creates actual user profiles in Supabase `profiles` table
- **NO MOCK DATA**: All mock data removed from DataContext - users only see real Supabase data
- **Empty State**: Signed-out users see empty state (no fake content)
- **User Profile Cache**: Supabase-backed cache automatically loads user profiles for posts and reposts

### Recent Changes (November 2025)
- **NEW: Display Name Selection Flow** (November 10, 2025)
  - Added new display name selection screen after username selection in phone signup flow
  - Flow for phone signups: verify-otp → username-select → display-name → birthday-entry → onboarding-carousel → complete
  - Apple Sign-In users automatically skip display-name screen if Apple provides full_name in user_metadata
  - Updated OnboardingStatus type to include 'display_name_set' status
  - Created `setDisplayName()` method in AuthContext for updating display names (1-50 characters)
  - Updated STATUS_ROUTE_MAP in _layout.tsx to route users through new display-name screen
  - `ensureProfileExists()` function extracts display_name from Apple OAuth user_metadata
  - username-select.tsx intelligently routes to display-name for phone users or birthday-entry for Apple users
  - Display name validation: 1-50 characters, required field
- Fixed signup flow: Phone OTP verification now properly creates user profiles in Supabase
- `verify-otp.tsx` updated to use `AuthContext.verifyOTP` function for profile creation
- Username and birthday are saved to the `profiles` table during onboarding
- Age validation enforced at 13+ years minimum
- Birthday format changed from DD/MM/YYYY to MM/DD/YYYY (American standard)
- Moved auth components from `app/auth/_components/` to `components/auth/` to prevent Expo Router treating them as routes
- Removed setTimeout delay from AuthNavigator for immediate auth redirects
- **CRITICAL FIX - Real Profile Data After Sign-In**: DataContext now watches AuthContext.user via useEffect hook
  - Uses `const { user } = useAuth()` to access AuthContext state (single source of truth)
  - When user becomes non-null → automatically calls `loadCurrentUserProfile(user.id)` + `loadFollowDataFromSupabase(user.id)`
  - When user becomes null → resets state to mockCurrentUser and mock data
  - Removed broken `supabase.auth.onAuthStateChange` subscription that never fired properly
  - This fixes the bug where users would complete authentication but continue seeing mock data instead of their real profile
- **CRITICAL FIX - Sign Out**: AuthContext.signOut() now clears local state immediately before calling Supabase
  - Sequence: (1) setSession(null), setUser(null) (2) reset onboarding status (3) clear AsyncStorage (4) call supabase.auth.signOut()
  - Prevents race condition where UI would lag on sign-out
  - Settings page sign-out button now calls real signOut() function (was previously broken alert-only)
- Added `/auth/reset` page with double-clear approach: clears storage before AND after signOut to prevent Supabase session rehydration
- Reset flow uses window.location.href for hard page reload on web, ensuring complete session wipe
- Added "Trouble signing in? Reset session" button on splash screen for easy session reset during development/testing
- Added back button to username selection page that triggers reset flow, allowing users to escape cached session loops
- Fixed reset bug where users were redirected back to username page due to cached Supabase session data
- **CRITICAL FIX - Removed All Mock Data**: Completely eliminated mock data from DataContext
  - Removed mockPosts, mockCurrentUser, mockUsers, mockEpisodes imports and usage
  - Initial state now uses empty arrays and EMPTY_USER object (no mock fallbacks)
  - Added Supabase-backed userProfileCache that automatically loads user profiles for posts and reposts
  - Created loadUserProfiles() function for batch-fetching user profiles from Supabase
  - allReposts now uses userProfileCache instead of mockUsers
  - getFollowers/getFollowing/getTopFollowers/getTopFollowing return empty arrays on Supabase failure (no mock fallback)
  - getWatchHistory uses logged episode count instead of mockEpisodes
  - Sign-out clears userProfileCache along with all other state
  - Result: Users only see real Supabase data - no fake content at any point
- **CRITICAL FIX - Username Persistence Bug**: Fixed verifyOTP overwriting usernames with blank values (November 2025)
  - Changed verifyOTP from INSERT to UPSERT with ignoreDuplicates: true
  - Prevents re-insertion of profile with blank username/display_name after user has set them
  - Fixed RLS permission issue where existingProfile check would fail and re-insert blank data
  - Username and display_name now persist correctly through entire onboarding flow
  - Users can no longer reuse the same username multiple times (uniqueness enforced)
- **NEW: Auto-Generated Profile Pictures** (November 10, 2025)
  - Every new user automatically receives a unique auto-generated profile picture upon signup
  - **17 SVG Icons**: Stored in `assets/profile-icons/` (ellipses, flowers, moons, diamonds, crosses, blocks, stars, sparkles, wheels)
  - **7 Color Schemes**: Each with icon color and background color (pink, magenta, blue, green, purple, orange, red)
  - **Database Storage**: Avatar configuration stored in `profiles` table via `avatar_color_scheme` (1-7) and `avatar_icon` columns
  - **Generation Logic**: `utils/profilePictureGenerator.ts` randomly selects color scheme + icon
  - **Auth Integration**: `assignRandomAvatar()` called asynchronously (fire-and-forget) after profile creation in both `verifyOTP()` (phone) and `ensureProfileExists()` (Apple Sign-In)
  - **Non-Blocking**: Avatar assignment failures are logged but never block signup completion
  - **Future Upgrade Path**: Icons can be pre-rendered to PNG and uploaded to Supabase Storage bucket `profile-pictures` for faster loading
  - **Migration Required**: Run `supabase/migrations/001_initial_schema.sql` in Supabase dashboard to add avatar columns and storage bucket
- **NEW: Account Deletion Feature** (November 10, 2025)
  - Users can permanently delete their accounts from Account Settings page
  - **Two-confirmation flow**: Double dialog confirmation prevents accidental deletion
  - **Edge Function**: Uses Supabase Edge Function (`delete-account`) with service-role access to delete auth users
  - **CASCADE cleanup**: Database automatically removes all related data (posts, likes, comments, reposts, follows, social_links) when profile is deleted
  - **Client flow**: `AuthContext.deleteAccount()` → edge function → clear local state → redirect to splash
  - **Deployment Required**: Deploy edge function via `supabase functions deploy delete-account` (see `supabase/functions/README.md`)
- **NEW: Phone Number Change Feature** (November 10, 2025)
  - SMS users can change their phone number from Account Settings
  - **Two-step OTP verification**: Enter new number → receive code → verify → update complete
  - **Built-in Supabase flow**: Uses `updateUser({ phone })` and `verifyOtp({ type: 'phone_change' })`
  - **Error handling**: Prevents duplicate phone numbers, validates OTP codes, shows clear error messages
  - **Apple Sign-In users**: Feature is disabled (not applicable for OAuth users)

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