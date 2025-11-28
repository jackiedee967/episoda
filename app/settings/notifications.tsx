import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { colors, typography } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/integrations/supabase/client';
import { NotificationPreferences } from '@/types';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  likes: true,
  comments: true,
  follows: true,
  mentions: true,
  admin_announcements: true,
  friend_logs_watched_show: true,
  friend_logs_playlist_show: true,
};

export default function NotificationsSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('No authenticated user, using default preferences');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
      } else if (data?.notification_preferences) {
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...data.notification_preferences,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    setSaving(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('No authenticated user, saving locally only');
        setSaving(false);
        return;
      }

      const updatedPreferences = { ...preferences, [key]: value };

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          notification_preferences: updatedPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      console.log(`Saved ${key} = ${value}`);
    } catch (error) {
      console.error('Error saving preference:', error);
      Alert.alert('Error', 'Failed to save notification preference. Please try again.');
      setPreferences(prev => ({ ...prev, [key]: !value }));
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !preferences[key];
    setPreferences(prev => ({ ...prev, [key]: newValue }));
    savePreference(key, newValue);
  };

  if (loading) {
    return (
      <>
        <Stack.Screen 
          options={{
            headerShown: true,
            title: 'Notifications',
            headerBackTitle: 'Settings',
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }} 
        />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={tokens.colors.greenHighlight} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Notifications',
          headerBackTitle: 'Settings',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }} 
      />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionDescription}>
              Choose which push notifications you want to receive. Changes are saved automatically.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INTERACTIONS</Text>
            <View style={styles.notificationContainer}>
              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Likes</Text>
                  <Text style={styles.notificationDescription}>When someone likes your post</Text>
                </View>
                <Switch
                  value={preferences.likes}
                  onValueChange={() => togglePreference('likes')}
                  trackColor={{ false: colors.border, true: tokens.colors.greenHighlight }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Comments</Text>
                  <Text style={styles.notificationDescription}>When someone comments on your post</Text>
                </View>
                <Switch
                  value={preferences.comments}
                  onValueChange={() => togglePreference('comments')}
                  trackColor={{ false: colors.border, true: tokens.colors.greenHighlight }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Follows</Text>
                  <Text style={styles.notificationDescription}>When someone follows you</Text>
                </View>
                <Switch
                  value={preferences.follows}
                  onValueChange={() => togglePreference('follows')}
                  trackColor={{ false: colors.border, true: tokens.colors.greenHighlight }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Mentions</Text>
                  <Text style={styles.notificationDescription}>When someone mentions you in a post or comment</Text>
                </View>
                <Switch
                  value={preferences.mentions}
                  onValueChange={() => togglePreference('mentions')}
                  trackColor={{ false: colors.border, true: tokens.colors.greenHighlight }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FRIEND ACTIVITY</Text>
            <View style={styles.notificationContainer}>
              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Friend Logs Show You've Watched</Text>
                  <Text style={styles.notificationDescription}>When a friend logs a show in your watch history</Text>
                </View>
                <Switch
                  value={preferences.friend_logs_watched_show}
                  onValueChange={() => togglePreference('friend_logs_watched_show')}
                  trackColor={{ false: colors.border, true: tokens.colors.greenHighlight }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Friend Logs Show on Your Playlist</Text>
                  <Text style={styles.notificationDescription}>When a friend logs a show from your playlists</Text>
                </View>
                <Switch
                  value={preferences.friend_logs_playlist_show}
                  onValueChange={() => togglePreference('friend_logs_playlist_show')}
                  thumbColor={colors.card}
                  disabled={saving}
                  trackColor={{ false: colors.border, true: tokens.colors.greenHighlight }}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EPISODA UPDATES</Text>
            <View style={styles.notificationContainer}>
              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Announcements</Text>
                  <Text style={styles.notificationDescription}>Updates and announcements from the EPISODA team</Text>
                </View>
                <Switch
                  value={preferences.admin_announcements}
                  onValueChange={() => togglePreference('admin_announcements')}
                  trackColor={{ false: colors.border, true: tokens.colors.greenHighlight }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    ...typography.p3Bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionDescription: {
    ...typography.p1,
    color: colors.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  notificationContainer: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationLabel: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: 4,
  },
  notificationDescription: {
    ...typography.p1,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 16,
  },
});
