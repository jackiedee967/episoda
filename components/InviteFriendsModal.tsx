import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image, Share, Alert, Platform } from 'react-native';
import { colors, typography } from '@/styles/tokens';
import Button from '@/components/Button';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

interface InviteFriendsModalProps {
  visible: boolean;
  onClose: () => void;
  onInvite?: () => void;
}

// Placeholder App Store URL - update this when you have your real App Store link
const APP_STORE_URL = 'https://apps.apple.com/app/episoda/idXXXXXXXXX';

export default function InviteFriendsModal({ visible, onClose, onInvite }: InviteFriendsModalProps) {
  const handleInviteFriends = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // If parent provided a custom onInvite handler, use that
      if (onInvite) {
        onInvite();
        return;
      }
      
      // Otherwise, default share behavior
      // Copy link to clipboard
      await Clipboard.setStringAsync(APP_STORE_URL);
      
      // Share with native share sheet
      const message = `Check out EPISODA - the app for TV show discussions and recommendations! ${APP_STORE_URL}`;
      
      const result = await Share.share({
        message: message,
        url: APP_STORE_URL,
      });

      if (result.action === Share.sharedAction) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      }
    } catch (error) {
      console.error('Error sharing:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to share. Link copied to clipboard.');
      } else {
        Alert.alert('Error', 'Failed to share. Link copied to clipboard.');
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <Image 
            source={require('@/assets/images/rectangle4.png')} 
            style={styles.image}
            resizeMode="contain"
          />
          <View style={styles.textContainer}>
            <Text style={styles.title}>TV is more fun when shared</Text>
            <Text style={styles.subtitle}>
              Invite friends to see what they're watching, talk theories and delusions, and find your next binge!
            </Text>
          </View>
          <Button variant="primary" onPress={handleInviteFriends}>
            Invite friends!
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: 378,
    backgroundColor: colors.pureWhite,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 20,
    shadowColor: 'rgba(255, 255, 255, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  image: {
    width: 294.69,
    height: 258,
  },
  textContainer: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    ...typography.subtitle,
    width: 326,
    color: colors.black,
    textAlign: 'center',
  },
  subtitle: {
    width: 308,
    color: colors.grey3,
    textAlign: 'center',
    ...typography.p1,
  },
});
