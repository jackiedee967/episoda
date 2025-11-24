import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Pressable,
  Text,
  StyleSheet,
  TextInputProps,
  Image,
} from 'react-native';
import { supabase } from '@/integrations/supabase/client';
import { colors, typography } from '@/styles/tokens';
import { generateAvatarDataURI } from '@/utils/profilePictureGenerator';

interface MentionInputProps extends Omit<TextInputProps, 'onChangeText'> {
  value: string;
  onChangeText: (text: string, mentions: string[]) => void;
  currentUserId: string;
  inputBackgroundColor?: string;
}

interface User {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_color_scheme: number | null;
  avatar_icon: string | null;
  mutual_friends?: number;
  is_following?: boolean;
}

export default function MentionInput({
  value,
  onChangeText,
  currentUserId,
  inputBackgroundColor = colors.pureWhite,
  ...textInputProps
}: MentionInputProps) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteUsers, setAutocompleteUsers] = useState<User[]>([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<TextInput>(null);

  // Extract all @mentions from text
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  // Search for users when @ is detected
  useEffect(() => {
    const searchUsers = async () => {
      if (!mentionSearch) {
        setAutocompleteUsers([]);
        setShowAutocomplete(false);
        return;
      }

      try {
        // Get users you're following
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId);

        const followingIds = following?.map(f => f.following_id) || [];

        // Search all users matching the query
        const { data: users, error } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url, avatar_color_scheme, avatar_icon')
          .ilike('username', `${mentionSearch}%`)
          .neq('user_id', currentUserId) // Don't show current user
          .limit(10);

        if (error) throw error;

        if (users && users.length > 0) {
          // Sort: following first, then alphabetically
          const sortedUsers = users
            .map(user => ({
              ...user,
              is_following: followingIds.includes(user.user_id),
            }))
            .sort((a, b) => {
              // Following users first
              if (a.is_following !== b.is_following) {
                return a.is_following ? -1 : 1;
              }
              // Then alphabetically
              return a.username.localeCompare(b.username);
            });

          setAutocompleteUsers(sortedUsers);
          setShowAutocomplete(true);
        } else {
          setAutocompleteUsers([]);
          setShowAutocomplete(false);
        }
      } catch (error) {
        console.error('Error searching users:', error);
        setAutocompleteUsers([]);
        setShowAutocomplete(false);
      }
    };

    searchUsers();
  }, [mentionSearch, currentUserId]);

  // Handle text change
  const handleTextChange = (text: string) => {
    // Find if @ was just typed and get the search term
    const beforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const afterAt = text.substring(lastAtIndex + 1, cursorPosition);
      // Check if there's a space after @, if so, stop autocomplete
      if (afterAt.includes(' ')) {
        setShowAutocomplete(false);
        setMentionSearch('');
      } else {
        setMentionSearch(afterAt);
      }
    } else {
      setShowAutocomplete(false);
      setMentionSearch('');
    }

    const mentions = extractMentions(text);
    onChangeText(text, mentions);
  };

  // Handle user selection
  const handleSelectUser = (username: string) => {
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const before = value.substring(0, lastAtIndex);
      const newText = `${before}@${username} ${afterCursor}`;
      const newCursorPos = lastAtIndex + username.length + 2; // +2 for @ and space

      setCursorPosition(newCursorPos);
      setShowAutocomplete(false);
      setMentionSearch('');

      const mentions = extractMentions(newText);
      onChangeText(newText, mentions);

      // Focus back on input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  // Render user item
  const renderUserItem = ({ item }: { item: User }) => {
    const avatarDataUri = item.avatar_url || generateAvatarDataURI(
      item.avatar_color_scheme || 1,
      item.avatar_icon || 'icon-1-ellipse'
    );

    return (
      <Pressable
        style={styles.autocompleteItem}
        onPress={() => handleSelectUser(item.username)}
      >
        <Image source={{ uri: avatarDataUri }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{item.display_name || item.username}</Text>
          <Text style={styles.username}>@{item.username}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        {...textInputProps}
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        onSelectionChange={(e) => {
          setCursorPosition(e.nativeEvent.selection.end);
        }}
      />

      {showAutocomplete && autocompleteUsers.length > 0 && (
        <View style={[styles.autocompleteContainer, { backgroundColor: inputBackgroundColor }]}>
          <FlatList
            data={autocompleteUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.user_id}
            style={styles.autocompleteList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  autocompleteContainer: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.grey2,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  autocompleteList: {
    maxHeight: 200,
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    ...typography.subtitle,
    color: colors.black,
  },
  username: {
    ...typography.p1,
    color: colors.grey1,
    marginTop: 2,
  },
});
