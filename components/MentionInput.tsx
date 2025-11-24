import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
  const [followingLoaded, setFollowingLoaded] = useState(false);
  const inputRef = useRef<TextInput>(null);
  
  // Fully controlled input model: maintain internal value and selection
  const [internalValue, setInternalValue] = useState(value);
  const [selection, setSelection] = useState({ start: value.length, end: value.length });
  
  // Cache follow list to avoid refetching on every keystroke
  const followingIdsRef = useRef<string[]>([]);

  // Sync internal value when value prop changes externally (prefills, suggestion insertion)
  useEffect(() => {
    if (value !== internalValue) {
      setInternalValue(value);
      // Default caret to end of text when external change occurs
      setSelection({ start: value.length, end: value.length });
    }
    
    // Reset all internal autocomplete state when value is cleared (defensive cleanup)
    if (value === '') {
      setShowAutocomplete(false);
      setAutocompleteUsers([]);
      setMentionSearch('');
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract all @mentions from text
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  // Load following list once on mount
  useEffect(() => {
    const loadFollowing = async () => {
      try {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId);

        followingIdsRef.current = following?.map(f => f.following_id) || [];
        setFollowingLoaded(true);
      } catch (error) {
        console.error('Error loading following list:', error);
        followingIdsRef.current = [];
        setFollowingLoaded(true);
      }
    };

    loadFollowing();
  }, [currentUserId]);

  // Search for users when @ is detected (with debouncing)
  useEffect(() => {
    const performSearch = async () => {
      if (!mentionSearch) {
        setAutocompleteUsers([]);
        setShowAutocomplete(false);
        return;
      }

      try {
        const followingIds = followingIdsRef.current;

        // Optimized query: Get users with mutual friend counts in single query
        // Use SQL function to calculate mutual friends efficiently
        const { data, error } = await supabase.rpc('search_users_for_mentions', {
          search_term: mentionSearch,
          current_user_id: currentUserId,
          following_ids: followingIds,
          result_limit: 10
        });

        if (error) {
          // Fallback to simple query if RPC function doesn't exist yet
          console.warn('RPC function not found, using fallback query:', error);
          const { data: users, error: fallbackError } = await supabase
            .from('profiles')
            .select('user_id, username, display_name, avatar_url, avatar_color_scheme, avatar_icon')
            .ilike('username', `${mentionSearch}%`)
            .neq('user_id', currentUserId)
            .limit(10);

          if (fallbackError) throw fallbackError;

          if (users && users.length > 0) {
            const sortedUsers = users
              .map(user => ({
                ...user,
                is_following: followingIds.includes(user.user_id),
                mutual_friends: 0,
              }))
              .sort((a, b) => {
                if (a.is_following !== b.is_following) {
                  return a.is_following ? -1 : 1;
                }
                return a.username.localeCompare(b.username);
              });

            setAutocompleteUsers(sortedUsers);
            setShowAutocomplete(true);
          } else {
            setAutocompleteUsers([]);
            setShowAutocomplete(false);
          }
        } else if (data && data.length > 0) {
          setAutocompleteUsers(data);
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

    // Debounce search by 300ms
    const timeoutId = setTimeout(() => {
      // Only search if following list is loaded
      if (followingLoaded) {
        performSearch();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [mentionSearch, currentUserId, followingLoaded]);

  // Handle text change
  const handleTextChange = (text: string) => {
    // Calculate cursor position from text delta (onSelectionChange lags behind)
    const textDelta = text.length - internalValue.length;
    const cursor = selection.end + textDelta;
    
    // Update internal value
    setInternalValue(text);

    // Find mention based on calculated cursor position
    const beforeCursor = text.substring(0, cursor);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const afterAt = text.substring(lastAtIndex + 1, cursor);
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

    // Extract all mentions and notify parent
    const mentions = extractMentions(text);
    onChangeText(text, mentions);
  };

  // Handle user selection
  const handleSelectUser = (username: string) => {
    const cursor = selection.end;
    const beforeCursor = internalValue.substring(0, cursor);
    const afterCursor = internalValue.substring(cursor);
    const lastAtIndex = beforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const before = internalValue.substring(0, lastAtIndex);
      const newText = `${before}@${username} ${afterCursor}`;
      const newCursor = lastAtIndex + username.length + 2; // +2 for @ and space

      // Update internal state
      setInternalValue(newText);
      setSelection({ start: newCursor, end: newCursor });
      setShowAutocomplete(false);
      setMentionSearch('');

      // Notify parent
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
        value={internalValue}
        selection={selection}
        onChangeText={handleTextChange}
        onSelectionChange={(e) => {
          // Keep selection state in sync with native caret changes
          setSelection(e.nativeEvent.selection);
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
