
import { WidgetProvider } from "@/contexts/WidgetContext";
import { DataProvider } from "@/contexts/DataContext";
import { Button } from "@/components/button";
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
  FunnelDisplay_400Regular,
  FunnelDisplay_700Bold,
} from '@expo-google-fonts/funnel-display';
import "react-native-reanimated";
import { Stack, router, useSegments, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SystemBars } from "react-native-edge-to-edge";
import { colors } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function useProtectedRoute(session: Session | null) {
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    // TEMPORARILY DISABLED - Authentication flow bypassed for development
    // Uncomment the code below to re-enable authentication
    
    /*
    // Wait for navigation to be fully ready
    if (!navigationState?.key) {
      console.log('Navigation not ready yet');
      return;
    }

    // Prevent multiple navigation attempts
    if (hasNavigated) {
      return;
    }

    const inAuthGroup = segments[0] === 'auth';
    console.log('Protected route check:', { session: !!session, inAuthGroup, segments });

    // Use setTimeout to ensure navigation happens after render
    const timeoutId = setTimeout(() => {
      if (!session && !inAuthGroup) {
        // Redirect to login if not authenticated
        console.log('Redirecting to login');
        router.replace('/auth/login');
        setHasNavigated(true);
      } else if (session && inAuthGroup) {
        // Redirect to home if authenticated and trying to access auth screens
        console.log('Redirecting to home');
        router.replace('/(tabs)');
        setHasNavigated(true);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
    */
    
    console.log('Authentication temporarily disabled - app accessible without login');
  }, [session, segments, navigationState?.key, hasNavigated]);

  // Reset hasNavigated when session changes
  useEffect(() => {
    setHasNavigated(false);
  }, [session]);
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
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    FunnelDisplay_400Regular,
    FunnelDisplay_700Bold,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session);
      setSession(session);
      setIsReady(true);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loaded && isReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isReady]);

  useProtectedRoute(session);

  if (!loaded || !isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={EpisodaDarkTheme}>
        <DataProvider>
          <WidgetProvider>
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
                name="auth/login" 
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
          </WidgetProvider>
        </DataProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
