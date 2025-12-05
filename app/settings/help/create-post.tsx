
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, typography } from '@/styles/commonStyles';
import { ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/integrations/supabase/client';
import { HelpDeskCategory } from '@/types';
import { useData } from '@/contexts/DataContext';
import ButtonL from '@/components/ButtonL';
import MentionInput from '@/components/MentionInput';
import { saveHelpDeskPostMentions, getUserIdsByUsernames, createMentionNotifications } from '@/utils/mentionUtils';

export default function CreatePostScreen() {
  const router = useRouter();
  const { currentUser } = useData();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const [category, setCategory] = useState<HelpDeskCategory>('Feature Request');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentUsername = currentUser?.username || '';
  const userIsAdmin = currentUser?.is_admin === true;

  const categories: HelpDeskCategory[] = [
    'Feature Request',
    'Support',
    'Feedback',
    'Misc',
    ...(userIsAdmin ? ['Admin Announcement' as HelpDeskCategory] : []),
  ];

  const handleCreatePost = async () => {
    console.log('📝 Create Post: Starting...');
    
    // Validate user is authenticated
    if (!currentUser?.id || !currentUser?.username) {
      console.error('📝 Create Post: User not authenticated', { currentUser });
      if (Platform.OS === 'web') {
        window.alert('Please sign in to create a post.');
      } else {
        Alert.alert('Not Signed In', 'Please sign in to create a post.');
      }
      return;
    }
    
    if (!title.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a title for your post.');
      } else {
        Alert.alert('Missing Title', 'Please enter a title for your post.');
      }
      return;
    }

    if (!details.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Please provide details for your post.');
      } else {
        Alert.alert('Missing Details', 'Please provide details for your post.');
      }
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Get the authenticated user's ID from Supabase session (required for RLS)
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData?.session?.user?.id) {
        console.error('📝 Create Post: No active Supabase session', { sessionError });
        if (Platform.OS === 'web') {
          window.alert('Your session has expired. Please sign in again.');
        } else {
          Alert.alert('Session Expired', 'Your session has expired. Please sign in again.');
        }
        return;
      }
      
      const authenticatedUserId = sessionData.session.user.id;
      const username = currentUser.username;

      // Determine section based on category
      const section = category === 'Admin Announcement' ? 'announcement' : 'general';

      console.log('📝 Create Post: Inserting to database...', { authenticatedUserId, username, category, section });

      const { data, error } = await supabase
        .from('help_desk_posts')
        .insert({
          user_id: authenticatedUserId,
          username: username,
          title: title.trim(),
          details: details.trim(),
          category,
          section,
          likes_count: 0,
          comments_count: 0,
        })
        .select('id')
        .single();

      if (error) {
        console.error('📝 Create Post: Database error:', error);
        throw error;
      }
      
      console.log('📝 Create Post: Success!', { postId: data?.id });

      // Save mentions if there are any
      if (mentionedUsers.length > 0 && data?.id) {
        await saveHelpDeskPostMentions(data.id, mentionedUsers);

        // Create notifications for mentioned users
        const userMap = await getUserIdsByUsernames(mentionedUsers);
        const mentionedUserIds = Array.from(userMap.values());
        await createMentionNotifications(
          mentionedUserIds,
          authenticatedUserId,
          'mention_post',
          data.id
        );
      }

      if (Platform.OS === 'web') {
        window.alert('Your post has been created!');
        router.replace('/settings/help?refresh=true');
      } else {
        Alert.alert('Success', 'Your post has been created!', [
          {
            text: 'OK',
            onPress: () => router.replace({ pathname: '/settings/help', params: { refresh: Date.now().toString() } }),
          },
        ]);
      }
    } catch (error: any) {
      console.error('📝 Create Post: Failed:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      if (Platform.OS === 'web') {
        window.alert(`Failed to create post: ${errorMessage}`);
      } else {
        Alert.alert('Error', `Failed to create post: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (selectedCategory: HelpDeskCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(selectedCategory);
    setShowCategoryPicker(false);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Feature Request':
        return colors.purple;
      case 'Support':
        return colors.blue;
      case 'Feedback':
        return colors.green;
      case 'Admin Announcement':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Create Post',
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
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="What's your question or feedback?"
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
          </View>

          {/* Details Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Details</Text>
            <MentionInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide as much detail as you can. Use @username to mention someone."
              placeholderTextColor={colors.textSecondary}
              value={details}
              onChangeText={(text, mentions) => {
                setDetails(text);
                setMentionedUsers(mentions);
              }}
              currentUserId={currentUser.id}
              multiline
              inputBackgroundColor={colors.background}
            />
          </View>

          {/* Category Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <Pressable
              style={styles.categoryButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowCategoryPicker(true);
              }}
            >
              <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(category) }]} />
              <Text style={styles.categoryButtonText}>{category}</Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Create Button */}
          <ButtonL onPress={handleCreatePost} disabled={loading}>
            {loading ? 'Posting...' : 'Create Post'}
          </ButtonL>
        </View>
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                style={styles.categoryOption}
                onPress={() => handleCategorySelect(cat)}
              >
                <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(cat) }]} />
                <Text style={styles.categoryOptionText}>{cat}</Text>
                {category === cat ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  form: {
    gap: 24,
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
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  categoryIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryButtonText: {
    flex: 1,
    ...typography.p1,
    color: colors.text,
  },
  createButton: {
    backgroundColor: colors.purple,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    ...typography.subtitle,
    color: colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    ...typography.titleL,
    color: colors.text,
    marginBottom: 16,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderRadius: 12,
  },
  categoryOptionText: {
    flex: 1,
    ...typography.p1,
    color: colors.text,
  },
  checkmark: {
    ...typography.titleL,
    color: colors.purple,
  },
});
