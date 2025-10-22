# Natively (EPISODA) - TV Show Social Media App

## Overview
Natively (also known as EPISODA) is a social media application focused on TV show discussions and recommendations. Built with Expo and React Native, it allows users to share their TV watching experiences, create playlists, follow other users, and interact through posts, likes, comments, and reposts.

## Project Status
- **Last Updated**: October 22, 2025
- **Current State**: Running in Replit web development environment
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

## Recent Changes (October 22, 2025)

### Replit Environment Setup
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
