
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
import { useColorScheme, Alert } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
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
  }, [session, segments, navigationState?.key, hasNavigated]);

  // Reset hasNavigated when session changes
  useEffect(() => {
    setHasNavigated(false);
  }, [session]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isConnected } = useNetworkState();
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
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
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
            <StatusBar style="auto" />
            <SystemBars style="auto" />
          </WidgetProvider>
        </DataProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
