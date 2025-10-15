
import { StyleSheet } from 'react-native';

export const colors = {
  background: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  card: '#FFFFFF',
  border: '#E5E5E5',
  primary: '#000000',
  secondary: '#8BFC76',
  highlight: '#8BFC76',
  error: '#FF3B30',
  purple: '#9334E9',
  purpleLight: '#FAF5FF',
  green: '#8BFC76',
  blue: '#3B82F6',
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
