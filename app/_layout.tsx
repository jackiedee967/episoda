
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
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import "react-native-reanimated";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SystemBars } from "react-native-edge-to-edge";
import { colors } from "@/styles/commonStyles";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isConnected } = useNetworkState();

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
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
