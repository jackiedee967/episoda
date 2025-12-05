import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import { colors } from '@/styles/tokens';
import { useAuth } from '@/contexts/AuthContext';

const welcomeBackgroundModule = require('../../assets/images/auth/welcome-background.jpg');
const layer1Module = require('../../assets/images/auth/layer-1.png');
const topStuffModule = require('../../assets/images/auth/top-stuff.png');
const bottomCombinedModule = require('../../assets/images/auth/bottom-combined.png');
const appleLogoModule = require('../../assets/images/auth/apple-logo.png');
const phoneIconModule = require('../../assets/images/auth/phone-icon.png');

/**
 * Splash/Welcome Screen - First screen in auth flow
 */
export default function SplashScreen() {
  const router = useRouter();
  const { signInWithApple } = useAuth();
  const [appleLoading, setAppleLoading] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [assetUris, setAssetUris] = useState<{
    welcomeBackground: string;
    layer1: string;
    topStuff: string;
    bottomCombined: string;
    appleLogo: string;
    phoneIcon: string;
  } | null>(null);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const assets = await Asset.loadAsync([
          welcomeBackgroundModule,
          layer1Module,
          topStuffModule,
          bottomCombinedModule,
          appleLogoModule,
          phoneIconModule,
        ]);
        
        setAssetUris({
          welcomeBackground: assets[0].localUri || assets[0].uri,
          layer1: assets[1].localUri || assets[1].uri,
          topStuff: assets[2].localUri || assets[2].uri,
          bottomCombined: assets[3].localUri || assets[3].uri,
          appleLogo: assets[4].localUri || assets[4].uri,
          phoneIcon: assets[5].localUri || assets[5].uri,
        });
        setAssetsLoaded(true);
      } catch (error) {
        console.error('Failed to load auth assets:', error);
        setAssetsLoaded(true);
      }
    };
    
    loadAssets();
  }, []);

  const handlePhoneSignIn = () => {
    router.push('/auth/phone-number');
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

  if (!assetsLoaded || !assetUris) {
    return (
      <View style={[styles.wrapper, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ImageBackground
        source={{ uri: assetUris.welcomeBackground }}
        style={styles.backgroundImage}
        resizeMode="stretch"
      >
        {/* Top decorative images */}
        <Image
          source={{ uri: assetUris.topStuff }}
          style={styles.topStuff}
          resizeMode="contain"
        />

        {/* Center content - logo and tagline */}
        <View style={styles.centerContent}>
          <Image
            source={{ uri: assetUris.layer1 }}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>
            <Text style={styles.taglineRegular}>Make every episode </Text>
            <Text style={styles.taglineItalic}>social</Text>
          </Text>
        </View>

        {/* Decorative image below tagline - positioned to extend beyond padding */}
        <Image
          source={{ uri: assetUris.bottomCombined }}
          style={styles.bottomCombined}
          resizeMode="contain"
        />

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
                source={{ uri: assetUris.phoneIcon }}
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
                source={{ uri: assetUris.appleLogo }}
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    width: '154%',
    marginLeft: '-27%',
    height: 350,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: -95,
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
    fontSize: 65,
    fontWeight: '400',
    letterSpacing: -1.48,
    lineHeight: 70,
  },
  taglineRegular: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontStyle: 'normal',
  },
  taglineItalic: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontStyle: 'italic',
  },
  bottomCombined: {
    position: 'absolute',
    width: 532,
    height: 168,
    top: '50%',
    marginTop: 60,
    alignSelf: 'center',
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
    width: 16,
    height: 19,
  },
  appleButtonText: {
    color: colors.pureWhite,
    fontFamily: 'FunnelDisplay_500Medium',
    fontSize: 17,
    fontWeight: '500',
  },
});
