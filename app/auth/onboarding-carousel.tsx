import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { AuthButton } from '@/components/auth/AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const step1Image = require('../../assets/onboarding/step1.png');
const step2Image = require('../../assets/onboarding/step2.png');
const step3Image = require('../../assets/onboarding/step3.png');
const step4Image = require('../../assets/onboarding/step4.png');

const SCREEN_WIDTH = Dimensions.get('window').width;

const ONBOARDING_SLIDES = [
  {
    id: '1',
    image: step1Image,
    title: 'Log and track\nyour shows',
    description: 'Keep track of what you\'ve watched and\nlet your friends see what you\'re into.',
  },
  {
    id: '2',
    image: step2Image,
    title: 'See what friends are\ncurrently watching',
    description: 'See what your friends are watching so\nyou can keep up (& weigh in).',
  },
  {
    id: '3',
    image: step3Image,
    title: 'Talk theories, hot takes,\nand delusions',
    titleItalicWord: 'delusions',
    description: 'Write statuses, comments, and discuss\nyour emotional support characters.',
  },
  {
    id: '4',
    image: step4Image,
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
            resizeMode="contain"
          />
        </View>
        <View style={styles.textContainer}>
          {renderTitle()}
          <Text style={styles.slideDescription}>{item.description}</Text>
        </View>
      </View>
    );
  };

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFFFFF', '#FFC0F5', '#FFD4A3', '#A3FFD4']}
      locations={[0, 0.7, 0.85, 0.92, 1]}
      style={styles.backgroundImage}
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

          {isLastSlide && (
            <View style={styles.buttonContainer}>
              <AuthButton
                title="Get Started"
                onPress={handleGetStarted}
                loading={loading}
                variant="primary"
              />
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
  },
  imageContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: -8,
  },
  mockupImage: {
    width: 335,
    height: 450,
  },
  textContainer: {
    width: '100%',
    paddingHorizontal: 32,
    paddingBottom: 120,
    alignItems: 'center',
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
});
