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
    // If parent provided a custom onInvite handler, use that
    if (onInvite) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
      onInvite();
      return;
    }
    
    // Otherwise, default share behavior
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
    
    // Copy link to clipboard first
    let clipboardSuccess = false;
    try {
      await Clipboard.setStringAsync(APP_STORE_URL);
      clipboardSuccess = true;
    } catch (clipboardError) {
      console.warn('Clipboard access failed:', clipboardError);
    }
    
    // Share with native share sheet - use only message to avoid iOS issues
    const message = `Check out EPISODA - the app for TV show discussions and recommendations! ${APP_STORE_URL}`;
    
    // Wrap Share.share in a setTimeout to prevent iOS crash
    if (Platform.OS === 'ios') {
      setTimeout(async () => {
        try {
          const result = await Share.share({
            message: message,
          });
          if (result.action === Share.sharedAction) {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (e) {}
            onClose();
          }
        } catch (shareError) {
          console.error('Share sheet error:', shareError);
          Alert.alert('Copied!', 'Link copied to clipboard.');
          onClose();
        }
      }, 100);
    } else if (Platform.OS === 'web') {
      // Web doesn't support native share, just copy to clipboard
      if (clipboardSuccess) {
        window.alert('Link copied to clipboard!');
      } else {
        window.alert('Failed to copy link. Please try again.');
      }
      onClose();
    } else {
      // Android
      try {
        const result = await Share.share({
          message: message,
        });
        if (result.action === Share.sharedAction) {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (e) {}
          onClose();
        }
      } catch (shareError) {
        console.error('Share sheet error:', shareError);
        Alert.alert('Copied!', 'Link copied to clipboard.');
        onClose();
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
          <Button variant="primary" onPress={handleInviteFriends} fullWidth>
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
    ...typography.titleL,
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
