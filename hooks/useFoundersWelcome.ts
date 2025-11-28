import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FOUNDERS_MODAL_SHOWN_KEY = '@founders_welcome_shown';

interface FoundersWelcomeReturn {
  shouldShowFoundersModal: boolean;
  markFoundersModalShown: () => Promise<void>;
  isCheckingStatus: boolean;
}

/**
 * Hook to manage the founders welcome modal visibility
 * Shows the modal once for new users after they complete signup
 */
export function useFoundersWelcome(): FoundersWelcomeReturn {
  const [hasShownFounders, setHasShownFounders] = useState<boolean | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // Check if modal has been shown before
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const hasShown = await AsyncStorage.getItem(FOUNDERS_MODAL_SHOWN_KEY);
        setHasShownFounders(hasShown === 'true');
      } catch (error) {
        console.error('Error checking founders modal status:', error);
        setHasShownFounders(true); // Default to not showing on error
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkStatus();
  }, []);

  // Mark the modal as shown
  const markFoundersModalShown = useCallback(async () => {
    try {
      await AsyncStorage.setItem(FOUNDERS_MODAL_SHOWN_KEY, 'true');
      setHasShownFounders(true);
    } catch (error) {
      console.error('Error marking founders modal as shown:', error);
    }
  }, []);

  // Should show if we've checked status and it hasn't been shown before
  const shouldShowFoundersModal = !isCheckingStatus && hasShownFounders === false;

  return {
    shouldShowFoundersModal,
    markFoundersModalShown,
    isCheckingStatus,
  };
}
