
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { colors, typography } from '@/styles/commonStyles';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/integrations/supabase/client';
import { NotificationPreferences } from '@/types';

export default function NotificationsSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    newFollower: true,
    postLiked: true,
    postCommented: true,
    commentReplied: true,
    mentioned: true,
    friendPosted: true,
    friendActivity: true,
  });

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

      const { data, error } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
      } else if (data) {
        setPreferences({
          newFollower: data.new_follower,
          postLiked: data.post_liked,
          postCommented: data.post_commented,
          commentReplied: data.comment_replied,
          mentioned: data.mentioned,
          friendPosted: data.friend_posted,
          friendActivity: data.friend_activity,
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

      // Convert camelCase to snake_case for database
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();

      const { data: existing, error: checkError } = await (supabase as any)
        .from('notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        const { error: updateError } = await (supabase as any)
          .from('notification_preferences')
          .update({
            [dbKey]: value,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await (supabase as any)
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            [dbKey]: value,
          });

        if (insertError) throw insertError;
      }

      console.log(`Saved ${key} = ${value}`);
    } catch (error) {
      console.error('Error saving preference:', error);
      Alert.alert('Error', 'Failed to save notification preference. Please try again.');
      // Revert the change
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
          <ActivityIndicator size="large" color={colors.secondary} />
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
              Choose which notifications you want to receive. Changes are saved automatically.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.notificationContainer}>
              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>New Follower</Text>
                  <Text style={styles.notificationDescription}>When someone follows you</Text>
                </View>
                <Switch
                  value={preferences.newFollower}
                  onValueChange={() => togglePreference('newFollower')}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Post Liked</Text>
                  <Text style={styles.notificationDescription}>When someone likes your post</Text>
                </View>
                <Switch
                  value={preferences.postLiked}
                  onValueChange={() => togglePreference('postLiked')}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Post Commented</Text>
                  <Text style={styles.notificationDescription}>When someone comments on your post</Text>
                </View>
                <Switch
                  value={preferences.postCommented}
                  onValueChange={() => togglePreference('postCommented')}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Comment Replied</Text>
                  <Text style={styles.notificationDescription}>When someone replies to your comment</Text>
                </View>
                <Switch
                  value={preferences.commentReplied}
                  onValueChange={() => togglePreference('commentReplied')}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Mentioned</Text>
                  <Text style={styles.notificationDescription}>When someone mentions you</Text>
                </View>
                <Switch
                  value={preferences.mentioned}
                  onValueChange={() => togglePreference('mentioned')}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Friend Posted</Text>
                  <Text style={styles.notificationDescription}>When a friend posts something new</Text>
                </View>
                <Switch
                  value={preferences.friendPosted}
                  onValueChange={() => togglePreference('friendPosted')}
                  trackColor={{ false: colors.border, true: colors.secondary }}
                  thumbColor={colors.card}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.notificationItem}>
                <View style={styles.notificationInfo}>
                  <Text style={styles.notificationLabel}>Friend Activity</Text>
                  <Text style={styles.notificationDescription}>When friends like or comment</Text>
                </View>
                <Switch
                  value={preferences.friendActivity}
                  onValueChange={() => togglePreference('friendActivity')}
                  trackColor={{ false: colors.border, true: colors.secondary }}
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
