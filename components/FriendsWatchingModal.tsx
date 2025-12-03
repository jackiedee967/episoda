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
import { X } from 'lucide-react-native';
import tokens from '@/styles/tokens';
import FollowButton from './FollowButton';
import AvatarImage from './AvatarImage';
import { User } from '@/types';
import { useData } from '@/contexts/DataContext';

interface FriendsWatchingModalProps {
  visible: boolean;
  onClose: () => void;
  friends: User[];
  showTitle: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ANIMATION_DURATION = 250;

export default function FriendsWatchingModal({
  visible,
  onClose,
  friends,
  showTitle,
}: FriendsWatchingModalProps) {
  const { isFollowing, followUser, unfollowUser } = useData();
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

  const handleToggleFollow = async (userId: string) => {
    if (isFollowing(userId)) {
      await unfollowUser(userId);
    } else {
      await followUser(userId);
    }
  };

  if (!isModalVisible) {
    return null;
  }

  return (
    <Modal
      visible={isModalVisible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
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
            <Text style={styles.title}>Friends Watching</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={tokens.colors.almostWhite} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>{showTitle}</Text>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {friends.map((friend) => (
              <View key={friend.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <AvatarImage
                    uri={friend.avatar_url || friend.avatar}
                    colorSchemeId={friend.avatar_color_scheme}
                    iconName={friend.avatar_icon}
                    size={48}
                    borderRadius={14}
                  />
                  <View style={styles.textContainer}>
                    <Text style={styles.name}>{friend.displayName}</Text>
                    <Text style={styles.username}>@{friend.username}</Text>
                    {friend.bio ? (
                      <Text style={styles.bio} numberOfLines={1}>
                        {friend.bio}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <FollowButton 
                  userId={friend.id} 
                  isFollowing={isFollowing(friend.id)}
                  onPress={handleToggleFollow}
                  size="small" 
                />
              </View>
            ))}
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContainer: {
    backgroundColor: tokens.colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.cardStroke,
  },
  title: {
    ...tokens.typography.subtitle,
    color: tokens.colors.pureWhite,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    ...tokens.typography.subtitle,
    color: tokens.colors.grey1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.cardStroke,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    ...tokens.typography.subtitle,
    color: tokens.colors.pureWhite,
  },
  username: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
    marginTop: 2,
  },
  bio: {
    ...tokens.typography.p3R,
    color: tokens.colors.grey1,
    marginTop: 4,
  },
});
