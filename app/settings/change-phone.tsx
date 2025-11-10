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
import { useRouter, Stack } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { GradientBackground } from '@/components/auth/GradientBackground';
import { AuthButton } from '@/components/auth/AuthButton';
import { CountryCodeSelector, COUNTRIES, Country } from '@/components/auth/CountryCodeSelector';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

let PhoneInput: any = null;
if (Platform.OS !== 'web') {
  PhoneInput = require('react-native-phone-number-input').default;
}

export default function ChangePhoneScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const phoneInput = useRef<any>(null);

  const handleContinue = async () => {
    let checkValid = false;
    let formattedNumber = '';

    if (Platform.OS === 'web') {
      const cleanedNumber = phoneNumber.replace(/\D/g, '');
      checkValid = cleanedNumber.length >= 10;
      formattedNumber = selectedCountry.dialCode + cleanedNumber;
    } else if (phoneInput.current) {
      checkValid = phoneInput.current?.isValidNumber(phoneNumber);
      formattedNumber = phoneInput.current?.getNumberAfterPossiblyEliminatingZero()?.formattedNumber;
    }

    if (!checkValid || !formattedNumber) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid phone number.\n\nExample: 555 123 4567'
      );
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await supabase.auth.updateUser({ phone: formattedNumber });

      if (error) {
        if (error.message.includes('phone_exists') || error.message.includes('already registered')) {
          Alert.alert('Error', 'This phone number is already associated with another account.');
        } else if (error.message.includes('rate limit')) {
          Alert.alert(
            'Too Many Attempts',
            'You have requested too many codes. Please wait a few minutes and try again.'
          );
        } else {
          Alert.alert('Error', error.message || 'Failed to send verification code.');
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        if (Platform.OS === 'web') {
          router.push({
            pathname: '/settings/verify-phone-change',
            params: { phone: formattedNumber },
          });
        } else {
          Alert.alert(
            'Code Sent!',
            `A 6-digit verification code has been sent to ${formattedNumber}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  router.push({
                    pathname: '/settings/verify-phone-change',
                    params: { phone: formattedNumber },
                  });
                },
              },
            ]
          );
        }
      }
    } catch (error: any) {
      console.error('Error changing phone number:', error);
      Alert.alert(
        'Error',
        'Failed to send verification code. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Change Phone Number',
          headerBackTitle: 'Account',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }} 
      />
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
              <View style={styles.header}>
                <Text style={styles.title}>Enter your new phone number</Text>
                <Text style={styles.subtitle}>
                  We'll send you a 6-digit verification code via SMS to confirm the change
                </Text>
              </View>

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
                      placeholderTextColor={colors.textSecondary}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      editable={!loading}
                      autoFocus
                    />
                  </View>
                ) : (
                  PhoneInput && (
                    <PhoneInput
                      ref={phoneInput}
                      defaultValue={phoneNumber}
                      defaultCode="US"
                      layout="first"
                      onChangeText={setPhoneNumber}
                      onChangeFormattedText={setPhoneNumber}
                      disabled={loading}
                      containerStyle={styles.phoneInputContainer}
                      textContainerStyle={styles.phoneInputTextContainer}
                      textInputStyle={styles.phoneInputText}
                      codeTextStyle={styles.phoneInputCode}
                      flagButtonStyle={styles.phoneInputFlag}
                      placeholder="555 123 4567"
                      autoFocus
                    />
                  )
                )}
              </View>

              <View style={styles.buttonSection}>
                <AuthButton
                  title={loading ? 'Sending Code...' : 'Send Verification Code'}
                  onPress={handleContinue}
                  disabled={loading}
                  loading={loading}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </GradientBackground>
    </>
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
  inputSection: {
    marginBottom: 32,
  },
  webPhoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webPhoneInput: {
    flex: 1,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: typography.regular,
    color: colors.text,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  phoneInputContainer: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  phoneInputTextContainer: {
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },
  phoneInputText: {
    fontSize: 16,
    fontFamily: typography.regular,
    color: colors.text,
    height: 56,
  },
  phoneInputCode: {
    fontSize: 16,
    fontFamily: typography.regular,
    color: colors.text,
  },
  phoneInputFlag: {
    width: 60,
  },
  buttonSection: {
    gap: 16,
  },
});
