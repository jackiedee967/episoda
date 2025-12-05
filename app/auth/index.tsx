import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/integrations/supabase/client';

/**
 * Splash/Welcome Screen - First screen in auth flow
 */
export default function SplashScreen() {
  const router = useRouter();
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    // Check if Apple Sign In is available on this device
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  const handlePhoneSignIn = () => {
    router.push('/auth/phone-number');
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('Apple credential:', credential);

      // Sign in with Supabase using the Apple ID token
      if (credential.identityToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          console.error('Apple sign in error:', error);
          
          if (error.message.includes('not enabled')) {
            Alert.alert(
              'Apple Sign-In Not Configured',
              'Apple Sign-In is not configured in this app yet.\n\n' +
              'The administrator needs to configure Apple as an auth provider in Supabase.\n\n' +
              'Please try phone authentication instead.'
            );
          } else {
            Alert.alert('Error', error.message);
          }
        } else {
          console.log('Apple sign in successful:', data);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Create profile if it doesn't exist
          if (data.user) {
            const { error: profileError } = await supabase
              .from('profiles' as any)
              .upsert({
                user_id: data.user.id,
                username: data.user.email?.split('@')[0] || `user_${data.user.id.slice(0, 8)}`,
                display_name: credential.fullName?.givenName 
                  ? `${credential.fullName.givenName} ${credential.fullName.familyName || ''}`.trim()
                  : data.user.email?.split('@')[0] || 'User',
                avatar_url: null,
                bio: null,
              }, {
                onConflict: 'user_id',
                ignoreDuplicates: false,
              });

            if (profileError) {
              console.error('Profile creation error:', profileError);
            }
          }
          
          // User is now signed in, navigation will be handled by auth state change
        }
      } else {
        Alert.alert('Error', 'No identity token received from Apple');
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign-in flow
        console.log('User canceled Apple sign in');
      } else {
        console.error('Apple sign in error:', error);
        Alert.alert('Error', 'Failed to sign in with Apple. Please try again.');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#7BA8FF', '#5B8DEE', '#3D6FD9', '#2855C5']}
        locations={[0, 0.3, 0.6, 1]}
        style={styles.gradient}
      >
        {/* Top decorative images */}
        <Image
          source={require('../../assets/images/auth/top-stuff.png')}
          style={styles.topStuff}
          resizeMode="contain"
        />

        {/* Center content - logo and tagline */}
        <View style={styles.centerContent}>
          <Image
            source={require('../../assets/images/auth/layer-1.png')}
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
          source={require('../../assets/images/auth/bottom-combined.png')}
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
                source={require('../../assets/images/auth/phone-icon.png')}
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
                source={require('../../assets/images/auth/apple-logo.png')}
                style={styles.appleLogo}
                resizeMode="contain"
              />
              <Text style={styles.appleButtonText}>Sign in with Apple</Text>
            </View>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#7BA8FF',
  },
  gradient: {
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
