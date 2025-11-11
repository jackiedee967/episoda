import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import { colors } from '@/styles/tokens';
import { useAuth } from '@/contexts/AuthContext';

const welcomeBackground = Asset.fromModule(require('../../assets/images/auth/welcome-background.jpg')).uri;
const layer1 = Asset.fromModule(require('../../assets/images/auth/layer-1.png')).uri;
const topStuff = Asset.fromModule(require('../../assets/images/auth/top-stuff.png')).uri;
const bottomLeft = Asset.fromModule(require('../../assets/images/auth/bottom-left.png')).uri;
const bottomRight = Asset.fromModule(require('../../assets/images/auth/bottom-right.png')).uri;
const appleLogo = Asset.fromModule(require('../../assets/images/auth/apple-logo.png')).uri;
const phoneIcon = Asset.fromModule(require('../../assets/images/auth/phone-icon.png')).uri;

/**
 * Splash/Welcome Screen - First screen in auth flow
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
        source={{ uri: welcomeBackground }}
        style={styles.backgroundImage}
        resizeMode="stretch"
      >
        {/* Top decorative images */}
        <Image
          source={{ uri: topStuff }}
          style={styles.topStuff}
          resizeMode="contain"
        />

        {/* Center content - logo and tagline */}
        <View style={styles.centerContent}>
          <Image
            source={{ uri: layer1 }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Make every episode social</Text>
          
          {/* Decorative images below tagline */}
          <View style={styles.decorativeImages}>
            <Image
              source={{ uri: bottomLeft }}
              style={styles.bottomLeft}
              resizeMode="contain"
            />
            <Image
              source={{ uri: bottomRight }}
              style={styles.bottomRight}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Bottom section - buttons */}
        <View style={styles.bottomSection}>
          <Text style={styles.signInText}>Sign in to get started</Text>
          
          {/* Phone Sign In Button */}
          <Pressable
            style={styles.phoneButton}
            onPress={handlePhoneSignIn}
          >
            <View style={styles.buttonContent}>
              <Image
                source={{ uri: phoneIcon }}
                style={styles.phoneIcon}
                resizeMode="contain"
              />
              <Text style={styles.phoneButtonText}>Sign in with phone</Text>
            </View>
          </Pressable>

          {/* Apple Sign In Button */}
          <Pressable
            style={styles.appleButton}
            onPress={handleAppleSignIn}
            disabled={appleLoading}
          >
            <View style={styles.buttonContent}>
              <Image
                source={{ uri: appleLogo }}
                style={styles.appleLogo}
                resizeMode="contain"
              />
              <Text style={styles.appleButtonText}>Sign in with Apple</Text>
            </View>
          </Pressable>
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
  topStuff: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 250,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logo: {
    width: 110,
    height: 22,
    marginBottom: 20,
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
  decorativeImages: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    marginTop: 30,
  },
  bottomLeft: {
    width: 100,
    height: 96,
  },
  bottomRight: {
    width: 85,
    height: 87,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 12,
  },
  signInText: {
    color: colors.pureWhite,
    textAlign: 'center',
    fontFamily: 'FunnelDisplay_500Medium',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.26,
    marginBottom: 8,
  },
  phoneButton: {
    width: '100%',
    maxWidth: 362,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: colors.pureWhite,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appleButton: {
    width: '100%',
    maxWidth: 362,
    paddingVertical: 18,
    paddingHorizontal: 32,
    backgroundColor: colors.black,
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
});
