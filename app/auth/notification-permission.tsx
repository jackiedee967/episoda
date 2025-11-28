import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import { Bell, BellOff } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import tokens from '@/styles/tokens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const phoneBackground = Asset.fromModule(require('../../assets/images/auth/Background.png')).uri;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const options = {
  headerShown: false,
};

export default function NotificationPermissionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification');
      return null;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.log('No EAS project ID found');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      
      return tokenData.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  };

  const savePushToken = async (token: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ expo_push_token: token })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving push token:', error);
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const token = await registerForPushNotifications();
      
      if (token) {
        await savePushToken(token);
        console.log('Push token saved:', token);
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
    } finally {
      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/' as any);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/' as any);
  };

  return (
    <ImageBackground
      source={{ uri: phoneBackground }}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Bell size={48} color={tokens.colors.black} />
          </View>
        </View>

        <Text style={styles.title}>Stay in the loop</Text>
        <Text style={styles.subtitle}>
          Get notified when friends like your posts, comment on your thoughts, or log shows you're watching.
        </Text>

        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>Know when someone interacts with your posts</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>See when friends watch your favorite shows</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureDot} />
            <Text style={styles.featureText}>Get announcements from the EPISODA team</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Pressable
            style={styles.enableButton}
            onPress={handleEnableNotifications}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={tokens.colors.black} />
            ) : (
              <>
                <Bell size={20} color={tokens.colors.black} />
                <Text style={styles.enableButtonText}>Enable Notifications</Text>
              </>
            )}
          </Pressable>

          <Pressable style={styles.skipButton} onPress={handleSkip}>
            <BellOff size={18} color={tokens.colors.grey1} />
            <Text style={styles.skipButtonText}>Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: tokens.colors.greenHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...tokens.typography.titleL,
    color: tokens.colors.pureWhite,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 48,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.greenHighlight,
  },
  featureText: {
    ...tokens.typography.p1,
    color: tokens.colors.almostWhite,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  enableButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: tokens.colors.greenHighlight,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  enableButtonText: {
    ...tokens.typography.subtitle,
    color: tokens.colors.black,
    fontWeight: '600',
  },
  skipButton: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  skipButtonText: {
    ...tokens.typography.p1M,
    color: tokens.colors.grey1,
  },
});
