import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '@/styles/tokens';
import { useEffect, useState } from 'react';

export default function Index() {
  const { session, isLoading, authReady } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    if (!mounted) return;
    if (isLoading || !authReady) return;
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (!session) {
        window.location.href = '/auth';
      } else {
        window.location.href = '/(tabs)';
      }
    }
  }, [session, isLoading, authReady, mounted]);
  
  if (!mounted || isLoading || !authReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.logo}>EPISODA</Text>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  if (Platform.OS !== 'web') {
    if (!session) {
      return <Redirect href="/auth" />;
    }
    return <Redirect href="/(tabs)/" />;
  }
  
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.logo}>EPISODA</Text>
      <Text style={styles.loadingText}>Redirecting...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A855F7',
  },
  logo: {
    color: colors.pureWhite,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 16,
  },
  loadingText: {
    color: colors.pureWhite,
    fontSize: 16,
  },
});
