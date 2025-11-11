import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { colors } from '@/styles/tokens';
import { CountryCodeSelector, Country } from '@/components/auth/CountryCodeSelector';

interface PhoneInputProps {
  selectedCountry: Country;
  onCountryChange: (country: Country) => void;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  testID?: string;
}

export function PhoneInput({
  selectedCountry,
  onCountryChange,
  value,
  onChangeText,
  placeholder = '305 1234 5678',
  editable = true,
  testID,
}: PhoneInputProps) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.inputContainer}>
        <CountryCodeSelector
          selectedCountry={selectedCountry}
          onSelect={onCountryChange}
          disabled={!editable}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^\d\s]/g, '');
            onChangeText(cleaned);
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.grey1}
          keyboardType="phone-pad"
          editable={editable}
          autoComplete="tel"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.almostWhite,
    borderRadius: 12,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: colors.black,
    fontFamily: 'FunnelDisplay_400Regular',
    fontSize: 15,
    fontWeight: '400',
  },
});
