
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { deleteAccount } = useAuth();
  const [authMethod, setAuthMethod] = useState<'apple' | 'sms' | 'email' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadAuthInfo();
  }, []);

  const loadAuthInfo = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error loading auth info:', error);
        setLoading(false);
        return;
      }

      if (user) {
        console.log('User auth metadata:', user.app_metadata);
        
        // Determine auth method
        if (user.app_metadata?.provider === 'apple') {
          setAuthMethod('apple');
        } else if (user.phone) {
          setAuthMethod('sms');
          setPhoneNumber(user.phone);
        } else if (user.email) {
          setAuthMethod('email');
          setEmail(user.email);
        }
      }
    } catch (error) {
      console.error('Error loading auth info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    console.log('🗑️ Delete button clicked');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (Platform.OS === 'web') {
      const firstConfirm = window.confirm(
        'Delete Account\n\nAre you absolutely sure? This action cannot be undone. All your data will be permanently deleted.'
      );
      
      if (!firstConfirm) {
        console.log('🗑️ First confirmation cancelled');
        return;
      }
      
      const finalConfirm = window.confirm(
        'Final Confirmation\n\nThis is your last chance. Delete your account forever?'
      );
      
      if (!finalConfirm) {
        console.log('🗑️ Final confirmation cancelled');
        return;
      }
      
      try {
        setIsDeleting(true);
        console.log('🗑️ Starting account deletion...');
        
        const { error } = await deleteAccount();
        
        if (error) {
          console.error('🗑️ Error deleting account:', error);
          window.alert('Error: ' + (error.message || 'Failed to delete account. Please try again.'));
          setIsDeleting(false);
          return;
        }
        
        console.log('🗑️ Account deleted successfully');
        window.alert('Account Deleted\n\nYour account and all data have been permanently deleted.');
        
        router.replace('/');
      } catch (error) {
        console.error('🗑️ Exception deleting account:', error);
        window.alert('Error: Failed to delete account. Please try again.');
        setIsDeleting(false);
      }
    } else {
      Alert.alert(
        'Delete Account',
        'Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Final Confirmation',
                'This is your last chance. Delete your account?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete Forever', 
                    style: 'destructive', 
                    onPress: async () => {
                      try {
                        setIsDeleting(true);
                        console.log('Deleting account...');
                        
                        const { error } = await deleteAccount();
                        
                        if (error) {
                          console.error('Error deleting account:', error);
                          Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
                          setIsDeleting(false);
                          return;
                        }
                        
                        Alert.alert('Account Deleted', 'Your account and all data have been permanently deleted.');
                        
                        router.replace('/');
                      } catch (error) {
                        console.error('Error deleting account:', error);
                        Alert.alert('Error', 'Failed to delete account. Please try again.');
                        setIsDeleting(false);
                      }
                    }
                  },
                ]
              );
            },
          },
        ]
      );
    }
  };

  const handleChangePhoneNumber = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (authMethod !== 'sms') {
      Alert.alert(
        'Not Available',
        'Phone number change is only available for accounts that signed up with phone number.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    router.push('/settings/change-phone');
  };

  if (loading) {
    return (
      <>
        <Stack.Screen 
          options={{
            headerShown: true,
            title: 'Account Settings',
            headerBackTitle: 'Settings',
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }} 
        />
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.secondary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: 'Account Settings',
          headerBackTitle: 'Settings',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }} 
      />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Authentication Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AUTHENTICATION</Text>
            
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Sign-in Method</Text>
              <Text style={styles.infoValue}>
                {authMethod === 'apple' ? 'Sign in with Apple' : null}
                {authMethod === 'sms' ? 'SMS Authentication' : null}
                {authMethod === 'email' ? 'Email Authentication' : null}
                {!authMethod ? 'Not signed in' : null}
              </Text>
              {authMethod === 'apple' ? (
                <Text style={styles.infoNote}>
                  Your Apple ID is securely linked to your account and cannot be changed.
                </Text>
              ) : null}
            </View>

            {authMethod === 'sms' && phoneNumber && (
              <>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{phoneNumber}</Text>
                </View>
                <Pressable 
                  style={styles.changeButton}
                  onPress={handleChangePhoneNumber}
                >
                  <Text style={styles.changeButtonText}>Change Phone Number</Text>
                </Pressable>
              </>
            )}

            {authMethod === 'email' && email && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{email}</Text>
              </View>
            )}
          </View>

          {/* Danger Zone */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DANGER ZONE</Text>
            
            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Delete Account</Text>
              <Text style={styles.dangerZoneDescription}>
                Once you delete your account, there is no going back. Please be certain.
              </Text>
              <Pressable 
                style={styles.deleteButton}
                onPress={handleDeleteAccount}
              >
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: 100 }} />
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  infoNote: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  changeButton: {
    backgroundColor: colors.secondary,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
  },
  dangerZone: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 8,
  },
  dangerZoneDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
