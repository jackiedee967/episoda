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
import { CountryCodeSelector, COUNTRIES, Country } from './_components/CountryCodeSelector';
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
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const phoneInput = useRef<any>(null);

  const handleContinue = async () => {
    let checkValid = false;
    let formattedNumber = '';

    console.log('📱 Phone entry - handleContinue called');
    console.log('📱 phoneNumber:', phoneNumber);
    console.log('📱 selectedCountry:', selectedCountry);

    if (Platform.OS === 'web') {
      const cleanedNumber = phoneNumber.replace(/\D/g, '');
      checkValid = cleanedNumber.length >= 10;
      formattedNumber = selectedCountry.dialCode + cleanedNumber;
      console.log('📱 WEB - cleanedNumber:', cleanedNumber);
      console.log('📱 WEB - formattedNumber:', formattedNumber);
      console.log('📱 WEB - checkValid:', checkValid);
    } else if (phoneInput.current) {
      checkValid = phoneInput.current?.isValidNumber(phoneNumber);
      formattedNumber = phoneInput.current?.getNumberAfterPossiblyEliminatingZero()?.formattedNumber;
    }

    if (!checkValid || !formattedNumber) {
      console.error('❌ Invalid phone number - checkValid:', checkValid, 'formattedNumber:', formattedNumber);
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid phone number.\n\nExample: 555 123 4567'
      );
      return;
    }

    console.log('✅ Phone number valid, sending OTP to:', formattedNumber);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('📤 Calling supabase.auth.signInWithOtp...');
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedNumber,
      });

      console.log('📥 Supabase response - data:', data, 'error:', error);

      if (error) {
        console.error('❌ Phone sign in error:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));

        if (error.message.includes('phone_provider_disabled') || error.message.includes('Unsupported phone provider')) {
          console.error('❌ Phone authentication not configured in Supabase');
          Alert.alert(
            'Phone Authentication Not Enabled',
            'Phone authentication is not configured. Please contact support.'
          );
        } else if (error.message.includes('rate limit')) {
          console.error('❌ Rate limit exceeded');
          Alert.alert(
            'Too Many Attempts',
            'You have requested too many codes. Please wait a few minutes and try again.'
          );
        } else {
          console.error('❌ Unknown error:', error.message);
          Alert.alert('Error', error.message);
        }
      } else {
        console.log('✅ OTP sent successfully!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Code Sent!',
          `A 6-digit verification code has been sent to ${formattedNumber}`,
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('📍 Navigating to verify-otp screen');
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
      console.error('❌ Phone sign in exception:', error);
      console.error('❌ Exception details:', JSON.stringify(error, null, 2));
      Alert.alert(
        'Error',
        'Failed to send verification code. Please check your internet connection and try again.'
      );
    } finally {
      console.log('🏁 handleContinue finished, setLoading(false)');
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
                <View style={styles.webPhoneContainer}>
                  <CountryCodeSelector
                    selectedCountry={selectedCountry}
                    onSelect={setSelectedCountry}
                    disabled={loading}
                  />
                  <TextInput
                    style={styles.webPhoneInput}
                    placeholder="555 123 4567"
                    placeholderTextColor={colors.grey1}
                    value={phoneNumber}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^\d\s-]/g, '');
                      setPhoneNumber(cleaned);
                    }}
                    keyboardType="phone-pad"
                    editable={!loading}
                    autoComplete="tel"
                  />
                </View>
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
                {Platform.OS === 'web' 
                  ? 'Select your country code and enter your phone number'
                  : 'Enter your phone number with country code'}
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
  webPhoneContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  webPhoneInput: {
    flex: 1,
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
