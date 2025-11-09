import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { GradientBackground } from '@/components/auth/GradientBackground';
import { AuthButton } from '@/components/auth/AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { Check, X } from 'lucide-react-native';

/**
 * Username Selection Screen - Step 4 in auth flow
 * Features:
 * - Username input with real-time validation
 * - Availability checking
 * - Rules: 3-20 characters, alphanumeric + underscore only
 * - Visual feedback (green checkmark / red X)
 */
export default function UsernameSelectScreen() {
  const router = useRouter();
  const { checkUsernameAvailability, setUsername } = useAuth();
  const [usernameInput, setUsernameInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const validateAndCheckUsername = async () => {
      const username = usernameInput.trim();

      if (username.length === 0) {
        setAvailable(null);
        setError(null);
        return;
      }

      if (username.length < 3) {
        setAvailable(false);
        setError('Username must be at least 3 characters');
        return;
      }

      if (username.length > 20) {
        setAvailable(false);
        setError('Username must be 20 characters or less');
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setAvailable(false);
        setError('Only letters, numbers, and underscores allowed');
        return;
      }

      setError(null);
      setChecking(true);

      try {
        if (checkUsernameAvailability) {
          const isAvailable = await checkUsernameAvailability(username);
          setAvailable(isAvailable);
          if (!isAvailable) {
            setError('Username is already taken');
          }
        }
      } catch (err) {
        console.error('Username check error:', err);
        setAvailable(false);
        setError('Failed to check username');
      } finally {
        setChecking(false);
      }
    };

    const debounceTimer = setTimeout(validateAndCheckUsername, 500);
    return () => clearTimeout(debounceTimer);
  }, [usernameInput, checkUsernameAvailability]);

  const handleContinue = async () => {
    const username = usernameInput.trim();

    if (!available || error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (setUsername) {
        await setUsername(username);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/auth/birthday-entry');
    } catch (error) {
      console.error('Set username error:', error);
      setError('Failed to set username. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showCheck = available === true && !checking && !error;
  const showX = available === false && !checking;

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose your username</Text>
            <Text style={styles.subtitle}>
              This is how others will find you on EPISODA
            </Text>
          </View>

          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="username"
                placeholderTextColor={colors.grey1}
                value={usernameInput}
                onChangeText={setUsernameInput}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                editable={!loading}
              />
              <View style={styles.iconContainer}>
                {checking && <ActivityIndicator size="small" color={colors.greenHighlight} />}
                {showCheck && <Check size={24} color={colors.greenHighlight} />}
                {showX && <X size={24} color={colors.error} />}
              </View>
            </View>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : (
              <Text style={styles.helperText}>
                3-20 characters. Letters, numbers, and underscores only.
              </Text>
            )}
          </View>

          <AuthButton
            title="Continue"
            onPress={handleContinue}
            loading={loading}
            disabled={!available || !!error || checking}
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
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
