import { Platform, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function HomeLayout() {
  return (
    <View style={styles.container}>
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
            backgroundColor: colors.background,
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            title: 'Home',
            contentStyle: {
              backgroundColor: colors.background,
            },
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
