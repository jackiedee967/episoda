import React from 'react';
import { View, StyleSheet } from 'react-native';

interface Vector3DividerProps {
  testID?: string;
}

export function Vector3Divider({ testID }: Vector3DividerProps) {
  return <View testID={testID} style={styles.divider} />;
}

const styles = StyleSheet.create({
  divider: {
    width: '100%',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ffffff',
  },
});
