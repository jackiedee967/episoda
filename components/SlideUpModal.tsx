import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors } from '@/styles/commonStyles';

interface SlideUpModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: number;
  showHandle?: boolean;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ANIMATION_DURATION = 250;

export default function SlideUpModal({
  visible,
  onClose,
  children,
  maxHeight = SCREEN_HEIGHT * 0.85,
  showHandle = true,
}: SlideUpModalProps) {
  const [isModalVisible, setIsModalVisible] = useState(visible);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setIsModalVisible(true);
      translateY.value = withSpring(0, {
        damping: 18,
        stiffness: 120,
        mass: 0.8,
      });
      backdropOpacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    } else if (isModalVisible) {
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
      }, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(setIsModalVisible)(false);
          runOnJS(onClose)();
        }
      });
      backdropOpacity.value = withTiming(0, {
        duration: ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible, onClose]);

  const handleClose = useCallback(() => {
    translateY.value = withTiming(SCREEN_HEIGHT, {
      duration: ANIMATION_DURATION,
      easing: Easing.in(Easing.cubic),
    }, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(setIsModalVisible)(false);
        runOnJS(onClose)();
      }
    });
    backdropOpacity.value = withTiming(0, {
      duration: ANIMATION_DURATION,
      easing: Easing.in(Easing.cubic),
    });
  }, [onClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isModalVisible) {
    return null;
  }

  return (
    <Modal visible={isModalVisible} transparent animationType="none" onRequestClose={handleClose}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.modalContainer,
            { maxHeight },
            modalStyle,
          ]}
        >
          {showHandle && <View style={styles.handle} />}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    backgroundColor: colors.pageBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 8,
  },
});
