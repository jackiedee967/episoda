
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { ChevronDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/integrations/supabase/client';
import { HelpDeskCategory } from '@/types';
import { useData } from '@/contexts/DataContext';
import { isAdmin } from '@/config/admins';
import ButtonL from '@/components/ButtonL';

export default function CreatePostScreen() {
  const router = useRouter();
  const { currentUser } = useData();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [category, setCategory] = useState<HelpDeskCategory>('Feature Request');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // AUTHENTICATION BYPASSED - Using mock user from DataContext
  const currentUsername = currentUser.username;
  const userIsAdmin = isAdmin(currentUser.id);

  const categories: HelpDeskCategory[] = [
    'Feature Request',
    'Support',
    'Feedback',
    'Misc',
    ...(userIsAdmin ? ['Admin Announcement' as HelpDeskCategory] : []),
  ];

  const handleCreatePost = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your post.');
      return;
    }

    if (!details.trim()) {
      Alert.alert('Missing Details', 'Please provide details for your post.');
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // AUTHENTICATION BYPASSED - Using mock user
      const userId = currentUser.id;

      const { error } = await supabase
        .from('help_desk_posts')
        .insert({
          user_id: userId,
          username: currentUsername,
          title: title.trim(),
          details: details.trim(),
          category,
          likes_count: 0,
          comments_count: 0,
        });

      if (error) throw error;

      Alert.alert('Success', 'Your post has been created!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post. Please try again.');
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
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Provide as much detail as you can."
              placeholderTextColor={colors.textSecondary}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
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
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
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
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 18,
    color: colors.purple,
    fontWeight: '700',
  },
});
