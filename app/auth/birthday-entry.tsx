import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { GradientBackground } from './_components/GradientBackground';
import { AuthButton } from './_components/AuthButton';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Birthday Entry Screen - Step 5 in auth flow
 * Features:
 * - Date picker for birthday
 * - Age validation (must be 13+ years old)
 * - Platform-specific date picker UI
 */
export default function BirthdayEntryScreen() {
  const router = useRouter();
  const { setBirthday } = useAuth();
  const [date, setDate] = useState(new Date(2000, 0, 1));
  const [show, setShow] = useState(Platform.OS === 'ios');
  const [loading, setLoading] = useState(false);

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleContinue = async () => {
    const age = calculateAge(date);

    if (age < 13) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Age Requirement',
        'You must be at least 13 years old to use EPISODA.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (setBirthday) {
        await setBirthday(date);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/auth/onboarding-carousel');
    } catch (error) {
      console.error('Set birthday error:', error);
      Alert.alert('Error', 'Failed to save birthday. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onWebDateChange = (event: any) => {
    const dateString = event.target.value;
    const [year, month, day] = dateString.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    if (!isNaN(selectedDate.getTime())) {
      setDate(selectedDate);
    }
  };

  const formatDateForWeb = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const age = calculateAge(date);
  const isValidAge = age >= 13;

  return (
    <GradientBackground>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>When's your birthday?</Text>
            <Text style={styles.subtitle}>
              You must be at least 13 years old to use EPISODA
            </Text>
          </View>

          <View style={styles.pickerSection}>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.webDateInput}
                value={formatDateForWeb(date)}
                onChange={onWebDateChange}
                // @ts-ignore - type="date" is valid for web but not in React Native types
                type="date"
                max={formatDateForWeb(new Date())}
                min="1900-01-01"
              />
            ) : (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
                textColor={colors.pureWhite}
                themeVariant="dark"
                style={styles.datePicker}
              />
            )}

            {!isValidAge && (
              <Text style={styles.errorText}>
                You must be at least 13 years old
              </Text>
            )}
          </View>

          <View style={styles.buttonSection}>
            <AuthButton
              title="Continue"
              onPress={handleContinue}
              loading={loading}
              disabled={!isValidAge}
            />
            
            <Text style={styles.helperText}>
              Your birthday won't be shown publicly
            </Text>
          </View>
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
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    gap: 12,
    marginTop: 40,
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
  pickerSection: {
    alignItems: 'center',
    gap: 16,
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
  webDateInput: {
    width: '100%',
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.almostWhite,
    backgroundColor: colors.pureWhite,
    ...typography.titleL,
    textAlign: 'center',
    color: colors.black,
    fontSize: 20,
    paddingHorizontal: 16,
  },
  errorText: {
    ...typography.p1,
    color: colors.error,
    textAlign: 'center',
  },
  buttonSection: {
    gap: 16,
  },
  helperText: {
    ...typography.p1,
    color: colors.almostWhite,
    textAlign: 'center',
    opacity: 0.8,
  },
});
