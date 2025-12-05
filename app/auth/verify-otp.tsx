import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { PaginationDots } from '@/components/PaginationDots';
import ButtonL from '@/components/ButtonL';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { checkRateLimit } from '@/services/rateLimiting';

export const options = {
  headerShown: false,
};

/**
 * OTP Verification Screen - Step 3 in auth flow
 * Features:
 * - Six-digit OTP input boxes
 * - Auto-advance between inputs
 * - Resend code with countdown timer
 * - Validates OTP with Supabase
 * - Navigates to username-select on success
 */
export default function VerifyOTPScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOTP, verifyPhoneOTP } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setOtp(cleaned);

    if (cleaned.length === 6) {
      handleVerifyOtp(cleaned);
    }
  };

  const handleVerifyOtp = async (otpCode?: string) => {
    const code = otpCode || otp;

    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (!verifyOTP) {
        Alert.alert('Error', 'Authentication system not ready. Please try again.');
        return;
      }

      const result = await verifyOTP(phone, code);

      if (result.error) {
        const error = result.error;
        if (error.message.includes('expired')) {
          Alert.alert('Code Expired', 'This verification code has expired. Please request a new one.');
        } else if (error.message.includes('invalid')) {
          Alert.alert('Invalid Code', 'The code you entered is incorrect. Please try again.');
        } else {
          Alert.alert('Error', error.message);
        }
        setOtp('');
        inputRef.current?.focus();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Wait briefly for AuthContext to load onboarding status before navigating
        // This prevents race conditions where AuthNavigator routes before status is ready
        await new Promise(resolve => setTimeout(resolve, 300));
        // Let AuthNavigator handle routing based on onboarding status
        // This ensures existing users go to /(tabs)/ and new users continue through signup
        router.replace('/auth');
      }
    } catch (error: any) {
      console.error('OTP verification exception:', error);
      Alert.alert('Error', 'Failed to verify code. Please try again.');
      setOtp('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setResending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Check rate limit before resending OTP
      const rateLimitResult = await checkRateLimit(phone, 'otp');
      if (!rateLimitResult.allowed) {
        Alert.alert(
          'Too Many Attempts',
          rateLimitResult.error || 'Please wait before requesting another code.'
        );
        setResending(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({ phone: phone });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Verification code sent!');
        setCountdown(60);
        setOtp('');
        inputRef.current?.focus();
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ImageBackground
        source={require('../../assets/images/auth/Background.png')}
        style={styles.backgroundImage}
        resizeMode="stretch"
      >
        {/* Top logo */}
        <View style={styles.topContainer}>
          <Image
            source={require('../../assets/images/auth/layer-1.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Main content */}
        <View style={styles.centerContent}>
          {/* Header text */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              {phone}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.otpContainer}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.otpInput,
                  otp.length > 0 && styles.otpInputFilled,
                  loading && styles.otpInputDisabled,
                ]}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={colors.grey1}
                selectTextOnFocus
                editable={!loading}
                autoFocus
              />
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.pureWhite} />
                <Text style={styles.loadingText}>Verifying code...</Text>
              </View>
            ) : null}

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              <Pressable
                onPress={handleResendCode}
                disabled={countdown > 0 || resending}
              >
                {resending ? (
                  <ActivityIndicator size="small" color={colors.greenHighlight} />
                ) : (
                  <Text style={[styles.resendButtonText, countdown > 0 && styles.resendButtonTextDisabled]}>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                  </Text>
                )}
              </Pressable>
            </View>

            <ButtonL
              onPress={() => handleVerifyOtp()}
              disabled={otp.length !== 6 || loading}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </ButtonL>

            {/* Terms text */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                Enter the 6-digit code sent to your phone. The code expires in 60 seconds.
              </Text>
            </View>

            {/* Pagination dots */}
            <View style={styles.paginationInline}>
              <PaginationDots total={5} current={2} testID="pagination-dots" />
            </View>
          </View>
        </View>

        {/* Bottom decorative image */}
        <Image
          source={require('../../assets/images/auth/layer12.png')}
          style={styles.layer12}
          resizeMode="contain"
        />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  topContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  logo: {
    width: 99,
    height: 19.8,
  },
  centerContent: {
    flex: 1,
    paddingHorizontal: 40,
    justifyContent: 'center',
    gap: 44,
  },
  headerContainer: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: colors.pureWhite,
    textAlign: 'center',
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 35,
    fontWeight: '400',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: colors.pureWhite,
    textAlign: 'center',
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 13,
    fontWeight: '300',
  },
  formContainer: {
    gap: 16,
  },
  otpContainer: {
    width: '100%',
  },
  otpInput: {
    width: '100%',
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.almostWhite,
    textAlign: 'center',
    color: colors.black,
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: 8,
    paddingHorizontal: 16,
  },
  otpInputFilled: {
    backgroundColor: colors.almostWhite,
  },
  otpInputDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    color: colors.pureWhite,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 13,
    marginTop: 8,
  },
  resendContainer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  resendText: {
    color: colors.pureWhite,
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 13,
  },
  resendButtonText: {
    color: colors.greenHighlight,
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 15,
    fontWeight: '400',
  },
  resendButtonTextDisabled: {
    color: colors.grey1,
  },
  termsContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  termsText: {
    width: 327,
    color: colors.grey1,
    textAlign: 'center',
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 8,
    fontWeight: '300',
    lineHeight: 15,
  },
  paginationInline: {
    alignItems: 'center',
    paddingTop: 24,
  },
  layer12: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 16,
    height: 16,
  },
});
