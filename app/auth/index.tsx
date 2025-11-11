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
    <View style={styles.wrapper}>
      <ImageBackground
        source={require('../../assets/images/auth/welcome-background.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Top decorative images - positioned absolutely */}
        <Image
          source={require('../../assets/images/auth/top-stuff.png')}
          style={styles.topStuff}
          resizeMode="contain"
        />

        <View style={styles.container}>
          {/* Logo and tagline section - centered */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/images/auth/layer-1.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Make every episode social</Text>
          </View>

          {/* Bottom decorative images - below title */}
          <View style={styles.bottomImagesContainer}>
            <Image
              source={require('../../assets/images/auth/bottom-left.png')}
              style={styles.bottomLeft}
              resizeMode="contain"
            />
            <Image
              source={require('../../assets/images/auth/bottom-right.png')}
              style={styles.bottomRight}
              resizeMode="contain"
            />
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
                  source={require('../../assets/images/auth/apple-logo.png')}
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
                  source={require('../../assets/images/auth/phone-icon.png')}
                  style={styles.phoneIcon}
                  resizeMode="contain"
                />
                <Text style={styles.phoneButtonText}>Sign in with phone</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#7BA8FF',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  topStuff: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 250,
    alignSelf: 'center',
  },
  logoSection: {
    alignItems: 'center',
    gap: 20,
    zIndex: 10,
  },
  logo: {
    width: 110,
    height: 22,
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
  bottomImagesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 30,
    gap: 40,
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
  bottomLeft: {
    width: 100,
    height: 96,
  },
  bottomRight: {
    width: 85,
    height: 87,
  },
});
