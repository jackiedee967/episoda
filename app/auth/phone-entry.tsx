import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { GradientBackground } from './_components/GradientBackground';
import { AuthButton } from './_components/AuthButton';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

let PhoneInput: any = null;
if (Platform.OS !== 'web') {
  PhoneInput = require('react-native-phone-number-input').default;
}

/**
 * Phone Entry Screen - Step 2 in auth flow
 * Features:
 * - Phone number input with country code selector
 * - E.164 format validation
 * - Sends OTP via Twilio/Supabase
 * - Navigates to verify-otp screen on success
 */
export default function PhoneEntryScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const phoneInput = useRef<any>(null);

  const handleContinue = async () => {
    let checkValid = false;
    let formattedNumber = '';

    if (Platform.OS === 'web') {
      checkValid = phoneNumber.trim().startsWith('+') && phoneNumber.replace(/\D/g, '').length >= 10;
      formattedNumber = phoneNumber.trim();
    } else if (phoneInput.current) {
      checkValid = phoneInput.current?.isValidNumber(phoneNumber);
      formattedNumber = phoneInput.current?.getNumberAfterPossiblyEliminatingZero()?.formattedNumber;
    }

    if (!checkValid || !formattedNumber) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid phone number with country code.\n\nExample: +1 555 123 4567'
      );
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedNumber,
      });

      if (error) {
        console.error('Phone sign in error:', error);

        if (error.message.includes('phone_provider_disabled') || error.message.includes('Unsupported phone provider')) {
          Alert.alert(
            'Phone Authentication Not Enabled',
            'Phone authentication is not configured. Please contact support.'
          );
        } else if (error.message.includes('rate limit')) {
          Alert.alert(
            'Too Many Attempts',
            'You have requested too many codes. Please wait a few minutes and try again.'
          );
        } else {
          Alert.alert('Error', error.message);
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Code Sent!',
          `A 6-digit verification code has been sent to ${formattedNumber}`,
          [
            {
              text: 'OK',
              onPress: () => {
                router.push({
                  pathname: '/auth/verify-otp',
                  params: { phone: formattedNumber },
                });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Phone sign in exception:', error);
      Alert.alert(
        'Error',
        'Failed to send verification code. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Enter your phone number</Text>
              <Text style={styles.subtitle}>
                We'll send you a 6-digit verification code via SMS
              </Text>
            </View>

            {/* Phone Input */}
            <View style={styles.inputSection}>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={styles.webPhoneInput}
                  placeholder="+1 555 123 4567"
                  placeholderTextColor={colors.grey1}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    setFormattedPhoneNumber(text);
                  }}
                  keyboardType="phone-pad"
                  editable={!loading}
                  autoComplete="tel"
                />
              ) : PhoneInput ? (
                <PhoneInput
                  ref={phoneInput}
                  defaultValue={phoneNumber}
                  defaultCode="US"
                  layout="first"
                  onChangeText={(text: string) => {
                    setPhoneNumber(text);
                  }}
                  onChangeFormattedText={(text: string) => {
                    setFormattedPhoneNumber(text);
                  }}
                  withDarkTheme
                  withShadow={false}
                  autoFocus={false}
                  containerStyle={styles.phoneContainer}
                  textContainerStyle={styles.phoneTextContainer}
                  textInputStyle={styles.phoneTextInput}
                  codeTextStyle={styles.phoneCodeText}
                  disabled={loading}
                />
              ) : null}

              <Text style={styles.helperText}>
                Enter your phone number with country code
              </Text>
            </View>

            {/* Continue Button */}
            <AuthButton
              title="Continue"
              onPress={handleContinue}
              loading={loading}
              variant="primary"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  inputSection: {
    gap: 12,
  },
  webPhoneInput: {
    backgroundColor: colors.pureWhite,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...typography.subtitle,
    color: colors.black,
    height: 56,
  },
  phoneContainer: {
    width: '100%',
    backgroundColor: colors.pureWhite,
    borderRadius: 12,
    height: 56,
  },
  phoneTextContainer: {
    backgroundColor: colors.pureWhite,
    borderRadius: 12,
    paddingVertical: 0,
  },
  phoneTextInput: {
    ...typography.subtitle,
    color: colors.black,
    height: 56,
  },
  phoneCodeText: {
    ...typography.subtitle,
    color: colors.black,
    height: 56,
  },
  helperText: {
    ...typography.p1,
    color: colors.almostWhite,
    textAlign: 'center',
    opacity: 0.8,
  },
});
