import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { GradientBackground } from '@/components/auth/GradientBackground';
import { AuthButton } from '@/components/auth/AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { ArrowLeft } from 'lucide-react-native';

/**
 * Display Name Selection Screen - Step 5 in auth flow (phone signups only)
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

  const handleBack = () => {
    router.back();
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
    <GradientBackground>
      <View style={styles.container}>
        <Pressable 
          style={styles.backButton} 
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.pureWhite} />
        </Pressable>
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>What's your name?</Text>
            <Text style={styles.subtitle}>
              This is how you'll appear to other users
            </Text>
          </View>

          <View style={styles.inputSection}>
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

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.helperText}>
                This can be your real name or a nickname
              </Text>
            )}
          </View>

          <AuthButton
            title="Continue"
            onPress={handleContinue}
            loading={loading}
            disabled={!isValid}
          />
        </View>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 24,
    zIndex: 10,
    padding: 8,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pureWhite,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    ...typography.subtitle,
    color: colors.black,
  },
  helperText: {
    ...typography.p1,
    color: colors.almostWhite,
    textAlign: 'center',
    opacity: 0.8,
  },
  errorText: {
    ...typography.p1,
    color: colors.error,
    textAlign: 'center',
  },
});
