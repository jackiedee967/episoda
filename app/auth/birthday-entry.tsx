import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
  TextInput,
  ImageBackground,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import { colors } from '@/styles/tokens';
import ButtonL from '@/components/ButtonL';
import { PaginationDots } from '@/components/PaginationDots';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

const phoneBackground = Asset.fromModule(require('../../assets/images/auth/Background.png')).uri;
const layer1 = Asset.fromModule(require('../../assets/images/auth/layer-1.png')).uri;
const layer12 = Asset.fromModule(require('../../assets/images/auth/layer12.png')).uri;

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
            <Text style={styles.title}>When's your birthday?</Text>
            <Text style={styles.subtitle}>
              You must be at least 13 years old to use EPISODA
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
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

            <ButtonL
              onPress={handleContinue}
              disabled={!canContinue || loading}
            >
              {loading ? 'Continuing...' : 'Continue'}
            </ButtonL>

            {/* Helper/Error text */}
            <View style={styles.termsContainer}>
              {!isValidAge ? (
                <Text style={styles.errorText}>
                  You must be at least 13 years old
                </Text>
              ) : (
                <Text style={styles.termsText}>
                  Your birthday won't be shown publicly
                </Text>
              )}
            </View>

            {/* Pagination dots */}
            <View style={styles.paginationInline}>
              <PaginationDots total={5} current={5} testID="pagination-dots" />
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
    height: 56,
    width: 70,
    borderRadius: 12,
    backgroundColor: colors.almostWhite,
    fontFamily: 'FunnelDisplay_400Regular',
    textAlign: 'center',
    color: colors.black,
    fontSize: 20,
    paddingHorizontal: 8,
  },
  yearBox: {
    width: 100,
  },
  separator: {
    color: colors.pureWhite,
    fontSize: 24,
    fontFamily: 'InstrumentSerif_400Regular',
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
