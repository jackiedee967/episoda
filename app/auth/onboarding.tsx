import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ImageBackground,
  Dimensions,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import { colors } from '@/styles/tokens';
import ButtonL from '@/components/ButtonL';
import { PaginationDots } from '@/components/PaginationDots';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const gradientBg = Asset.fromModule(require('../../assets/images/onboarding/gradient-background.jpg')).uri;
const step1 = Asset.fromModule(require('../../assets/images/onboarding/step-1.png')).uri;
const step2 = Asset.fromModule(require('../../assets/images/onboarding/step-2.png')).uri;
const step3 = Asset.fromModule(require('../../assets/images/onboarding/step-3.png')).uri;
const step4 = Asset.fromModule(require('../../assets/images/onboarding/step-4.png')).uri;

export const options = {
  headerShown: false,
};

interface OnboardingSlide {
  id: number;
  image: string;
  title: string;
  subtitle: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    image: step1,
    title: 'Log and track your shows',
    subtitle: 'Keep track of what you\'ve watched and let your friends see what you\'re into.',
  },
  {
    id: 2,
    image: step2,
    title: 'See what friends are currently watching',
    subtitle: 'See what your friends are watching so you can keep up (& weigh in).',
  },
  {
    id: 3,
    image: step3,
    title: 'Talk theories, hot takes, and delusions',
    subtitle: 'Write statuses, comments, and discuss your emotional support characters.',
  },
  {
    id: 4,
    image: step4,
    title: 'Find your next obsession',
    subtitle: 'Discover what to watch next - straight from your circle of people who get you.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: SCREEN_WIDTH * (currentIndex + 1),
        animated: true,
      });
    } else {
      // Navigate to phone number signup
      router.replace('/auth/phone-number');
    }
  };

  const handleSkip = () => {
    router.replace('/auth/phone-number');
  };

  return (
    <ImageBackground
      source={{ uri: gradientBg }}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Skip button */}
      <View style={styles.skipContainer}>
        <Pressable onPress={handleSkip} hitSlop={8}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* Phone mockup image */}
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: slide.image }}
                style={styles.phoneImage}
                resizeMode="contain"
              />
            </View>

            {/* Text content */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>
                {slide.id === 3 ? (
                  <>
                    <Text style={styles.titleRegular}>Talk theories, hot takes,{'\n'}and </Text>
                    <Text style={styles.titleItalic}>delusions</Text>
                  </>
                ) : slide.id === 4 ? (
                  <>
                    <Text style={styles.titleRegular}>Find your next{'\n'}</Text>
                    <Text style={styles.titleItalic}>obsession</Text>
                  </>
                ) : (
                  <Text style={styles.titleRegular}>{slide.title}</Text>
                )}
              </Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom section */}
      <View style={styles.bottomContainer}>
        {/* Pagination dots */}
        <View style={styles.paginationContainer}>
          <PaginationDots total={slides.length} current={currentIndex + 1} />
        </View>

        {/* Next/Get Started button */}
        <View style={styles.buttonContainer}>
          <ButtonL onPress={handleNext}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </ButtonL>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
  },
  skipText: {
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 16,
    color: colors.black,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxHeight: '60%',
  },
  phoneImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 60,
  },
  title: {
    fontSize: 35,
    fontWeight: '400',
    letterSpacing: -0.7,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  titleRegular: {
    fontFamily: 'InstrumentSerif_400Regular',
  },
  titleItalic: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
  },
  subtitle: {
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 13,
    fontWeight: '300',
    color: colors.black,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomContainer: {
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    gap: 24,
  },
  paginationContainer: {
    alignItems: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
});
