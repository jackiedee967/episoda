
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ImageBackground } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, typography } from '@/styles/commonStyles';
import { User, Bell, HelpCircle, LogOut } from 'lucide-react-native';
import { IconSymbol } from '@/components/IconSymbol';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Asset } from 'expo-asset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const appBackground = Asset.fromModule(require('../../assets/images/app-background.jpg')).uri;

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Web-compatible confirmation
    const confirmed = typeof window !== 'undefined' 
      ? window.confirm('Are you sure you want to sign out?')
      : true;
    
    if (!confirmed) return;
    
    try {
      await signOut();
      console.log('✅ User signed out successfully');
      router.replace('/auth');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      if (typeof window !== 'undefined') {
        window.alert('Failed to sign out. Please try again.');
      }
    }
  };

  const handleRowPress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as any);
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          statusBarTranslucent: true,
          statusBarBackgroundColor: 'transparent',
          contentStyle: { backgroundColor: 'transparent' },
        }} 
      />
      <ImageBackground
        source={{ uri: appBackground }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Custom Header with Back Button */}
          <View style={[styles.customHeader, { paddingTop: insets.top + 12 }]}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            
            <View style={styles.rowContainer}>
              <Pressable 
                style={styles.row}
                onPress={() => handleRowPress('/settings/account')}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <User size={22} color={colors.text} />
                  </View>
                  <Text style={styles.rowText}>Account Settings</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
              </Pressable>

              <View style={styles.divider} />

              <Pressable 
                style={styles.row}
                onPress={() => handleRowPress('/settings/notifications')}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <Bell size={22} color={colors.text} />
                  </View>
                  <Text style={styles.rowText}>Notifications</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Need Help Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NEED HELP?</Text>
            
            <View style={styles.rowContainer}>
              <Pressable 
                style={styles.row}
                onPress={() => handleRowPress('/settings/help')}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <HelpCircle size={22} color={colors.text} />
                  </View>
                  <Text style={styles.rowText}>The Help Desk</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* Bye Bye Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BYE BYE</Text>
            
            <View style={styles.rowContainer}>
              <Pressable 
                style={styles.row}
                onPress={handleSignOut}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.iconContainer}>
                    <LogOut size={22} color={colors.text} />
                  </View>
                  <Text style={styles.rowText}>Sign Out</Text>
                </View>
              </Pressable>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerTitle: {
    ...typography.titleL,
    color: colors.text,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    ...typography.p3B,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  rowContainer: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowText: {
    ...typography.subtitle,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 52,
  },
});
