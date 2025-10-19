
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { HelpCircle } from 'lucide-react-native';

export default function HelpDeskScreen() {
  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'The Help Desk',
          headerBackTitle: 'Settings',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }} 
      />
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.placeholderContainer}>
            <View style={styles.iconCircle}>
              <HelpCircle size={48} color={colors.secondary} />
            </View>
            <Text style={styles.placeholderTitle}>Help Desk Coming Soon</Text>
            <Text style={styles.placeholderText}>
              We&apos;re working on building a comprehensive help center with FAQs, tutorials, and support resources.
            </Text>
            <Text style={styles.placeholderText}>
              In the meantime, if you need assistance, please reach out to us at support@natively.app
            </Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderContainer: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
});
