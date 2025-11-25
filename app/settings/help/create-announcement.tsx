import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, typography } from '@/styles/commonStyles';
import { supabase } from '@/integrations/supabase/client';
import { useData } from '@/contexts/DataContext';
import { isAdmin } from '@/config/admins';
import ButtonL from '@/components/ButtonL';

export default function CreateAnnouncementScreen() {
  const router = useRouter();
  const { currentUser } = useData();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Admin check - must be in useEffect to avoid setState during render
  useEffect(() => {
    if (currentUser?.id) {
      if (!isAdmin(currentUser.id)) {
        router.back();
      } else {
        setCheckingAdmin(false);
      }
    }
  }, [currentUser?.id]);

  // Show loading while checking admin status
  if (checkingAdmin) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'New Announcement',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  const handleCreateAnnouncement = async () => {
    console.log('📢 Post Announcement button clicked');
    
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your announcement.');
      return;
    }

    if (!details.trim()) {
      Alert.alert('Missing Details', 'Please provide details for your announcement.');
      return;
    }

    try {
      setLoading(true);
      console.log('📢 Inserting announcement to database...');

      const { data, error } = await supabase
        .from('help_desk_posts')
        .insert({
          user_id: currentUser.id,
          username: currentUser.username,
          title: title.trim(),
          details: details.trim(),
          category: 'Admin Announcement',
          section: 'announcement',
          likes_count: 0,
          comments_count: 0,
        })
        .select();

      if (error) {
        console.error('📢 Database error:', error);
        throw error;
      }

      console.log('📢 Announcement posted successfully:', data);
      
      if (Platform.OS === 'web') {
        window.alert('Your announcement has been posted!');
        router.replace({ pathname: '/settings/help', params: { refresh: Date.now().toString() } });
      } else {
        Alert.alert('Success', 'Your announcement has been posted!', [
          {
            text: 'OK',
            onPress: () => router.replace({ pathname: '/settings/help', params: { refresh: Date.now().toString() } }),
          },
        ]);
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to create announcement. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to create announcement. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'New Announcement',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Admin Only</Text>
          </View>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Announcement title..."
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
          </View>

          {/* Details Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Details</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What do you want to announce to the community?"
              placeholderTextColor={colors.textSecondary}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
          </View>

          {/* Create Button */}
          <ButtonL onPress={handleCreateAnnouncement} disabled={loading}>
            {loading ? 'Posting...' : 'Post Announcement'}
          </ButtonL>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  form: {
    gap: 24,
  },
  badge: {
    backgroundColor: colors.error + '20',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  badgeText: {
    ...typography.smallSubtitle,
    color: colors.error,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    ...typography.p1Bold,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    ...typography.p1,
    color: colors.text,
  },
  textArea: {
    minHeight: 160,
    paddingTop: 16,
  },
});
