import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

export const SecureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (isNative) {
        return await SecureStore.getItemAsync(key);
      }
      return await AsyncStorage.getItem(key);
    } catch (error) {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isNative) {
        await SecureStore.setItemAsync(key, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      if (!isNative) {
        await AsyncStorage.setItem(key, value);
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (isNative) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
    }
  },
};

export default SecureStorageAdapter;
