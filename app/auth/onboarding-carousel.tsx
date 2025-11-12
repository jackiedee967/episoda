import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { AuthButton } from '@/components/auth/AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ONBOARDING_SLIDES = [
  {
    id: '1',
    image: require('@/assets/onboarding/step1.png'),
    title: 'Log and track\nyour shows',
    description: 'Keep track of what you\'ve watched and\nlet your friends see what you\'re into.',
  },
  {
    id: '2',
    image: require('@/assets/onboarding/step2.png'),
    title: 'See what friends are\ncurrently watching',
    description: 'See what your friends are watching so\nyou can keep up (& weigh in).',
  },
  {
    id: '3',
    image: require('@/assets/onboarding/step3.png'),
    title: 'Talk theories, hot takes,\nand delusions',
    titleItalicWord: 'delusions',
    description: 'Write statuses, comments, and discuss\nyour emotional support characters.',
  },
  {
    id: '4',
    image: require('@/assets/onboarding/step4.png'),
    title: 'Find your next\nobsession',
    titleItalicWord: 'obsession',
    description: 'Discover what to watch next - straight\nfrom your circle of people who get you.',
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
    const renderTitle = () => {
      if (item.titleItalicWord) {
        const parts = item.title.split(item.titleItalicWord);
        return (
          <Text style={styles.slideTitle}>
            {parts[0]}
            <Text style={styles.italicText}>{item.titleItalicWord}</Text>
            {parts[1]}
          </Text>
        );
      }
      return <Text style={styles.slideTitle}>{item.title}</Text>;
    };

    return (
      <View style={styles.slide}>
        <View style={styles.imageContainer}>
          <Image
            source={item.image}
            style={styles.mockupImage}
            contentFit="contain"
          />
        </View>
        {renderTitle()}
        <Text style={styles.slideDescription}>{item.description}</Text>
      </View>
    );
  };

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  return (
    <ImageBackground
      source={require('@/assets/onboarding/background.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  imageContainer: {
    width: '100%',
    height: '50%',
    marginBottom: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockupImage: {
    width: '100%',
    height: '100%',
  },
  slideTitle: {
    ...typography.titleXl,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  italicText: {
    fontStyle: 'italic',
  },
  slideDescription: {
    ...typography.subtitleR,
    color: colors.black,
    textAlign: 'center',
    opacity: 0.8,
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
    backgroundColor: colors.black,
    opacity: 0.3,
  },
  dotActive: {
    opacity: 1,
    backgroundColor: colors.black,
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
    color: colors.black,
  },
});
