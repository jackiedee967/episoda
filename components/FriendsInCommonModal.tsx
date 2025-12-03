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
import AvatarImage from '@/components/AvatarImage';
import { User } from '@/types';
import { colors, typography } from '@/styles/tokens';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

interface FriendsInCommonModalProps {
  visible: boolean;
  onClose: () => void;
  friends: User[];
  profileUsername: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ANIMATION_DURATION = 250;

export default function FriendsInCommonModal({
  visible,
  onClose,
  friends,
  profileUsername,
}: FriendsInCommonModalProps) {
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
            <Text style={styles.title}>Friends in Common</Text>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={colors.almostWhite} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  No friends in common with @{profileUsername}
                </Text>
              </View>
            ) : (
              friends.map((user) => (
                <Pressable
                  key={user.id}
                  style={styles.userItem}
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
                    {user.bio && <Text style={styles.bio} numberOfLines={1}>{user.bio}</Text>}
                  </View>
                </Pressable>
              ))
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
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardStroke,
  },
  title: {
    ...typography.subtitle,
    color: colors.almostWhite,
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
    ...typography.subtitleR,
    color: colors.grey1,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardStroke,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  displayName: {
    ...typography.subtitle,
    color: colors.almostWhite,
    marginBottom: 2,
  },
  username: {
    ...typography.p1,
    color: colors.grey1,
    marginBottom: 2,
  },
  bio: {
    ...typography.p3R,
    color: colors.grey1,
  },
});
