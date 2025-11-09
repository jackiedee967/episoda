import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';

type OnboardingStatus = 'not_started' | 'phone_verified' | 'username_set' | 'birthday_set' | 'completed';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  onboardingStatus: OnboardingStatus;
  signInWithPhone: (phoneNumber: string) => Promise<{ error: any }>;
  verifyOTP: (phoneNumber: string, code: string) => Promise<{ error: any }>;
  verifyPhoneOTP: (userId: string) => Promise<void>;
  signInWithApple: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  setUsername: (username: string) => Promise<{ error: any }>;
  setBirthday: (birthday: Date) => Promise<{ error: any }>;
  completeOnboarding: () => Promise<void>;
  checkUsernameAvailability: (username: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('not_started');

  useEffect(() => {
    console.log('🔐 AuthContext initializing...');
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.id || 'null');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadOnboardingStatus(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.id || 'null');
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadOnboardingStatus(session.user.id);
      } else {
        setOnboardingStatus('not_started');
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadOnboardingStatus = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles' as any)
        .select('username, birthday, onboarding_completed')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.log('⚠️ Error loading onboarding status:', error);
        setOnboardingStatus('phone_verified');
        setIsLoading(false);
        return;
      }

      const hasUsername = profile && (profile as any).username && (profile as any).username.trim() !== '';
      const hasBirthday = profile && (profile as any).birthday && (profile as any).birthday !== '';
      const onboardingComplete = profile && (profile as any).onboarding_completed === true;

      if (!profile || !hasUsername) {
        setOnboardingStatus('phone_verified');
      } else if (!hasBirthday) {
        setOnboardingStatus('username_set');
      } else if (!onboardingComplete) {
        setOnboardingStatus('birthday_set');
      } else {
        setOnboardingStatus('completed');
      }
    } catch (error) {
      console.log('⚠️ Error loading onboarding status:', error);
      setOnboardingStatus('phone_verified');
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithPhone = useCallback(async (phoneNumber: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
        options: {
          channel: 'sms',
        },
      });
      
      if (error) {
        console.log('❌ Phone sign-in error:', error);
        return { error };
      }
      
      console.log('✅ OTP sent to', phoneNumber);
      return { error: null };
    } catch (error) {
      console.log('❌ Phone sign-in exception:', error);
      return { error };
    }
  }, []);

  const verifyOTP = useCallback(async (phoneNumber: string, code: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: code,
        type: 'sms',
      });
      
      if (error) {
        console.log('❌ OTP verification error:', error);
        return { error };
      }
      
      console.log('✅ OTP verified for user:', data.user?.id);
      
      if (data.user) {
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles' as any)
          .select('user_id')
          .eq('user_id', data.user.id)
          .single();
        
        if (fetchError && fetchError.code === 'PGRST116') {
          await supabase.from('profiles' as any).insert({
            user_id: data.user.id,
            username: '',
            display_name: '',
            avatar: '',
            bio: '',
            onboarding_completed: false,
          });
          console.log('✅ Created new profile for user:', data.user.id);
        } else if (existingProfile) {
          console.log('✅ Profile already exists for user:', data.user.id);
        } else if (fetchError) {
          console.log('⚠️ Unexpected error fetching profile:', fetchError);
        }
      }
      
      return { error: null };
    } catch (error) {
      console.log('❌ OTP verification exception:', error);
      return { error };
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      
      if (error) {
        console.log('❌ Apple sign-in error:', error);
        return { error };
      }
      
      console.log('✅ Apple sign-in initiated');
      return { error: null };
    } catch (error) {
      console.log('❌ Apple sign-in exception:', error);
      return { error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('🔐 Signing out...');
      
      // Clear local state immediately (before Supabase call)
      setSession(null);
      setUser(null);
      setOnboardingStatus('not_started');
      setIsLoading(false);
      
      // Clear any cached auth data from AsyncStorage
      try {
        await AsyncStorage.multiRemove([
          'supabase.auth.token',
          '@natively_session',
          '@natively_user'
        ]);
      } catch (storageError) {
        console.log('⚠️ Error clearing AsyncStorage:', storageError);
      }
      
      // Call Supabase sign out
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('❌ Supabase sign out error:', error);
      }
      
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.log('❌ Sign out error:', error);
      // Still clear local state even if Supabase call fails
      setSession(null);
      setUser(null);
      setOnboardingStatus('not_started');
      setIsLoading(false);
    }
  }, []);

  const checkUsernameAvailability = useCallback(async (username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('username')
        .eq('username', username)
        .maybeSingle();
      
      return !data;
    } catch (error) {
      return true;
    }
  }, []);

  const setUsername = useCallback(async (username: string) => {
    if (!user) return { error: new Error('No user logged in') };
    
    try {
      const isAvailable = await checkUsernameAvailability(username);
      if (!isAvailable) {
        return { error: new Error('Username already taken') };
      }
      
      const { error } = await supabase
        .from('profiles' as any)
        .update({ username, display_name: username })
        .eq('user_id', user.id);
      
      if (error) {
        console.log('❌ Username update error:', error);
        return { error };
      }
      
      console.log('✅ Username set:', username);
      setOnboardingStatus('username_set');
      return { error: null };
    } catch (error) {
      console.log('❌ Username update exception:', error);
      return { error };
    }
  }, [user, checkUsernameAvailability]);

  const verifyPhoneOTP = useCallback(async (userId: string) => {
    setOnboardingStatus('phone_verified');
    await loadOnboardingStatus(userId);
  }, []);

  const setBirthday = useCallback(async (birthday: Date) => {
    if (!user) return { error: new Error('No user logged in') };
    
    const today = new Date();
    const age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate())) {
      if (age - 1 < 13) {
        return { error: new Error('You must be at least 13 years old to use this app') };
      }
    } else if (age < 13) {
      return { error: new Error('You must be at least 13 years old to use this app') };
    }
    
    try {
      const birthdayString = birthday.toISOString().split('T')[0];
      const { error } = await supabase
        .from('profiles' as any)
        .update({ birthday: birthdayString })
        .eq('user_id', user.id);
      
      if (error) {
        console.log('❌ Birthday update error:', error);
        return { error };
      }
      
      console.log('✅ Birthday set:', birthdayString);
      setOnboardingStatus('birthday_set');
      return { error: null };
    } catch (error) {
      console.log('❌ Birthday update exception:', error);
      return { error };
    }
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles' as any)
        .update({ onboarding_completed: true })
        .eq('user_id', user.id);
      
      console.log('✅ Onboarding completed');
      setOnboardingStatus('completed');
    } catch (error) {
      console.log('❌ Complete onboarding error:', error);
    }
  }, [user]);

  const value = {
    session,
    user,
    isLoading,
    onboardingStatus,
    signInWithPhone,
    verifyOTP,
    verifyPhoneOTP,
    signInWithApple,
    signOut,
    setUsername,
    setBirthday,
    completeOnboarding,
    checkUsernameAvailability,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
