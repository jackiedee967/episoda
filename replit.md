# Natively (EPISODA) - TV Show Social Media App

## Overview
Natively (also known as EPISODA) is a social media application focused on TV show discussions and recommendations. Built with Expo and React Native, it allows users to share their TV watching experiences, create playlists, follow other users, and interact through posts, likes, comments, and reposts.

## Project Status
- **Last Updated**: October 27, 2025
- **Current State**: UI overhaul in progress - Homepage redesigned to match Figma pixel-perfectly, core functionality fixes completed
- **Platform**: Expo React Native (iOS, Android, and Web)

## Technology Stack
- **Framework**: Expo Router v6 (React Native 0.81.4, React 19.1.0)
- **Backend**: Supabase (authentication, database, real-time features)
- **UI Components**: React Native, expo-symbols, lucide-react-native
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API (DataContext, WidgetContext)
- **Local Storage**: AsyncStorage
- **Authentication**: Supabase Auth (phone OTP and Apple Sign-In on native platforms)
- **Styling**: StyleSheet API with common styles and color constants

## Recent Changes

### Friends Tab Filter & Post Navigation Fixes (October 27, 2025)
Fixed two critical user experience issues:

1. **Friends Tab Filter Enhancement**
   - Updated Show Hub and Episode Hub to include user's own posts in Friends tab
   - Changed filter from `isFollowing(post.user.id)` to `post.user.id === currentUser.id || isFollowing(post.user.id)`
   - Users now see their own posts alongside posts from people they follow
   - Applies to both Show Hub and Episode Hub consistently

2. **Post Navigation After Creation**
   - PostModal now captures the created post object and passes post ID to onPostSuccess callback
   - Show Hub's handlePostSuccess receives post ID and navigates to `/post/${postId}`
   - After creating a post, users are automatically taken to view their new post
   - Modal closes smoothly during navigation transition
   - Backward compatible - onPostSuccess callback remains optional

3. **Technical Implementation**
   - Updated PostModal interface to accept `onPostSuccess?: (postId: string) => void`
   - Modified handlePost to capture return value from createPost
   - Updated Show Hub and Episode Hub to import currentUser from DataContext
   - No breaking changes to existing code (other PostModal usages unaffected)

### Show Progress Tracking Component (October 27, 2025)
Added dynamic episode progress tracking to Show Hub:

1. **ShowsEpisodeProgressBar Component**
   - New component displays real-time show watching progress
   - Shows most recently RELEASED logged episode (highest S#E# number among logged episodes)
   - Visual progress bar with green fill showing percentage of episodes logged
   - Episode count display (e.g., "24 / 120 episodes")
   - Clean fallback message "No episodes logged yet" when no episodes are logged
   - Uses design tokens exclusively (card background, card stroke, grey2 text, green highlight)
   
2. **Show Hub Integration**
   - Positioned above "Log an episode" button with 10px bottom margin
   - Dynamically calculates most recently released logged episode
   - Updates in real-time when episodes are logged via multi-select
   - Progress bar fills based on loggedEpisodeIds set
   - Integrates seamlessly with existing Show Hub functionality

3. **Component Features**
   - Props: episodeNumber, episodeTitle, loggedCount, totalCount
   - Progress percentage calculation (logged / total * 100)
   - Conditional rendering of episode info vs fallback text
   - Matches Figma specifications with 10pt/500 weight typography

### Show Hub & Episode Hub UI Improvements (October 24, 2025)
Pixel-perfect redesign of Show Hub and Episode Hub pages to match Figma specifications:

1. **Sort Dropdown Refinements**
   - Reduced dropdown size to exact Figma specs (82px width, 64px height)
   - Font size reduced to 8pt with 300 weight (Funnel Display)
   - Dropdown positioned directly below "Sort by" button using absolute positioning
   - Dark background (rgba(40, 40, 40, 1)) with card stroke border
   - Green highlight for active option, proper spacing (6px padding, 2px gaps)
   - Options: Recent (sorts by timestamp) and Hot (sorts by engagement)

2. **Friends Watching Modal**
   - Created `FriendsWatchingModal.tsx` component for showing friends watching a show
   - Modal opens when clicking "X friends watching" bar in Show Hub header
   - Displays list of friends with avatars, usernames, bios, and follow buttons
   - Integrates with DataContext for real-time follow/unfollow functionality
   - Slide-up animation with dark modal background

3. **Tab Filtering Functionality**
   - Friends tab: Shows posts from users you follow AND your own posts (updated October 27)
   - Everyone tab: Shows all posts from all users on the app
   - Episodes tab: Displays organized list of show episodes by season
   - Tab switching automatically adjusts default sort (Friends→Recent, Everyone→Hot)

4. **Gradient Background Consistency**
   - Applied purple-to-orange gradient background to Show Hub page
   - Applied same gradient background to Episode Hub page
   - Matches homepage gradient for consistent visual design across app
   - Uses Platform.select with web-specific CSS background-image

5. **Component Updates**
   - SortDropdown: Matches exact Figma specifications for size and styling
   - TabSelector: Proper 6px padding containing active button
   - FloatingTabBar: Added to Show Hub and Episode Hub for navigation
   - All components use design tokens (zero hardcoded values)

### Design Token System Implementation (October 23, 2025)
Comprehensive design token system replacing all hardcoded styles:

1. **Created `styles/tokens.ts` - Centralized Design System**
   - Parsed all colors from Figma design tokens JSON (27 colors total)
   - Typography system with complete font properties (12 text styles)
   - All colors reference exact Figma specifications (no hardcoded hex values)
   - Smart mapping utilities (mapColor, mapTypography, mapTypographyByName)
   - Handles Figma naming variations (e.g., 'Pure.White' → tokens.colors.pureWhite)
   - Unicode-aware normalization (handles en dashes, em dashes in Figma token names)

2. **Updated Entire Codebase to Use Tokens**
   - **styles/commonStyles.ts**: All color aliases now reference tokens (zero hardcoded values)
   - **13 components updated**: PostModal, PostCard, FloatingTabBar, LogAShow, PlaylistModal, SettingsModal, ShowCard, PostButton, CommentCard, FollowButton, ListItem, BlockReportModal
   - **2 pages updated**: Homepage (index.tsx), Search (search.tsx)
   - All hardcoded hex colors (#XXXXXX) replaced with token references
   - Typography spreads replace individual font properties where applicable

3. **Design Token Features**
   - **Colors**: pageBackground (#0E0E0E), greenHighlight (#8BFC76), 6 tab color variants, grey scale, strokes
   - **Typography**: titleXl (43px/700), titleL (25px/700), subtitle (17px/500), 9 additional text styles
   - **Type Safety**: TypeScript const assertions ensure tokens are immutable
   - **Error Handling**: mapColor() throws clear errors for unmapped colors
   - **Production Ready**: Architect-verified, maintainable, scalable system

4. **Homepage Complete Rebuild**
   - Purple-to-orange gradient header (#9333EA to #FF5E00) using LinearGradient
   - EPISODA logo and profile picture in header
   - Welcome section with user name in large title font
   - Post input card with pulsing green dot and green "Tell your friends" button
   - Recommended Titles horizontal scroll with show cards
   - Show cards display friend avatars and "X friends watching" text
   - You May Know section with user cards showing mutual friends
   - Friend Activity feed with properly styled post cards

5. **Component Updates**
   - Updated Button component with primary/secondary/outline/ghost variants
   - Updated PostCard to use Figma tab colors for episode and show tags
   - All components use design system tokens for consistent styling

### Replit Environment Setup (October 22, 2025)
1. **Configured Expo for web development**
   - Updated package.json scripts to run on port 5000
   - Added `WDS_SOCKET_PORT=0` environment variable for web socket compatibility
   - Configured workflow to serve the app on 0.0.0.0:5000

2. **Fixed React 19 Compatibility Issues**
   - Removed incompatible `Text.defaultProps` and `TextInput.defaultProps` modifications in `app/_layout.tsx`
   - Added Platform.OS check for `useNetworkState()` hook (returns mock data on web)
   - Conditionally excluded `react-native-phone-number-input` on web platform to avoid React 16 dependency conflicts
   - Implemented web-specific phone input using native TextInput component

3. **Web Platform Adaptations**
   - Added URL polyfill import in index.ts
   - Created web-compatible login screen with simplified phone number validation
   - Authentication flow temporarily disabled for easier development access

### Project Architecture
```
app/
├── (tabs)/          # Main tab navigation (home, search, notifications, profile)
├── auth/            # Authentication screens (login, verify-otp)
├── episode/         # Episode detail pages
├── integrations/    # Third-party integrations (Supabase)
├── playlist/        # Playlist pages
├── post/            # Post detail pages
├── settings/        # Settings and help pages
├── show/            # Show detail pages
├── user/            # User profile pages
└── _layout.tsx      # Root layout with auth management

components/          # Reusable UI components
contexts/            # React contexts for state management
data/                # Mock data for development
styles/              # Common styles and theme configuration
utils/               # Utility functions (error logging, etc.)
```

## Database Schema (Supabase)
The app uses the following main tables:
- **profiles**: User profile information
- **posts**: User posts/logs about TV shows
- **post_episodes**: Episodes associated with posts
- **post_tags**: Tags for categorizing posts
- **likes**: Post likes
- **comments**: Post comments and replies
- **reposts**: Post reposts
- **follows**: User follow relationships
- **playlists**: User-created playlists
- **playlist_shows**: Shows in playlists
- **watch_history**: User watch history
- **notifications**: User notifications
- **blocked_users**: Blocked user relationships
- **reports**: User reports

## Running the Application

### Development Server
```bash
npm run dev
```
The app will be available at http://localhost:5000

### Building for Web
```bash
npm run build:web
```

### Platform-Specific Commands
```bash
npm run ios      # Run on iOS simulator
npm run android  # Run on Android emulator
npm run web      # Run web version
```

## Environment Configuration

### Replit-Specific Settings
- **Port**: 5000 (required by Replit)
- **Host**: 0.0.0.0 (configured in workflow)
- **Telemetry**: Disabled (EXPO_NO_TELEMETRY=1)

### Supabase Configuration
Located in `app/integrations/supabase/client.ts`:
- **URL**: https://mbwuoqoktdgudzaemjhx.supabase.co
- **Key**: Public anon key (embedded in code)
- **Storage**: AsyncStorage for session persistence

## Key Features
1. **User Authentication**
   - Phone number authentication with 2FA (mobile only)
   - Apple Sign-In (iOS only)
   - Protected routes with automatic redirects

2. **Social Features**
   - Post about TV shows with episode tags
   - Like, comment, and repost functionality
   - Follow other users
   - Friend activity feed
   - User profiles with stats

3. **TV Show Features**
   - Show and episode pages
   - Playlists
   - Watch history tracking
   - Recommended titles

4. **Settings & Support**
   - Account settings
   - Notification preferences
   - Help center with community posts

## Known Limitations

### Web Platform
- Phone number input uses simplified validation (no country picker)
- Apple Sign-In not available on web
- Some React Native animations fall back to JS-based implementation
- Authentication temporarily disabled for development

### Mobile Platforms
- Phone authentication requires SMS provider configuration in Supabase
- Apple Sign-In requires iOS 13+ and proper App ID configuration

## Development Notes

### Important Files
- `index.ts`: Entry point with polyfills
- `app/_layout.tsx`: Root layout with auth state management
- `app/auth/login.tsx`: Login screen (platform-aware)
- `metro.config.js`: Metro bundler configuration
- `babel.config.js`: Babel configuration with custom plugins

### Custom Babel Plugins
The project includes custom Babel plugins for editable components (development mode):
- `babel-plugins/editable-elements.js`
- `babel-plugins/inject-source-location.js`
- Enabled via `EXPO_PUBLIC_ENABLE_EDIT_MODE` environment variable

### Mock Data
Located in `data/mockData.ts` - used when no authenticated user is present.

## Troubleshooting

### App Shows Blank Screen
- Check browser console for errors
- Verify Metro bundler is running and bundle compiled successfully
- Clear Metro cache: remove `.expo` and `node_modules/.cache` directories

### Phone Authentication Not Working
- Ensure Supabase phone provider is enabled
- Configure SMS provider in Supabase Dashboard
- Check phone number format includes country code (e.g., +1 555 123 4567)

### Package Installation Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

## Deployment
The app is configured for Replit deployment:
- **Target**: autoscale (serverless)
- **Build**: `npm run build:web`
- **Run**: `npm run web`

## Support & Documentation
- Original documentation files available in project root (AUTHENTICATION_IMPLEMENTATION.md, DATABASE_SETUP_INSTRUCTIONS.md, etc.)
- Supabase setup required for full functionality
- Check console logs for debugging information
