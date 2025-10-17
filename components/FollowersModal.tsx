
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { User } from '@/types';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface FollowersModalProps {
  visible: boolean;
  onClose: () => void;
  users: User[];
  title: string;
  currentUserId: string;
  followingIds: string[];
  onFollowToggle: (userId: string) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function FollowersModal({
  visible,
  onClose,
  users,
  title,
  currentUserId,
  followingIds,
  onFollowToggle,
}: FollowersModalProps) {
  const router = useRouter();
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push(`/user/${userId}`);
  };

  const handleFollowPress = (userId: string, e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFollowToggle(userId);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {users.map((user) => {
              const isFollowing = followingIds.includes(user.id);
              const isCurrentUser = user.id === currentUserId;

              return (
                <Pressable
                  key={user.id}
                  style={styles.userItem}
                  onPress={() => handleUserPress(user.id)}
                >
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
                  <View style={styles.userInfo}>
                    <Text style={styles.displayName}>{user.displayName}</Text>
                    <Text style={styles.username}>@{user.username}</Text>
                    {user.bio && <Text style={styles.bio} numberOfLines={1}>{user.bio}</Text>}
                  </View>
                  {!isCurrentUser && (
                    <Pressable
                      style={[styles.followButton, isFollowing && styles.followingButton]}
                      onPress={(e) => handleFollowPress(user.id, e)}
                    >
                      <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </Pressable>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  bio: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  followButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followingButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  followingButtonText: {
    color: colors.textSecondary,
  },
});
