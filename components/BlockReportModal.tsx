
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { ReportReason } from '@/types';
import * as Haptics from 'expo-haptics';

interface BlockReportModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'block' | 'report';
  username: string;
  onBlock: () => void;
  onReport: (reason: ReportReason, details: string) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function BlockReportModal({
  visible,
  onClose,
  type,
  username,
  onBlock,
  onReport,
}: BlockReportModalProps) {
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [selectedReason, setSelectedReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');

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
      setDetails('');
      setSelectedReason('spam');
    }
  }, [visible]);

  const handleBlock = () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block @${username}? They won't be able to see your profile or posts, and you won't see theirs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onBlock();
            onClose();
          },
        },
      ]
    );
  };

  const handleReport = () => {
    if (type === 'report') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onReport(selectedReason, details);
      onClose();
      Alert.alert('Report Submitted', 'Thank you for helping keep our community safe.');
    }
  };

  const reportReasons: { value: ReportReason; label: string }[] = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'inappropriate', label: 'Inappropriate Content' },
    { value: 'impersonation', label: 'Impersonation' },
    { value: 'other', label: 'Other' },
  ];

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
            <Text style={styles.title}>
              {type === 'block' ? 'Block User' : 'Report User'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {type === 'block' ? (
              <View style={styles.content}>
                <Text style={styles.description}>
                  Blocking @{username} will:
                </Text>
                <View style={styles.bulletList}>
                  <Text style={styles.bulletItem}>• Remove them from your followers</Text>
                  <Text style={styles.bulletItem}>• Hide all their content from you</Text>
                  <Text style={styles.bulletItem}>• Hide your content from them</Text>
                  <Text style={styles.bulletItem}>• Prevent them from following you</Text>
                </View>
                <Pressable style={styles.blockButton} onPress={handleBlock}>
                  <Text style={styles.blockButtonText}>Block @{username}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.content}>
                <Text style={styles.description}>
                  Why are you reporting @{username}?
                </Text>
                <View style={styles.reasonsList}>
                  {reportReasons.map((reason) => (
                    <Pressable
                      key={reason.value}
                      style={[
                        styles.reasonItem,
                        selectedReason === reason.value && styles.selectedReasonItem,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedReason(reason.value);
                      }}
                    >
                      <View
                        style={[
                          styles.radioButton,
                          selectedReason === reason.value && styles.radioButtonSelected,
                        ]}
                      >
                        {selectedReason === reason.value && (
                          <View style={styles.radioButtonInner} />
                        )}
                      </View>
                      <Text style={styles.reasonLabel}>{reason.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Additional Details (Optional)</Text>
                <TextInput
                  style={styles.textArea}
                  value={details}
                  onChangeText={setDetails}
                  placeholder="Provide more information about this report..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />

                <Pressable style={styles.reportButton} onPress={handleReport}>
                  <Text style={styles.reportButtonText}>Submit Report</Text>
                </Pressable>
              </View>
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
  content: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  bulletList: {
    marginBottom: 24,
  },
  bulletItem: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  blockButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  blockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reasonsList: {
    marginBottom: 24,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedReasonItem: {
    borderColor: colors.secondary,
    backgroundColor: `${colors.secondary}15`,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.secondary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.secondary,
  },
  reasonLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  reportButton: {
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
