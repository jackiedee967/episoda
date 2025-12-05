import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'none',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: Platform.OS === 'ios',
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        contentStyle: {
          backgroundColor: 'transparent',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: 'Home',
          contentStyle: {
            backgroundColor: 'transparent',
          },
        }}
      />
    </Stack>
  );
}
