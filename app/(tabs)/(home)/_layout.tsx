import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: Platform.OS === 'ios',
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: Platform.OS === 'ios',
          title: 'Home'
        }}
      />
    </Stack>
  );
}
