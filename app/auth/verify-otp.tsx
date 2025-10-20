
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
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/IconSymbol';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (index === 5 && value) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        handleVerifyOtp(fullOtp);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (otpCode?: string) => {
    const code = otpCode || otp.join('');

    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('Verifying OTP:', { phone, code });

      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: code,
        type: 'sms',
      });

      console.log('OTP verification response:', { data, error });

      if (error) {
        console.error('OTP verification error:', error);
        
        if (error.message.includes('expired')) {
          Alert.alert(
            'Code Expired',
            'This verification code has expired. Please request a new one.'
          );
        } else if (error.message.includes('invalid')) {
          Alert.alert(
            'Invalid Code',
            'The code you entered is incorrect. Please try again.'
          );
        } else {
          Alert.alert('Error', error.message);
        }
        
        // Clear OTP inputs on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        console.log('OTP verification successful:', data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Create or update user profile
        if (data.user) {
          console.log('Creating/updating profile for user:', data.user.id);
          
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              user_id: data.user.id,
              username: `user_${data.user.id.slice(0, 8)}`,
              display_name: phone.slice(-10), // Use last 10 digits as display name initially
              avatar_url: null,
              bio: null,
            }, {
              onConflict: 'user_id',
              ignoreDuplicates: false,
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't block login if profile creation fails
          } else {
            console.log('Profile created/updated successfully');
          }
        }
        
        // User is now signed in, navigation will be handled by auth state change in _layout.tsx
        Alert.alert(
          'Success!',
          'You have been successfully signed in.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigation will be handled automatically by _layout.tsx
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('OTP verification exception:', error);
      Alert.alert('Error', 'Failed to verify code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setResending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      console.log('Resending OTP to:', phone);

      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });

      if (error) {
        console.error('Resend OTP error:', error);
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Verification code sent!');
        setCountdown(60);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.error('Resend OTP exception:', error);
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Verify Code',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <IconSymbol name="message.fill" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.phoneNumber}>{phone}</Text>
          </Text>
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled,
                loading && styles.otpInputDisabled,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!loading}
            />
          ))}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Verifying code...</Text>
          </View>
        )}

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn&apos;t receive the code?</Text>
          <Pressable
            onPress={handleResendCode}
            disabled={countdown > 0 || resending}
            style={styles.resendButton}
          >
            {resending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={[
                  styles.resendButtonText,
                  countdown > 0 && styles.resendButtonTextDisabled,
                ]}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable
          style={[styles.button, (loading || otp.join('').length !== 6) && styles.buttonDisabled]}
          onPress={() => handleVerifyOtp()}
          disabled={loading || otp.join('').length !== 6}
        >
          <Text style={styles.buttonText}>Verify</Text>
        </Pressable>

        <Text style={styles.helperText}>
          Enter the 6-digit code sent to your phone.{'\n'}
          The code expires in 60 seconds.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneNumber: {
    fontWeight: '600',
    color: colors.text,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 8,
  },
  otpInput: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
  },
  otpInputFilled: {
    borderColor: colors.primary,
  },
  otpInputDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  resendButtonTextDisabled: {
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
