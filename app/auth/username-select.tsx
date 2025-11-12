import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ImageBackground,
  Image,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import { colors } from '@/styles/tokens';
import ButtonL from '@/components/ButtonL';
import { PaginationDots } from '@/components/PaginationDots';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { Check, X, ArrowLeft } from 'lucide-react-native';

const phoneBackground = Asset.fromModule(require('../../assets/images/auth/Background.png')).uri;
const layer1 = Asset.fromModule(require('../../assets/images/auth/layer-1.png')).uri;
const layer12 = Asset.fromModule(require('../../assets/images/auth/layer12.png')).uri;

export const options = {
  headerShown: false,
};

/**
 * Username Selection Screen - Step 3 in auth flow
 * Features:
 * - Username input with real-time validation
 * - Availability checking
 * - Rules: 3-20 characters, alphanumeric + underscore only
 * - Visual feedback (green checkmark / red X)
 */
export default function UsernameSelectScreen() {
  const router = useRouter();
  const { checkUsernameAvailability, setUsername, user, signOut } = useAuth();
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

  const handleBack = async () => {
    if (signOut) {
      await signOut();
    }
    router.replace('/');
  };

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
      
      // Check if display_name is already populated (e.g., from Apple Sign-In)
      if (user) {
        const { supabase } = await import('@/app/integrations/supabase/client');
        const { data: profile } = await supabase
          .from('profiles' as any)
          .select('display_name')
          .eq('user_id', user.id)
          .single();
        
        const hasDisplayName = profile && (profile as any).display_name && (profile as any).display_name.trim() !== '';
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        if (hasDisplayName) {
          // Skip display-name screen for Apple users who already have it
          router.replace('/auth/birthday-entry');
        } else {
          // Phone users need to enter display name
          router.replace('/auth/display-name');
        }
      } else {
        router.replace('/auth/display-name');
      }
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
    <View style={styles.wrapper}>
      <ImageBackground
        source={{ uri: phoneBackground }}
        style={styles.backgroundImage}
        resizeMode="stretch"
      >
        {/* Back button */}
        <Pressable 
          style={styles.backButton} 
          onPress={handleBack}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={colors.pureWhite} strokeWidth={2} />
        </Pressable>

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
            <Text style={styles.title}>Choose your username</Text>
            <Text style={styles.subtitle}>
              This is how others will find you on EPISODA
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
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

            <ButtonL
              onPress={handleContinue}
              disabled={!available || !!error || checking || loading}
            >
              {loading ? 'Continuing...' : 'Continue'}
            </ButtonL>

            {/* Helper/Error text */}
            <View style={styles.termsContainer}>
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : (
                <Text style={styles.termsText}>
                  3-20 characters. Letters, numbers, and underscores only.
                </Text>
              )}
            </View>

            {/* Pagination dots */}
            <View style={styles.paginationInline}>
              <PaginationDots total={5} current={3} testID="pagination-dots" />
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
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 8,
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
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
