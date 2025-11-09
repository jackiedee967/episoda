import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { GradientBackground } from '@/components/auth/GradientBackground';
import { AuthButton } from '@/components/auth/AuthButton';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Splash/Welcome Screen - First screen in auth flow
 * Features:
 * - Purple-to-orange gradient background
 * - App logo and title
 * - "Sign in with phone" button
 * - "Sign in with Apple" button (iOS only)
 */
export default function SplashScreen() {
  const router = useRouter();
  const { signInWithApple } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

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
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Logo/Branding Section */}
          <View style={styles.logoSection}>
            <Text style={styles.title}>EPISODA</Text>
            <Text style={styles.subtitle}>Your TV Show Social Network</Text>
          </View>

          {/* CTA Buttons */}
          <View style={styles.buttonSection}>
            <AuthButton
              title="Sign in with phone"
              onPress={handlePhoneSignIn}
              variant="primary"
            />

            {appleAvailable && Platform.OS === 'ios' && (
              <View style={styles.appleButtonContainer}>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12}
                  style={styles.appleButton}
                  onPress={handleAppleSignIn}
                />
              </View>
            )}

            <Text style={styles.termsText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    flex: 1,
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.titleXl,
    color: colors.pureWhite,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.almostWhite,
    textAlign: 'center',
    opacity: 0.9,
  },
  buttonSection: {
    width: '100%',
    paddingBottom: 48,
    gap: 16,
  },
  appleButtonContainer: {
    width: '100%',
  },
  appleButton: {
    width: '100%',
    height: 56,
  },
  termsText: {
    ...typography.p1,
    color: colors.almostWhite,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 8,
  },
});
