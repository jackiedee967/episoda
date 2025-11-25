import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { colors, typography } from '@/styles/tokens';
import { supabase } from '@/integrations/supabase/client';
import { useData } from '@/contexts/DataContext';
import { Show } from '@/types';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';

const SCREEN_HEIGHT = Dimensions.get('window').height;

async function saveShowRating(userId: string, showId: string, rating: number): Promise<void> {
  console.log('📡 Saving show rating via RPC', { userId, showId, rating });
  
  const { error } = await (supabase.rpc as any)('upsert_show_rating', {
    user_id_param: userId,
    show_id_param: showId,
    rating_param: rating
  });
  
  if (error) {
    console.error('Error saving rating:', error);
    throw new Error(error.message);
  }
  
  console.log('✅ Rating saved successfully');
}

interface ShowRatingModalProps {
  visible: boolean;
  onClose: () => void;
  show: Show | null;
  onShareAsPost: (rating: number) => void;
  existingRating?: number;
}

interface HalfStarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  size?: number;
}

function HalfStarRating({ rating, onRatingChange, size = 40 }: HalfStarRatingProps) {
  const currentRatingRef = useRef(rating);
  
  useEffect(() => {
    currentRatingRef.current = rating;
  }, [rating]);

  const handlePress = (value: number) => {
    currentRatingRef.current = value;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRatingChange(value);
  };

  const renderStar = (starNumber: number) => {
    const highlightColor = colors.greenHighlight;
    const emptyColor = colors.grey2;
    
    const fillAmount = Math.max(0, Math.min(1, rating - (starNumber - 1)));
    const isFull = fillAmount >= 1;
    const isHalf = fillAmount >= 0.5 && fillAmount < 1;
    const isEmpty = fillAmount < 0.5;
    
    return (
      <View key={starNumber} style={[styles.starContainer, { width: size, height: size + 16 }]}>
        <View style={styles.starVisual} pointerEvents="none">
          {isEmpty ? (
            <Star size={size} color={emptyColor} fill="none" strokeWidth={1.5} />
          ) : null}
          {isHalf ? (
            <View style={styles.starWrapper}>
              <Star size={size} color={emptyColor} fill="none" strokeWidth={1.5} />
              <View style={[styles.halfStarOverlay, { width: size / 2 }]}>
                <Star size={size} color={highlightColor} fill={highlightColor} strokeWidth={1.5} />
              </View>
            </View>
          ) : null}
          {isFull ? (
            <Star size={size} color={highlightColor} fill={highlightColor} strokeWidth={1.5} />
          ) : null}
        </View>
        
        <Pressable
          onPress={() => handlePress(starNumber - 0.5)}
          style={[styles.touchZoneLeft, { width: size / 2, height: size + 16 }]}
        />
        <Pressable
          onPress={() => handlePress(starNumber)}
          style={[styles.touchZoneRight, { width: size / 2, height: size + 16 }]}
        />
      </View>
    );
  };

  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map(renderStar)}
    </View>
  );
}

export default function ShowRatingModal({ 
  visible, 
  onClose, 
  show, 
  onShareAsPost,
  existingRating = 0 
}: ShowRatingModalProps) {
  const { currentUser } = useData();
  const [rating, setRating] = useState(existingRating);
  const [step, setStep] = useState<'rate' | 'success'>('rate');
  const [isSaving, setIsSaving] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRating(existingRating);
      setStep('rate');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSaveRating = async () => {
    if (!show || !currentUser?.id || rating === 0) return;
    
    setIsSaving(true);
    try {
      await saveShowRating(currentUser.id, show.id, rating);

      console.log('✅ Show rating saved successfully');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('success');
    } catch (err) {
      console.error('Error saving rating:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShareAsPost = () => {
    onClose();
    setTimeout(() => {
      onShareAsPost(rating);
    }, 300);
  };

  const handleClose = () => {
    setStep('rate');
    setRating(existingRating);
    onClose();
  };

  const handleDone = () => {
    setStep('rate');
    onClose();
  };

  const renderRatingText = () => {
    if (rating === 0) return 'Tap to rate';
    if (rating === 5) return 'Masterpiece!';
    if (rating >= 4) return 'Great!';
    if (rating >= 3) return 'Good';
    if (rating >= 2) return 'Okay';
    return 'Not great';
  };

  if (!show) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="light" />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.handle} />
          
          {step === 'rate' ? (
            <View style={styles.content}>
              <View style={styles.showInfo}>
                <Image
                  source={{ uri: getPosterUrl(show.poster, show.title) }}
                  style={styles.poster}
                  contentFit="cover"
                />
                <View style={styles.showDetails}>
                  <Text style={styles.rateLabel}>Rate this show</Text>
                  <Text style={styles.showTitle} numberOfLines={2}>{show.title}</Text>
                  {show.year ? (
                    <Text style={styles.showYear}>{show.year}</Text>
                  ) : null}
                </View>
              </View>
              
              <View style={styles.ratingSection}>
                <HalfStarRating rating={rating} onRatingChange={setRating} size={44} />
                <Text style={styles.ratingText}>{renderRatingText()}</Text>
              </View>
              
              <Pressable
                style={[
                  styles.submitButton,
                  (rating === 0 || isSaving) && styles.submitButtonDisabled
                ]}
                onPress={handleSaveRating}
                disabled={rating === 0 || isSaving}
              >
                <Text style={styles.submitButtonText}>
                  {isSaving ? 'Saving...' : existingRating > 0 ? 'Update Rating' : 'Rate Show'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.content}>
              <View style={styles.successSection}>
                <View style={styles.successIconContainer}>
                  <Star size={48} color={colors.greenHighlight} fill={colors.greenHighlight} />
                </View>
                <Text style={styles.successTitle}>You rated {show.title}</Text>
                <View style={styles.successRating}>
                  <HalfStarRating rating={rating} onRatingChange={() => {}} size={32} />
                </View>
              </View>
              
              <View style={styles.successButtons}>
                <Pressable style={styles.shareButton} onPress={handleShareAsPost}>
                  <Text style={styles.shareButtonText}>Share as Post</Text>
                </Pressable>
                <Pressable style={styles.doneButton} onPress={handleDone}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContainer: {
    backgroundColor: colors.pureWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    minHeight: 320,
  },
  handle: {
    width: 36,
    height: 5,
    backgroundColor: colors.grey2,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  content: {
    paddingHorizontal: 24,
  },
  showInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  poster: {
    width: 70,
    height: 105,
    borderRadius: 8,
    backgroundColor: colors.grey2,
  },
  showDetails: {
    flex: 1,
  },
  rateLabel: {
    ...typography.p1,
    color: colors.grey1,
    marginBottom: 4,
  },
  showTitle: {
    ...typography.titleL,
    color: colors.black,
    marginBottom: 4,
  },
  showYear: {
    ...typography.p1,
    color: colors.grey1,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  starContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  starVisual: {
    position: 'absolute',
  },
  starWrapper: {
    position: 'relative',
  },
  halfStarOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  touchZoneLeft: {
    position: 'absolute',
    left: 0,
    top: -8,
  },
  touchZoneRight: {
    position: 'absolute',
    right: 0,
    top: -8,
  },
  ratingText: {
    ...typography.subtitle,
    color: colors.grey1,
    marginTop: 16,
  },
  submitButton: {
    backgroundColor: colors.greenHighlight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.grey2,
  },
  submitButtonText: {
    ...typography.subtitle,
    color: colors.black,
  },
  successSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    ...typography.titleL,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  successRating: {
    marginBottom: 8,
  },
  successButtons: {
    gap: 12,
  },
  shareButton: {
    backgroundColor: colors.greenHighlight,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    ...typography.subtitle,
    color: colors.black,
  },
  doneButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.grey2,
  },
  doneButtonText: {
    ...typography.subtitle,
    color: colors.black,
  },
});
