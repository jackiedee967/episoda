import React, { useState, useRef } from 'react';
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
  
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [isInputValid, setIsInputValid] = useState(false);
  
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

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

  const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  };

  const getDaysInMonth = (month: number, year: number): number => {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month === 2 && isLeapYear(year)) {
      return 29;
    }
    return daysInMonth[month - 1];
  };

  const updateDateFromInputs = (d: string, m: string, y: string) => {
    if (d.length !== 2 || m.length !== 2 || y.length !== 4) {
      setIsInputValid(false);
      return;
    }

    const dayNum = parseInt(d, 10);
    const monthNum = parseInt(m, 10);
    const yearNum = parseInt(y, 10);
    const currentYear = new Date().getFullYear();
    
    if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
      setIsInputValid(false);
      return;
    }
    
    if (monthNum < 1 || monthNum > 12) {
      setIsInputValid(false);
      return;
    }
    
    if (yearNum < 1900 || yearNum > currentYear) {
      setIsInputValid(false);
      return;
    }
    
    const maxDays = getDaysInMonth(monthNum, yearNum);
    if (dayNum < 1 || dayNum > maxDays) {
      setIsInputValid(false);
      return;
    }
    
    const newDate = new Date(yearNum, monthNum - 1, dayNum);
    if (newDate.getFullYear() !== yearNum || 
        newDate.getMonth() !== monthNum - 1 || 
        newDate.getDate() !== dayNum) {
      setIsInputValid(false);
      return;
    }
    
    setDate(newDate);
    setIsInputValid(true);
  };

  const handleMonthChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 2);
    setMonth(cleaned);
    updateDateFromInputs(day, cleaned, year);
    
    if (cleaned.length === 2) {
      dayRef.current?.focus();
    }
  };

  const handleDayChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 2);
    setDay(cleaned);
    updateDateFromInputs(cleaned, month, year);
    
    if (cleaned.length === 2) {
      yearRef.current?.focus();
    }
  };

  const handleYearChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    setYear(cleaned);
    updateDateFromInputs(day, month, cleaned);
  };

  const age = calculateAge(date);
  const isValidAge = age >= 13;
  const canContinue = Platform.OS === 'web' ? (isInputValid && isValidAge) : isValidAge;

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
              <View style={styles.webInputContainer}>
                <TextInput
                  style={styles.webDateBox}
                  value={month}
                  onChangeText={handleMonthChange}
                  keyboardType="number-pad"
                  placeholder="MM"
                  placeholderTextColor={colors.grey1}
                  maxLength={2}
                  autoFocus
                />
                <Text style={styles.separator}>/</Text>
                <TextInput
                  ref={dayRef}
                  style={styles.webDateBox}
                  value={day}
                  onChangeText={handleDayChange}
                  keyboardType="number-pad"
                  placeholder="DD"
                  placeholderTextColor={colors.grey1}
                  maxLength={2}
                />
                <Text style={styles.separator}>/</Text>
                <TextInput
                  ref={yearRef}
                  style={[styles.webDateBox, styles.yearBox]}
                  value={year}
                  onChangeText={handleYearChange}
                  keyboardType="number-pad"
                  placeholder="YYYY"
                  placeholderTextColor={colors.grey1}
                  maxLength={4}
                />
              </View>
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
              disabled={!canContinue}
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
  webInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  webDateBox: {
    height: 60,
    width: 70,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.almostWhite,
    backgroundColor: colors.pureWhite,
    ...typography.titleL,
    textAlign: 'center',
    color: colors.black,
    fontSize: 24,
  },
  yearBox: {
    width: 100,
  },
  separator: {
    ...typography.titleL,
    color: colors.pureWhite,
    fontSize: 24,
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
