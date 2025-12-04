import React from 'react';
import { View, StyleSheet } from 'react-native';

interface AnimatedTabContentProps {
  children: React.ReactNode;
  tabIndex: number;
}

export default function AnimatedTabContent({ children, tabIndex }: AnimatedTabContentProps) {
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
