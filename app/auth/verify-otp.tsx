import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { GradientBackground } from './_components/GradientBackground';
import { AuthButton } from './_components/AuthButton';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

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
  const { verifyPhoneOTP } = useAuth();
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
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: code,
        type: 'sms',
      });

      if (error) {
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
        
        if (verifyPhoneOTP && data.user) {
          await verifyPhoneOTP(data.user.id);
        }
        
        router.replace('/auth/username-select');
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
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              {phone}
            </Text>
          </View>

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
              placeholder="Enter 6-digit code"
              placeholderTextColor={colors.grey1}
              selectTextOnFocus
              editable={!loading}
              autoFocus
            />
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.pureWhite} />
              <Text style={styles.loadingText}>Verifying code...</Text>
            </View>
          )}

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            <Pressable
              onPress={handleResendCode}
              disabled={countdown > 0 || resending}
            >
              {resending ? (
                <ActivityIndicator size="small" color={colors.pureWhite} />
              ) : (
                <Text style={[styles.resendButtonText, countdown > 0 && styles.resendButtonTextDisabled]}>
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                </Text>
              )}
            </Pressable>
          </View>

          <AuthButton
            title="Verify"
            onPress={() => handleVerifyOtp()}
            loading={loading}
            disabled={otp.length !== 6}
          />

          <Text style={styles.helperText}>
            Enter the 6-digit code sent to your phone.{'\n'}
            The code expires in 60 seconds.
          </Text>
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: 'center',
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    ...typography.titleL,
    color: colors.pureWhite,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.p1,
    color: colors.almostWhite,
    textAlign: 'center',
    opacity: 0.9,
  },
  otpContainer: {
    width: '100%',
  },
  otpInput: {
    width: '100%',
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.almostWhite,
    backgroundColor: colors.pureWhite,
    ...typography.titleL,
    textAlign: 'center',
    color: colors.black,
    fontSize: 24,
    letterSpacing: 8,
    paddingHorizontal: 16,
  },
  otpInputFilled: {
    borderColor: colors.greenHighlight,
  },
  otpInputDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    ...typography.p1,
    color: colors.almostWhite,
    marginTop: 12,
  },
  resendContainer: {
    alignItems: 'center',
    gap: 8,
  },
  resendText: {
    ...typography.p1,
    color: colors.almostWhite,
  },
  resendButtonText: {
    ...typography.subtitle,
    color: colors.greenHighlight,
  },
  resendButtonTextDisabled: {
    color: colors.almostWhite,
    opacity: 0.6,
  },
  helperText: {
    ...typography.p1,
    color: colors.almostWhite,
    textAlign: 'center',
    opacity: 0.8,
  },
});
