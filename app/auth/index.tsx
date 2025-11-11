import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/tokens';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Splash/Welcome Screen - First screen in auth flow
 * Features:
 * - Cloud/sky background image
 * - EPISODA logo
 * - "Make every episode social" tagline
 * - "Sign in with Apple" button (custom styled)
 * - "Sign in with phone" button (custom styled)
 * - Decorative images (TV show cards, user avatars)
 */
export default function SplashScreen() {
  const router = useRouter();
  const { signInWithApple } = useAuth();
  const [appleLoading, setAppleLoading] = useState(false);

  const handlePhoneSignIn = () => {
    router.push('/auth/phone-entry');
  };

  const handleAppleSignIn = async () => {
    if (!signInWithApple) return;
    
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (error) {
      console.error('Apple sign-in error:', error);
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('@/assets/images/auth/welcome-background.jpg')}
      style={styles.wrapper}
      resizeMode="cover"
    >
      {/* Top decorative images - positioned absolutely */}
      <Image
        source={require('@/assets/images/auth/top-stuff.png')}
        style={styles.topStuff}
        resizeMode="contain"
      />

      <View style={styles.container}>
        {/* Logo and tagline section */}
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/auth/layer-1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Make every episode social</Text>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Buttons section */}
        <View style={styles.buttonSection}>
          {/* Apple Sign In Button */}
          <Pressable
            style={styles.appleButton}
            onPress={handleAppleSignIn}
            disabled={appleLoading}
          >
            <View style={styles.buttonContent}>
              <Image
                source={require('@/assets/images/auth/apple-logo.png')}
                style={styles.appleLogo}
                resizeMode="contain"
              />
              <Text style={styles.appleButtonText}>Sign in with Apple</Text>
            </View>
          </Pressable>

          {/* Phone Sign In Button */}
          <Pressable
            style={styles.phoneButton}
            onPress={handlePhoneSignIn}
          >
            <View style={styles.buttonContent}>
              <Image
                source={require('@/assets/images/auth/phone-icon.png')}
                style={styles.phoneIcon}
                resizeMode="contain"
              />
              <Text style={styles.phoneButtonText}>Sign in with phone</Text>
            </View>
          </Pressable>

          {/* "Sign in to get started" text */}
          <Text style={styles.signInText}>Sign in to get started</Text>
        </View>
      </View>

      {/* Bottom decorative images - positioned absolutely */}
      <Image
        source={require('@/assets/images/auth/bottom-left.png')}
        style={styles.bottomLeft}
        resizeMode="contain"
      />
      <Image
        source={require('@/assets/images/auth/bottom-right.png')}
        style={styles.bottomRight}
        resizeMode="contain"
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingTop: 100,
    paddingBottom: 60,
  },
  topStuff: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    width: '100%',
    maxWidth: 600,
    height: 300,
    alignSelf: 'center',
    opacity: 0.9,
  },
  logoSection: {
    alignItems: 'center',
    gap: 20,
  },
  logo: {
    width: 250,
    height: 50,
  },
  tagline: {
    maxWidth: 350,
    color: colors.pureWhite,
    textAlign: 'center',
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 48,
    fontStyle: 'italic',
    fontWeight: '400',
    letterSpacing: -1.48,
    lineHeight: 52,
  },
  spacer: {
    flex: 1,
  },
  buttonSection: {
    width: '100%',
    maxWidth: 362,
    gap: 12,
    alignItems: 'center',
  },
  appleButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 32,
    backgroundColor: colors.black,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: colors.pureWhite,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  appleLogo: {
    width: 18,
    height: 21,
  },
  appleButtonText: {
    color: colors.pureWhite,
    fontFamily: 'FunnelDisplay_500Medium',
    fontSize: 17,
    fontWeight: '500',
  },
  phoneIcon: {
    width: 20,
    height: 20,
  },
  phoneButtonText: {
    color: colors.black,
    fontFamily: 'FunnelDisplay_500Medium',
    fontSize: 17,
    fontWeight: '500',
  },
  signInText: {
    color: colors.pureWhite,
    textAlign: 'center',
    fontFamily: 'FunnelDisplay_500Medium',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.26,
    marginTop: 16,
  },
  bottomLeft: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    width: 100,
    height: 96,
    opacity: 0.95,
  },
  bottomRight: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 85,
    height: 87,
    opacity: 0.95,
  },
});
