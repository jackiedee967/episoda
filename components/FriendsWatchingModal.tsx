import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import { X } from 'lucide-react-native';
import tokens from '@/styles/tokens';
import FollowButton from './FollowButton';
import { User } from '@/types';
import { useData } from '@/contexts/DataContext';

interface FriendsWatchingModalProps {
  visible: boolean;
  onClose: () => void;
  friends: User[];
  showTitle: string;
}

export default function FriendsWatchingModal({
  visible,
  onClose,
  friends,
  showTitle,
}: FriendsWatchingModalProps) {
  const { isFollowing, followUser, unfollowUser } = useData();

  const handleToggleFollow = async (userId: string) => {
    if (isFollowing(userId)) {
      await unfollowUser(userId);
    } else {
      await followUser(userId);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Friends Watching</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={tokens.colors.almostWhite} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>{showTitle}</Text>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {friends.map((friend) => (
              <View key={friend.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <Image source={{ uri: friend.avatar }} style={styles.avatar} />
                  <View style={styles.textContainer}>
                    <Text style={styles.name}>{friend.displayName}</Text>
                    <Text style={styles.username}>@{friend.username}</Text>
                    {friend.bio && (
                      <Text style={styles.bio} numberOfLines={1}>
                        {friend.bio}
                      </Text>
                    )}
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: tokens.colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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
    paddingTop: 12,
    paddingBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.cardStroke,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  avatar: {
    width: 47,
    height: 47,
    borderRadius: 23.5,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: tokens.colors.pureWhite,
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '600',
  },
  username: {
    color: tokens.colors.greenHighlight,
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '500',
  },
  bio: {
    color: tokens.colors.grey1,
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '400',
  },
});
