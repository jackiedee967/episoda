import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, ImageBackground, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
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
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.container}>
        {/* Top decorative images */}
        <Image
          source={require('@/assets/images/auth/top-stuff.png')}
          style={styles.topStuff}
          resizeMode="contain"
        />

        {/* Logo and tagline section */}
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/auth/layer-1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Make every episode social</Text>
        </View>

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
        </View>

        {/* "Sign in to get started" text */}
        <Text style={styles.signInText}>Sign in to get started</Text>

        {/* Bottom decorative images */}
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
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  topStuff: {
    position: 'absolute',
    top: 0,
    width: 577,
    height: 366,
    alignSelf: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 120,
    marginBottom: 'auto',
  },
  logo: {
    width: 300,
    height: 60,
    marginBottom: 24,
  },
  tagline: {
    width: 369,
    color: colors.pureWhite,
    textAlign: 'center',
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize: 74,
    fontStyle: 'italic',
    fontWeight: '400',
    letterSpacing: -1.48,
    lineHeight: 74,
  },
  buttonSection: {
    width: '100%',
    maxWidth: 362,
    gap: 10,
    marginBottom: 20,
  },
  appleButton: {
    width: '100%',
    paddingVertical: 19,
    paddingHorizontal: 64,
    backgroundColor: colors.black,
    borderRadius: 73,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: colors.pureWhite,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appleLogo: {
    width: 20,
    height: 23,
  },
  appleButtonText: {
    color: colors.pureWhite,
    fontFamily: 'FunnelDisplay_500Medium',
    fontSize: 17,
    fontWeight: '500',
  },
  phoneIcon: {
    width: 24,
    height: 24,
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
    marginBottom: 40,
  },
  bottomLeft: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 113,
    height: 108,
  },
  bottomRight: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 94,
    height: 96,
  },
});
