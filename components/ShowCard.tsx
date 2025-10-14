
import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { Show } from '@/types';
import { useRouter } from 'expo-router';

interface ShowCardProps {
  show: Show;
}

export default function ShowCard({ show }: ShowCardProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/show/${show.id}`);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Image source={{ uri: show.poster }} style={styles.poster} />
      <View style={styles.friendsWatching}>
        <Text style={styles.friendsText}>{show.friendsWatching} friends</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    marginRight: 12,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
  friendsWatching: {
    marginTop: 8,
    backgroundColor: colors.highlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  friendsText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
  },
});
