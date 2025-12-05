import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ImageBackground,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/tokens';
import ButtonL from '@/components/ButtonL';
import { PaginationDots } from '@/components/PaginationDots';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';

export const options = {
  headerShown: false,
};

/**
 * Display Name Selection Screen - Step 4 in auth flow (phone signups only)
 * Features:
 * - Display name input with validation
 * - Rules: 1-50 characters
 * - Skipped for Apple Sign-In users (auto-populated from Apple)
 */
export default function DisplayNameScreen() {
  const router = useRouter();
  const { setDisplayName } = useAuth();
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateDisplayName = (name: string): boolean => {
    const trimmed = name.trim();

    if (trimmed.length === 0) {
      setError('Display name is required');
      return false;
    }

    if (trimmed.length > 50) {
      setError('Display name must be 50 characters or less');
      return false;
    }

    setError(null);
    return true;
  };

  const handleContinue = async () => {
    const displayName = displayNameInput.trim();

    if (!validateDisplayName(displayName)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (setDisplayName) {
        await setDisplayName(displayName);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/auth/birthday-entry');
    } catch (error) {
      console.error('Set display name error:', error);
      setError('Failed to set display name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (text: string) => {
    setDisplayNameInput(text);
    if (error) {
      validateDisplayName(text);
    }
  };

  const isValid = displayNameInput.trim().length > 0 && displayNameInput.trim().length <= 50;

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
            <Text style={styles.title}>What's your name?</Text>
            <Text style={styles.subtitle}>
              This is how you'll appear to other users
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Your display name"
                placeholderTextColor={colors.grey1}
                value={displayNameInput}
                onChangeText={handleInputChange}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={50}
                editable={!loading}
              />
            </View>

            <ButtonL
              onPress={handleContinue}
              disabled={!isValid || loading}
            >
              {loading ? 'Continuing...' : 'Continue'}
            </ButtonL>

            {/* Helper/Error text */}
            <View style={styles.termsContainer}>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : (
                <Text style={styles.termsText}>
                  This can be your real name or a nickname
                </Text>
              )}
            </View>

            {/* Pagination dots */}
            <View style={styles.paginationInline}>
              <PaginationDots total={5} current={4} testID="pagination-dots" />
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.almostWhite,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 16,
    color: colors.black,
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
  errorText: {
    width: 327,
    color: colors.error,
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
