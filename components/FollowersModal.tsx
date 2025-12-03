
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import FollowButton from '@/components/FollowButton';
import AvatarImage from '@/components/AvatarImage';
import { User } from '@/types';
import tokens from '@/styles/tokens';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface FollowersModalProps {
  visible: boolean;
  onClose: () => void;
  users: User[];
  title: string;
  currentUserId: string;
  followingIds: string[];
  onFollowToggle: (userId: string) => Promise<void>;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ANIMATION_DURATION = 250;

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
  const [isModalVisible, setIsModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setIsModalVisible(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isModalVisible && !isClosingRef.current) {
      closeWithAnimation();
    }
  }, [visible]);

  const closeWithAnimation = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsModalVisible(false);
      isClosingRef.current = false;
    });
  }, [slideAnim, fadeAnim]);

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsModalVisible(false);
      isClosingRef.current = false;
      onClose();
    });
  }, [onClose, slideAnim, fadeAnim]);

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleClose();
    setTimeout(() => {
      router.push(`/user/${userId}`);
    }, ANIMATION_DURATION);
  };

  const handleFollowToggle = async (userId: string) => {
    console.log('FollowersModal - handleFollowToggle called for userId:', userId);
    console.log('FollowersModal - Current following state:', followingIds.includes(userId));
    
    try {
      await onFollowToggle(userId);
      console.log('FollowersModal - Follow toggle completed successfully');
    } catch (error) {
      console.error('FollowersModal - Error in handleFollowToggle:', error);
    }
  };

  if (!isModalVisible) {
    return null;
  }

  return (
    <Modal visible={isModalVisible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={tokens.colors.black} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {users.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {title === 'Followers' ? 'No followers yet' : 'Not following anyone yet'}
                </Text>
              </View>
            ) : (
              users.map((user) => {
                const isFollowing = followingIds.includes(user.id);
                const isCurrentUser = user.id === currentUserId;

                return (
                  <View key={user.id} style={styles.userItem}>
                    <Pressable
                      style={styles.userPressable}
                      onPress={() => handleUserPress(user.id)}
                    >
                      <AvatarImage
                        uri={user.avatar_url || user.avatar}
                        colorSchemeId={user.avatar_color_scheme}
                        iconName={user.avatar_icon}
                        size={48}
                        borderRadius={14}
                      />
                      <View style={styles.userInfo}>
                        <Text style={styles.displayName}>{user.displayName}</Text>
                        <Text style={styles.username}>@{user.username}</Text>
                        {user.bio ? <Text style={styles.bio} numberOfLines={1}>{user.bio}</Text> : null}
                      </View>
                    </Pressable>
                    {!isCurrentUser ? (
                      <View style={styles.buttonWrapper}>
                        <FollowButton
                          userId={user.id}
                          isFollowing={isFollowing}
                          onPress={handleFollowToggle}
                          size="small"
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: tokens.colors.pureWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    paddingBottom: 40,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.grey2,
  },
  title: {
    ...tokens.typography.subtitle,
    color: tokens.colors.black,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...tokens.typography.subtitleR,
    color: tokens.colors.grey1,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.grey2,
  },
  userPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    ...tokens.typography.subtitle,
    color: tokens.colors.black,
    marginBottom: 2,
  },
  username: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    marginBottom: 2,
  },
  bio: {
    ...tokens.typography.p3R,
    color: tokens.colors.grey1,
  },
  buttonWrapper: {
    marginLeft: 8,
  },
});
