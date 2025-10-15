
import { StyleSheet } from 'react-native';

export const colors = {
  background: '#000000',
  text: '#FFFFFF',
  textSecondary: '#999999',
  card: '#1A1A1A',
  border: '#333333',
  primary: '#000000',
  secondary: '#C4FF61',
  highlight: '#C4FF61',
  error: '#FF3B30',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.text,
  },
  textSecondary: {
    color: colors.textSecondary,
  },
});
