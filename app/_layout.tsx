
import { WidgetProvider } from "@/contexts/WidgetContext";
import { DataProvider } from "@/contexts/DataContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NavigationDirectionProvider } from "@/contexts/NavigationDirectionContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Button from "@/components/Button";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { useColorScheme, Alert, Platform, Text, TextInput } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import {
  FunnelDisplay_300Light,
  FunnelDisplay_400Regular,
  FunnelDisplay_500Medium,
  FunnelDisplay_600SemiBold,
  FunnelDisplay_700Bold,
} from '@expo-google-fonts/funnel-display';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import "react-native-reanimated";
import { Stack, router, useSegments, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SystemBars } from "react-native-edge-to-edge";
import { colors } from "@/styles/commonStyles";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function AuthNavigator() {
  const { session, user, isLoading, authReady, onboardingStatus } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key || isLoading || !authReady) {
      return;
    }

    // Wait for router to mount segments before redirecting (prevents blank screen on web)
    if (!segments.length) {
      return;
    }

    const STATUS_ROUTE_MAP: Record<string, { allowed: string[]; required: string }> = {
      'not_started': { allowed: ['index', 'phone-entry'], required: '/auth' },
      'phone_verified': { allowed: ['phone-entry', 'verify-otp', 'username-select'], required: '/auth/username-select' },
      'username_set': { allowed: ['display-name'], required: '/auth/display-name' },
      'display_name_set': { allowed: ['birthday-entry'], required: '/auth/birthday-entry' },
      'birthday_set': { allowed: ['onboarding-carousel', 'select-shows'], required: '/auth/onboarding-carousel' },
      'shows_selected': { allowed: ['select-shows'], required: '/auth/select-shows' },
      'completed': { allowed: [], required: '/(tabs)/' },
    };

    const inAuthGroup = segments[0] === 'auth';
    const inTabGroup = segments[0] === '(tabs)';
    const currentAuthScreen = segments[1] || 'index';
    
    if (!session) {
      if (!inAuthGroup) {
        console.log('🔒 No session - redirecting to splash');
        router.replace('/auth' as any);
      }
      return;
    }

    const statusConfig = STATUS_ROUTE_MAP[onboardingStatus];
    if (!statusConfig) {
      console.log('⚠️ Unknown onboarding status:', onboardingStatus);
      return;
    }

    if (inTabGroup && onboardingStatus !== 'completed') {
      console.log('⚠️ Onboarding incomplete - blocking tab access, redirecting to:', statusConfig.required);
      router.replace(statusConfig.required as any);
      return;
    }

    if (onboardingStatus === 'completed') {
      // Allow access to public pages like show, user, post, episode, playlist etc
      const publicPages = ['show', 'user', 'post', 'episode', 'playlist'];
      const isPublicPage = publicPages.includes(segments[0] as string);
      
      if (!inTabGroup && !isPublicPage && inAuthGroup) {
        console.log('✅ Onboarding complete - redirecting to home');
        router.replace('/(tabs)/' as any);
      }
      return;
    }

    if (inAuthGroup && !statusConfig.allowed.includes(currentAuthScreen)) {
      console.log(`🔄 Status=${onboardingStatus}, screen=${currentAuthScreen} not allowed. Redirecting to:`, statusConfig.required);
      router.replace(statusConfig.required as any);
    }
  }, [session, onboardingStatus, segments, navigationState?.key, isLoading, authReady]);

  return null;
}

// Custom dark theme with proper fonts configuration
const EpisodaDarkTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    regular: {
      fontFamily: 'FunnelDisplay_400Regular',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'FunnelDisplay_400Regular',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'FunnelDisplay_700Bold',
      fontWeight: '700' as const,
    },
    heavy: {
      fontFamily: 'FunnelDisplay_700Bold',
      fontWeight: '900' as const,
    },
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = Platform.OS === 'web' ? { isConnected: true } : useNetworkState();
  const { isConnected } = networkState;

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    FunnelDisplay_300Light,
    FunnelDisplay_400Regular,
    FunnelDisplay_500Medium,
    FunnelDisplay_600SemiBold,
    FunnelDisplay_700Bold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider value={EpisodaDarkTheme}>
          <AuthProvider>
            <DataProvider>
              <WidgetProvider>
                <NavigationDirectionProvider>
                <AuthNavigator />
                <Stack
              screenOptions={{
                animation: "slide_from_right",
                headerShown: true,
                headerStyle: {
                  backgroundColor: colors.background,
                },
                headerTintColor: colors.text,
                headerBackTitle: "Back",
                gestureEnabled: true,
                gestureDirection: "horizontal",
                headerTitleStyle: {
                  fontFamily: 'FunnelDisplay_700Bold',
                },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen 
                name="auth/index" 
                options={{ 
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="auth/phone-entry" 
                options={{ 
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="auth/phone-number" 
                options={{ 
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="auth/verify-otp" 
                options={{ 
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="auth/username-select" 
                options={{ 
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="auth/birthday-entry" 
                options={{ 
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="auth/onboarding-carousel" 
                options={{ 
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="auth/display-name" 
                options={{ 
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="auth/select-shows" 
                options={{ 
                  headerShown: false,
                }} 
              />
              <Stack.Screen 
                name="show/[id]" 
                options={{ 
                  headerShown: true,
                  title: "Show",
                }} 
              />
              <Stack.Screen 
                name="episode/[id]" 
                options={{ 
                  headerShown: true,
                  title: "Episode",
                }} 
              />
              <Stack.Screen 
                name="post/[id]" 
                options={{ 
                  headerShown: true,
                  title: "Post",
                }} 
              />
              <Stack.Screen 
                name="user/[id]" 
                options={{ 
                  headerShown: true,
                  title: "Profile",
                }} 
              />
              <Stack.Screen
                name="modal"
                options={{
                  presentation: "modal",
                }}
              />
              <Stack.Screen
                name="formsheet"
                options={{
                  presentation: "formSheet",
                }}
              />
              <Stack.Screen
                name="transparent-modal"
                options={{
                  presentation: "transparentModal",
                  animation: "fade",
                }}
              />
              </Stack>
                <StatusBar style="light" />
                <SystemBars style="light" />
                </NavigationDirectionProvider>
              </WidgetProvider>
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
