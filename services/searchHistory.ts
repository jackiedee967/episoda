import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEYS = {
  shows: '@search_history_shows',
  posts: '@search_history_posts',
  comments: '@search_history_comments',
  users: '@search_history_users',
} as const;

const MAX_HISTORY_ITEMS = 10;

export type SearchCategory = 'shows' | 'posts' | 'comments' | 'users';

export interface SearchHistoryManager {
  getHistory: (category: SearchCategory) => Promise<string[]>;
  addToHistory: (category: SearchCategory, query: string) => Promise<void>;
  removeFromHistory: (category: SearchCategory, query: string) => Promise<void>;
  clearHistory: (category: SearchCategory) => Promise<void>;
}

class SearchHistoryService implements SearchHistoryManager {
  async getHistory(category: SearchCategory): Promise<string[]> {
    try {
      const key = SEARCH_HISTORY_KEYS[category];
      const historyJson = await AsyncStorage.getItem(key);
      
      if (!historyJson) {
        return [];
      }
      
      const history = JSON.parse(historyJson);
      return Array.isArray(history) ? history : [];
    } catch (error) {
      console.error(`Error loading search history for ${category}:`, error);
      return [];
    }
  }

  async addToHistory(category: SearchCategory, query: string): Promise<void> {
    try {
      const trimmedQuery = query.trim();
      
      if (!trimmedQuery) {
        return;
      }
      
      const currentHistory = await this.getHistory(category);
      
      const existingIndex = currentHistory.findIndex(
        item => item.toLowerCase() === trimmedQuery.toLowerCase()
      );
      
      if (existingIndex !== -1) {
        currentHistory.splice(existingIndex, 1);
      }
      
      const newHistory = [trimmedQuery, ...currentHistory];
      
      if (newHistory.length > MAX_HISTORY_ITEMS) {
        newHistory.splice(MAX_HISTORY_ITEMS);
      }
      
      const key = SEARCH_HISTORY_KEYS[category];
      await AsyncStorage.setItem(key, JSON.stringify(newHistory));
    } catch (error) {
      console.error(`Error adding to search history for ${category}:`, error);
    }
  }

  async removeFromHistory(category: SearchCategory, query: string): Promise<void> {
    try {
      const currentHistory = await this.getHistory(category);
      
      const filteredHistory = currentHistory.filter(
        item => item.toLowerCase() !== query.toLowerCase()
      );
      
      const key = SEARCH_HISTORY_KEYS[category];
      await AsyncStorage.setItem(key, JSON.stringify(filteredHistory));
    } catch (error) {
      console.error(`Error removing from search history for ${category}:`, error);
    }
  }

  async clearHistory(category: SearchCategory): Promise<void> {
    try {
      const key = SEARCH_HISTORY_KEYS[category];
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error clearing search history for ${category}:`, error);
    }
  }
}

export const searchHistoryManager = new SearchHistoryService();
