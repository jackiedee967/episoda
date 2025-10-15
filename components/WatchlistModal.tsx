
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { Show } from '@/types';

interface WatchlistModalProps {
  visible: boolean;
  onClose: () => void;
  show: Show;
}

interface Watchlist {
  id: string;
  name: string;
  showCount: number;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Mock watchlists - in a real app, this would come from a database
const mockWatchlists: Watchlist[] = [
  { id: 'wl-1', name: 'Want to Watch', showCount: 12 },
  { id: 'wl-2', name: 'Currently Watching', showCount: 5 },
  { id: 'wl-3', name: 'Favorites', showCount: 8 },
];

export default function WatchlistModal({ visible, onClose, show }: WatchlistModalProps) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>(mockWatchlists);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');

  const handleCreateWatchlist = () => {
    if (newWatchlistName.trim()) {
      const newWatchlist: Watchlist = {
        id: `wl-${Date.now()}`,
        name: newWatchlistName.trim(),
        showCount: 0,
      };
      setWatchlists([...watchlists, newWatchlist]);
      setNewWatchlistName('');
      setIsCreatingNew(false);
      console.log('Created new watchlist:', newWatchlist.name);
    }
  };

  const handleAddToWatchlist = (watchlistId: string) => {
    const watchlist = watchlists.find(wl => wl.id === watchlistId);
    console.log(`Added ${show.title} to ${watchlist?.name}`);
    onClose();
  };

  const resetModal = () => {
    setIsCreatingNew(false);
    setNewWatchlistName('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>Add to Watchlist</Text>
            <Text style={styles.subtitle}>{show.title}</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Create New Watchlist */}
            {isCreatingNew ? (
              <View style={styles.createContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Watchlist name"
                  placeholderTextColor={colors.textSecondary}
                  value={newWatchlistName}
                  onChangeText={setNewWatchlistName}
                  autoFocus
                />
                <View style={styles.createActions}>
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsCreatingNew(false);
                      setNewWatchlistName('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.createButton, !newWatchlistName.trim() && styles.createButtonDisabled]}
                    onPress={handleCreateWatchlist}
                    disabled={!newWatchlistName.trim()}
                  >
                    <Text style={styles.createButtonText}>Create</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.newWatchlistButton}
                onPress={() => setIsCreatingNew(true)}
              >
                <IconSymbol name="plus.circle.fill" size={24} color={colors.secondary} />
                <Text style={styles.newWatchlistText}>Create New Watchlist</Text>
              </Pressable>
            )}

            {/* Existing Watchlists */}
            <View style={styles.watchlistsContainer}>
              {watchlists.map((watchlist) => (
                <Pressable
                  key={watchlist.id}
                  style={styles.watchlistItem}
                  onPress={() => handleAddToWatchlist(watchlist.id)}
                >
                  <View style={styles.watchlistInfo}>
                    <Text style={styles.watchlistName}>{watchlist.name}</Text>
                    <Text style={styles.watchlistCount}>
                      {watchlist.showCount} show{watchlist.showCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  createContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  createActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  createButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  newWatchlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.highlight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  newWatchlistText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  watchlistsContainer: {
    gap: 12,
  },
  watchlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  watchlistInfo: {
    flex: 1,
  },
  watchlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  watchlistCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
