import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { GradientBackground } from '@/components/auth/GradientBackground';
import { AuthButton } from '@/components/auth/AuthButton';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

export default function VerifyPhoneChangeScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
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
      const { error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: code,
        type: 'phone_change',
      });

      if (error) {
        if (error.message.includes('expired')) {
          Alert.alert('Code Expired', 'This verification code has expired. Please request a new one.');
        } else if (error.message.includes('invalid') || error.message.includes('Token')) {
          Alert.alert('Invalid Code', 'The code you entered is incorrect. Please try again.');
        } else {
          Alert.alert('Error', error.message);
        }
        setOtp('');
        inputRef.current?.focus();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Success',
          'Your phone number has been updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/settings/account');
              },
            },
          ]
        );
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
      const { error } = await supabase.auth.updateUser({ phone: phone });

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

  const formatPhoneNumber = (phone: string) => {
    if (phone.startsWith('+1') && phone.length === 12) {
      return `+1 (${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
    }
    return phone;
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Verify Phone Change',
          headerBackTitle: 'Back',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }} 
      />
      <GradientBackground>
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Enter verification code</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to {'\n'}
                <Text style={styles.phoneText}>{formatPhoneNumber(phone)}</Text>
              </Text>
            </View>

            <View style={styles.inputSection}>
              <View style={styles.otpContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <View key={index} style={styles.otpBox}>
                    <Text style={styles.otpDigit}>
                      {otp[index] || ''}
                    </Text>
                  </View>
                ))}
              </View>
              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                editable={!loading}
              />
            </View>

            <View style={styles.resendSection}>
              {countdown > 0 ? (
                <Text style={styles.resendText}>
                  Resend code in {countdown}s
                </Text>
              ) : (
                <AuthButton
                  title={resending ? 'Sending...' : 'Resend Code'}
                  onPress={handleResendCode}
                  disabled={resending}
                  loading={resending}
                  variant="secondary"
                />
              )}
            </View>
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.secondary} />
            </View>
          )}
        </View>
      </GradientBackground>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: typography.semiBold,
    color: colors.text,
    marginBottom: 12,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  phoneText: {
    fontFamily: typography.medium,
    color: colors.text,
  },
  inputSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  otpContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  otpBox: {
    width: 48,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpDigit: {
    fontSize: 24,
    fontFamily: typography.semiBold,
    color: colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resendSection: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    fontFamily: typography.regular,
    color: colors.textSecondary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
