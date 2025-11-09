import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { GradientBackground } from './_components/GradientBackground';
import { AuthButton } from './_components/AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { Tv, Users, Heart, TrendingUp } from 'lucide-react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ONBOARDING_SLIDES = [
  {
    id: '1',
    icon: Tv,
    title: 'Track Your Shows',
    description: 'Log every episode you watch and keep track of your TV show journey',
  },
  {
    id: '2',
    icon: Users,
    title: 'Connect with Friends',
    description: 'Follow friends, see what they are watching, and share your favorite moments',
  },
  {
    id: '3',
    icon: Heart,
    title: 'Share Your Thoughts',
    description: 'Post reviews, rate episodes, and engage with the community',
  },
  {
    id: '4',
    icon: TrendingUp,
    title: 'Discover New Shows',
    description: 'Get personalized recommendations based on your watching habits',
  },
];

/**
 * Onboarding Carousel Screen - Final step in auth flow
 * Features:
 * - 4 swipeable screens explaining app features
 * - Pagination dots
 * - "Get Started" button on final screen
 * - Navigates to main app on completion
 */
export default function OnboardingCarouselScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (completeOnboarding) {
        await completeOnboarding();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/' as any);
    } catch (error) {
      console.error('Complete onboarding error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSlide = ({ item }: { item: typeof ONBOARDING_SLIDES[0] }) => {
    const Icon = item.icon;

    return (
      <View style={styles.slide}>
        <View style={styles.iconContainer}>
          <Icon size={80} color={colors.pureWhite} strokeWidth={1.5} />
        </View>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    );
  };

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  return (
    <GradientBackground>
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={ONBOARDING_SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          bounces={false}
        />

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {ONBOARDING_SLIDES.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.buttonContainer}>
            {isLastSlide ? (
              <AuthButton
                title="Get Started"
                onPress={handleGetStarted}
                loading={loading}
                variant="primary"
              />
            ) : (
              <Pressable onPress={handleNext} style={styles.skipButton}>
                <Text style={styles.skipText}>Next</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  slideTitle: {
    ...typography.titleL,
    color: colors.pureWhite,
    textAlign: 'center',
    marginBottom: 16,
  },
  slideDescription: {
    ...typography.subtitle,
    color: colors.almostWhite,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.almostWhite,
    opacity: 0.4,
  },
  dotActive: {
    opacity: 1,
    backgroundColor: colors.greenHighlight,
  },
  buttonContainer: {
    width: '100%',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    ...typography.subtitle,
    color: colors.pureWhite,
  },
});
