
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/integrations/supabase/client';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/IconSymbol';
import * as AppleAuthentication from 'expo-apple-authentication';
import { checkRateLimit } from '@/services/rateLimiting';
let PhoneInput: any = null;
if (Platform.OS !== 'web') {
  PhoneInput = require('react-native-phone-number-input').default;
}

export default function LoginScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const phoneInput = useRef<PhoneInput>(null);

  React.useEffect(() => {
    // Check if Apple Sign In is available
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const handlePhoneSignIn = async () => {
    // Get the formatted phone number in E.164 format
    let checkValid = false;
    let formattedNumber = '';
    
    if (Platform.OS === 'web') {
      // Simple validation for web - just check if it starts with + and has digits
      checkValid = phoneNumber.trim().startsWith('+') && phoneNumber.replace(/\D/g, '').length >= 10;
      formattedNumber = phoneNumber.trim();
    } else if (phoneInput.current) {
      checkValid = phoneInput.current?.isValidNumber(phoneNumber);
      formattedNumber = phoneInput.current?.getNumberAfterPossiblyEliminatingZero()?.formattedNumber;
    }

    console.log('Phone validation:', { checkValid, formattedNumber, phoneNumber });

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
      // Check rate limit before sending OTP
      const rateLimitResult = await checkRateLimit(formattedNumber, 'otp');
      if (!rateLimitResult.allowed) {
        Alert.alert(
          'Too Many Attempts',
          rateLimitResult.error || 'Please wait before requesting another code.'
        );
        setLoading(false);
        return;
      }

      console.log('Sending OTP to:', formattedNumber);

      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedNumber,
      });

      console.log('OTP response:', { data, error });

      if (error) {
        console.error('Phone sign in error:', error);
        
        // Provide specific error messages
        if (error.message.includes('phone_provider_disabled') || error.message.includes('Unsupported phone provider')) {
          Alert.alert(
            'Phone Authentication Not Enabled',
            'Phone authentication is not configured in this app yet.\n\n' +
            'The administrator needs to:\n' +
            '1. Enable Phone provider in Supabase Dashboard\n' +
            '2. Configure an SMS provider (Twilio, MessageBird, or Vonage)\n\n' +
            'Please contact support or try Apple Sign-In instead.'
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
        // Success - navigate to OTP verification
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

  const handleAppleSignIn = async () => {
    setLoading(true);
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
              .from('profiles')
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
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: 'Sign In',
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Natively</Text>
            <Text style={styles.subtitle}>
              Sign in to start tracking your favorite TV shows
            </Text>
          </View>

          {/* Phone Number Sign In */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sign in with Phone</Text>
            <Text style={styles.sectionDescription}>
              We'll send you a 6-digit verification code via SMS
            </Text>

            <View style={styles.phoneInputContainer}>
              {Platform.OS === 'web' ? (
                <TextInput
                  style={styles.webPhoneInput}
                  placeholder="+1 555 123 4567"
                  placeholderTextColor={colors.textSecondary}
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
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                  }}
                  onChangeFormattedText={(text) => {
                    setFormattedPhoneNumber(text);
                  }}
                  withDarkTheme={false}
                  withShadow={false}
                  autoFocus={false}
                  containerStyle={styles.phoneContainer}
                  textContainerStyle={styles.phoneTextContainer}
                  textInputStyle={styles.phoneTextInput}
                  codeTextStyle={styles.phoneCodeText}
                  flagButtonStyle={styles.phoneFlagButton}
                  countryPickerButtonStyle={styles.phoneCountryPicker}
                  disabled={loading}
                />
              ) : null}
            </View>

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handlePhoneSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <IconSymbol name="arrow.right" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                </>
              )}
            </Pressable>

            <Text style={styles.helperText}>
              Enter your phone number with country code.{'\n'}
              Example: +1 555 123 4567
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Apple Sign In */}
          {appleAvailable && Platform.OS === 'ios' ? (
            <View style={styles.section}>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            </View>
          ) : null}

          {/* Info Text */}
          <Text style={styles.infoText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>

          {/* Debug Info (remove in production) */}
          {__DEV__ ? (
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>
                📱 Debug Info:{'\n'}
                Phone: {phoneNumber}{'\n'}
                Formatted: {formattedPhoneNumber}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  phoneInputContainer: {
    marginBottom: 16,
  },
  phoneContainer: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phoneTextContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 0,
  },
  phoneTextInput: {
    fontSize: 16,
    color: colors.text,
    height: 50,
  },
  phoneCodeText: {
    fontSize: 16,
    color: colors.text,
    height: 50,
  },
  phoneFlagButton: {
    borderRadius: 12,
  },
  phoneCountryPicker: {
    borderRadius: 12,
  },
  webPhoneInput: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    height: 50,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
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
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  debugContainer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
