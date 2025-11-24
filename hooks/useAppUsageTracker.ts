import { useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USAGE_TIME_KEY = '@app_usage_time';
const INVITE_SHOWN_KEY = '@invite_modal_shown';
const FIVE_MINUTES_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

interface AppUsageTrackerReturn {
  shouldShowInviteModal: boolean;
  markInviteModalShown: () => Promise<void>;
  totalUsageTime: number;
}

/**
 * Hook to track cumulative app usage time and determine when to show the invite modal
 * Shows invite modal once after user has used app for 5 minutes total
 */
export function useAppUsageTracker(): AppUsageTrackerReturn {
  const [totalUsageTime, setTotalUsageTime] = useState(0);
  const [hasShownInvite, setHasShownInvite] = useState(false);
  const [shouldShowInviteModal, setShouldShowInviteModal] = useState(false);
  
  const sessionStartTime = useRef<number | null>(null);
  const appState = useRef(AppState.currentState);

  // Load saved data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedTime, inviteShown] = await Promise.all([
          AsyncStorage.getItem(USAGE_TIME_KEY),
          AsyncStorage.getItem(INVITE_SHOWN_KEY),
        ]);

        const parsedTime = savedTime ? parseInt(savedTime, 10) : 0;
        const hasShown = inviteShown === 'true';

        setTotalUsageTime(parsedTime);
        setHasShownInvite(hasShown);

        // Start tracking from this session
        sessionStartTime.current = Date.now();
      } catch (error) {
        console.error('Error loading app usage data:', error);
      }
    };

    loadData();
  }, []);

  // Save usage time periodically and on app state changes
  useEffect(() => {
    const saveUsageTime = async (additionalTime: number) => {
      try {
        const newTotal = totalUsageTime + additionalTime;
        await AsyncStorage.setItem(USAGE_TIME_KEY, newTotal.toString());
        setTotalUsageTime(newTotal);

        // Check if we've hit 5 minutes and haven't shown invite yet
        if (newTotal >= FIVE_MINUTES_MS && !hasShownInvite) {
          setShouldShowInviteModal(true);
        }
      } catch (error) {
        console.error('Error saving app usage time:', error);
      }
    };

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // App went to background or inactive
      if (
        appState.current === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        if (sessionStartTime.current) {
          const sessionTime = Date.now() - sessionStartTime.current;
          saveUsageTime(sessionTime);
          sessionStartTime.current = null;
        }
      }

      // App came to foreground
      if (
        (appState.current === 'background' || appState.current === 'inactive') &&
        nextAppState === 'active'
      ) {
        sessionStartTime.current = Date.now();
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Save usage time every 30 seconds while active
    const interval = setInterval(() => {
      if (sessionStartTime.current && appState.current === 'active') {
        const sessionTime = Date.now() - sessionStartTime.current;
        saveUsageTime(sessionTime);
        sessionStartTime.current = Date.now(); // Reset session start
      }
    }, 30000); // 30 seconds

    return () => {
      subscription.remove();
      clearInterval(interval);

      // Save final session time on unmount
      if (sessionStartTime.current) {
        const sessionTime = Date.now() - sessionStartTime.current;
        saveUsageTime(sessionTime);
      }
    };
  }, [totalUsageTime, hasShownInvite]);

  // Mark that invite modal has been shown
  const markInviteModalShown = async () => {
    try {
      await AsyncStorage.setItem(INVITE_SHOWN_KEY, 'true');
      setHasShownInvite(true);
      setShouldShowInviteModal(false);
    } catch (error) {
      console.error('Error marking invite modal as shown:', error);
    }
  };

  return {
    shouldShowInviteModal,
    markInviteModalShown,
    totalUsageTime,
  };
}
