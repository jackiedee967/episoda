import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography } from '@/styles/tokens';
import { GradientBackground } from '@/components/auth/GradientBackground';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/app/integrations/supabase/client';

export default function ResetScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  useEffect(() => {
    const clearEverything = async () => {
      try {
        console.log('🧹 Clearing all data...');
        
        await AsyncStorage.clear();
        
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        
        await signOut();
        
        await AsyncStorage.clear();
        
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
        
        console.log('✅ All data cleared - forcing page reload');
        
        if (typeof window !== 'undefined') {
          window.location.href = '/auth';
        } else {
          router.replace('/auth' as any);
        }
      } catch (error) {
        console.error('Error clearing data:', error);
        if (typeof window !== 'undefined') {
          window.location.href = '/auth';
        } else {
          router.replace('/auth' as any);
        }
      }
    };

    clearEverything();
  }, [signOut]);

  return (
    <GradientBackground>
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.pureWhite} />
        <Text style={styles.text}>Resetting...</Text>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  text: {
    ...typography.subtitle,
    color: colors.pureWhite,
  },
});
