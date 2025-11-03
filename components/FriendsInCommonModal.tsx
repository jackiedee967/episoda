import React, { useEffect } from 'react';
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

export default function FriendsInCommonModal({
  visible,
  onClose,
  friends,
  profileUsername,
}: FriendsInCommonModalProps) {
  const router = useRouter();
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
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
  }, [visible, slideAnim]);

  const handleUserPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push(`/user/${userId}`);
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
            <Text style={styles.title}>Friends in Common</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
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
                  <Image source={{ uri: user.avatar }} style={styles.avatar} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: colors.cardBackground,
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
    borderBottomColor: colors.cardStroke,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.almostWhite,
    fontFamily: typography.titleL.fontFamily,
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
    fontSize: 16,
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
    color: colors.almostWhite,
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: colors.grey1,
    marginBottom: 2,
  },
  bio: {
    fontSize: 12,
    color: colors.grey1,
  },
});
