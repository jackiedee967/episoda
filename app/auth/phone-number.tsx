import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import { colors } from '@/styles/tokens';
import { PhoneInput } from '@/components/PhoneInput';
import ButtonL from '@/components/ButtonL';
import { PaginationDots } from '@/components/PaginationDots';
import { Country } from '@/components/auth/CountryCodeSelector';
import { supabase } from '@/app/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

const phoneBackground = Asset.fromModule(require('../../assets/images/auth/Background.png')).uri;
const layer1 = Asset.fromModule(require('../../assets/images/auth/layer-1.png')).uri;
const layer12 = Asset.fromModule(require('../../assets/images/auth/layer12.png')).uri;

/**
 * Phone Number Entry Screen - Step 2 in 7-screen auth flow
 * Pixel-perfect implementation matching Figma design
 */
export default function PhoneNumberScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>({
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
  });
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    // Validate phone number
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (cleanedNumber.length < 10) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid phone number.\n\nExample: 305 1234 5678'
      );
      return;
    }

    const formattedNumber = selectedCountry.dialCode + cleanedNumber;
    console.log('📱 Sending OTP to:', formattedNumber);

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedNumber,
      });

      if (error) {
        console.error('❌ Phone sign in error:', error);

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
        console.log('✅ OTP sent successfully!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        router.push({
          pathname: '/auth/verify-otp',
          params: { phone: formattedNumber },
        });
      }
    } catch (error: any) {
      console.error('❌ Exception:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ImageBackground
        source={{ uri: phoneBackground }}
        style={styles.backgroundImage}
        resizeMode="stretch"
      >
        {/* Top logo */}
        <View style={styles.topContainer}>
          <Image
            source={{ uri: layer1 }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Main content */}
        <View style={styles.centerContent}>
          {/* Header text */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Enter your phone number</Text>
            <Text style={styles.subtitle}>
              Just for verification. We won't call or give it to anyone.
            </Text>
          </View>

          {/* Phone input and button */}
          <View style={styles.formContainer}>
            <PhoneInput
              selectedCountry={selectedCountry}
              onCountryChange={setSelectedCountry}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="305 1234 5678"
              editable={!loading}
              testID="phone-input"
            />

            <ButtonL
              onPress={handleContinue}
              disabled={loading || phoneNumber.replace(/\D/g, '').length < 10}
              testID="continue-button"
            >
              {loading ? 'Sending...' : 'Continue'}
            </ButtonL>

            {/* Terms text */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By continuing you agree to the Terms of Service, "EULA", and Privacy Policy.
              </Text>
            </View>

            {/* Pagination dots */}
            <View style={styles.paginationInline}>
              <PaginationDots total={5} current={1} testID="pagination-dots" />
            </View>
          </View>
        </View>

        {/* Bottom decorative image */}
        <Image
          source={{ uri: layer12 }}
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
    width: 353,
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
  termsContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  termsText: {
    width: 327,
    color: 'rgba(139, 252, 118, 1)',
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
