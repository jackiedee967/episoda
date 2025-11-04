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
- **Profile Tab**: FloatingTabBar displays the user's profile picture instead of a generic icon, with circular styling (no border).
- **Episode Hub Page**: Redesigned to match Figma specifications with header (back button + search icon), episode/show tags, section title, episode info card with thumbnail, log button, divider, Friends/Everyone tabs, and sorted feed.
- **Post Page**: Fully redesigned to match Figma with custom back button, user info header, StarRatings component, clickable PostTags, engagement row with reactive updates, and comment input with token-styled upload/send buttons. All styling uses design tokens with proper accessibility labels.
- **Profile Page**: Completely redesigned with 4 sections matching Figma specs:
  - Section 1 (Profile Info): 127x127 rounded rectangle avatar, username in green P1-B centered, display name (Instrument Serif 25px), bio (max 308px width), dynamic social links row
  - Section 2 (Action Buttons): Edit/Settings/Help buttons with icons (owner view) or Follow button (visitor view)
  - Section 3 (Stats Grid): 2x2 wrapped flex layout with Episodes (Eye icon), Likes (Flame icon), Followers/Following (3 overlapping avatars + counts)
  - Section 4 (My Rotation): 3 most recent shows watched
  - EditProfileModal: Slide-up modal for editing profile pic, username, display name, bio, and social links with validation

### System Design Choices
- **Modular Structure**: Organized into logical directories for tabs, authentication, episodes, integrations, playlists, posts, settings, shows, and users.
- **Component-Based**: Reusable UI components are stored in the `components/` directory. Recently added: PostTags (episode/show tags with multiple states and colors), ButtonL (large button variant), Vector3Divider (horizontal divider), SearchDuotoneLine (search icon), StarRatings (consistent star rating display using Lucide icons and design tokens), EditProfileModal (profile editing interface), TabSelector (height: 100% fix for proper padding), Friends (mutual friends bar with variant system and greenHighlight username), FriendsInCommonModal (slide-up modal for viewing full mutual friends list).
- **Centralized Styling**: All styling uses a design token system to ensure consistency and maintainability.
- **Data Management**: React Context API is used for global state, and Supabase handles data persistence and real-time updates. Engagement actions (likes, reposts) trigger reactive UI updates through context subscriptions. DataContext includes helper functions for getting top followers/following by follower_count.
- **Development Environment**: Configured for Replit with specific port and host settings, and includes custom Babel plugins for editable components in development.

## Recent Changes (November 4, 2025)
- **Typography Update: Instrument Serif Font Implementation**
  - Installed `@expo-google-fonts/instrument-serif` package for titleXl and titleL typography tokens
  - Updated `titleXl` and `titleL` in `styles/tokens.ts` to use `'InstrumentSerif_400Regular'` font family (previously Funnel Display)
  - Font weight changed from 700 to 400 to match Instrument Serif's regular weight
  - Loaded InstrumentSerif_400Regular and InstrumentSerif_400Regular_Italic in `app/_layout.tsx`
  - All title components (43px and 25px sizes) now render in Instrument Serif serif font
  - Note: Must use exact font variable name (`InstrumentSerif_400Regular`) not display name (`'Instrument Serif'`) for React Native font rendering

- **Help Desk Admin Features** - Admin announcement system and navigation fixes (November 3, 2025)
  - Created `config/admins.ts` with admin user ID list and `isAdmin()` helper function for temporary admin privileges
  - Fixed Help button navigation on profile pages to correctly route to `/settings/help`
  - Added admin-only "FROM THE TEAM" section at top of Help Desk page with horizontal scrolling announcement cards
  - Created `/settings/help/create-announcement` page for admin-only announcement posting
  - Updated Help Desk post creation button to use ButtonL component (green styling) for consistency
  - Admin announcements display in separate section with category "Admin Announcement"
  - Admin badge changed from "Admin" to "Team" for community posts by admins
  - Both community posts and admin announcements persist to `help_desk_posts` Supabase table
  - Admin check uses centralized config file; will be replaced with role-based auth when authentication is implemented

- **Friends in Common Component (FriendsInCommonBar)** - Following exact Figma code structure
  - Created Friends component with variant-based styling system (Small/Large, FriendsInCommonBar/FriendsWatchingBar)
  - Username text highlighted in greenHighlight color (e.g., "Jackie and 2 others follow" - "Jackie" is green)
  - Component hugs contents (no fixed width) for responsive sizing
  - Entire component is pressable/clickable with TouchableOpacity wrapper
  - Created FriendsInCommonModal - slide-up modal displaying full list of mutual friends
  - Modal features user avatars, names, bios, and navigation to friend profiles
  - Displays centered below bio on other users' profiles when mutual friends exist
  - Integrated haptic feedback on press
  - Text parsing logic handles multi-word names, hyphens, and special characters correctly

## Previous Changes (October 30, 2025)
- **RESOLVED: DataContext stability issue fixed with state/actions/selectors architecture**
  - **Original Problem**: App experiencing instability where different memoization strategies caused different pages to break:
    - No useMemo on contextValue → Home + Search work, Profile + Friend Activity blank
    - useMemo with state-only deps → All pages blank (stale closures)
    - useMemo with all deps → Would cause circular dependencies/excessive re-renders
  - **Root Causes** (identified by architect):
    1. Mixed architecture: Provider value combined mutable state, derived collections, and callbacks in single object
    2. Removing useMemo propagated fresh object identities causing re-renders; adding useMemo created stale closures
    3. Callbacks closed over transient data/other callbacks, creating circular dependencies
    4. Derived data recomputed eagerly, causing render storms when dependencies changed
  - **Solution Implemented**: Comprehensive state/actions/selectors refactor
    - **State Layer**: Memoized object containing all raw state slices (posts, reposts, playlists, userData, currentUserData, isLoading, authUserId)
    - **Selectors Layer**: Memoized derived data and read operations (currentUser, allReposts, getWatchHistory, isShowInPlaylist, getPost, hasUserReposted, getUserReposts, isFollowing)
    - **Actions Layer**: Memoized action callbacks, all using functional updates (setPosts(prev => ...)) to avoid stale closures
    - **Provider Value**: Final assembly using useMemo with dependencies on the three stable layers
  - **Additional Fixes**:
    - Fixed `allReposts` to filter out invalid user lookups
    - Added defensive checks in Home/Friend Activity for repost filtering
    - Updated all state setters to use functional updates consistently
    - Removed state dependencies from action callback dependency arrays
    - Cloned arrays before sorting to prevent state mutation
  - **Result**: ✅ All four tabs (Home, Friend Activity, Profile, Search) now render consistently and reliably across all memoization scenarios
  - **Testing**: Verified all pages load without blank screens or crashes; data flows correctly through the layered architecture

## Previous Changes (October 28, 2025)
- Fixed TabSelector component to use height: 100% instead of fixed 34px, improving padding across all toggle tab bars site-wide
- Completed Profile page redesign with all 4 sections matching Figma specifications
- Created EditProfileModal component with full profile editing functionality
- Added getTopFollowers() and getTopFollowing() helper functions to DataContext for avatar previews
- Wired profile page data loading to display real episode counts, like counts, follower counts, and avatar overlays
- Implemented Watch History feature for Profile Shows tab:
  - Created WatchHistoryCard component showing show poster, title, most recent episode, progress bar, and episode count
  - Added getWatchHistory() function to DataContext that groups posts by show and calculates progress
  - Watch history sorted by most recently logged activity
- Fixed Playlist tab errors by ensuring all playlist objects include the required showCount property:
  - Updated loadPlaylists, createPlaylist, addShowToPlaylist, and removeShowFromPlaylist functions
  - Fixed data filtering bug in getWatchHistory (post.user.id vs post.userId)
  - Added missing Episode type import to DataContext

## External Dependencies
- **Supabase**: Used for database, authentication, and real-time functionalities.
- **Expo**: Core framework for React Native development.
- **AsyncStorage**: Local storage for session persistence.
- **expo-symbols**: For UI icons.
- **lucide-react-native**: For UI icons (Edit, Settings, HelpCircle, Eye, Flame, EyeOff, Instagram, Music, Globe).
- **react-native-phone-number-input**: (Mobile only) For phone number input formatting.
- **LinearGradient**: For gradient backgrounds.
