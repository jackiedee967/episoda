import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import tokens from '@/styles/tokens';
import { Show } from '@/types';
import { getPosterUrl } from '@/utils/posterPlaceholderGenerator';

export interface WatchHistoryCardProps {
  show: Show;
  mostRecentEpisode?: {
    seasonNumber: number;
    episodeNumber: number;
    title: string;
  };
  loggedCount: number;
  totalCount: number;
  onPress?: () => void;
}

export default function WatchHistoryCard(props: WatchHistoryCardProps) {
  const {
    show,
    mostRecentEpisode,
    loggedCount,
    totalCount,
    onPress,
  } = props;

  const router = useRouter();

  const progressPercentage = totalCount > 0 ? (loggedCount / totalCount) * 100 : 0;

  const episodeText = mostRecentEpisode
    ? `S${mostRecentEpisode.seasonNumber} E${mostRecentEpisode.episodeNumber} ${mostRecentEpisode.title}`
    : 'No episodes logged';

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/show/${show.id}`);
    }
  };

  return (
    <Pressable onPress={handlePress} style={styles.root}>
      <Image source={{ uri: getPosterUrl(show.poster, show.title) }} style={styles.poster} />
      <View style={styles.showInfo}>
        <Text style={styles.showTitle} numberOfLines={1}>
          {show.title}
        </Text>
        <Text style={styles.episodeText} numberOfLines={1}>
          {episodeText}
        </Text>
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
        </View>
        <Text style={styles.episodesCount}>
          {`${loggedCount} / ${totalCount} episodes`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: 9,
    paddingLeft: 11,
    paddingBottom: 9,
    paddingRight: 11,
    alignItems: 'center',
    columnGap: 17,
    borderRadius: 10,
    borderWidth: 0.5,
    borderStyle: 'solid',
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
  },
  poster: {
    width: 80,
    height: 99,
    borderRadius: 8,
  },
  showInfo: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    rowGap: 8,
    columnGap: 8,
  },
  showTitle: {
    width: '100%',
    color: tokens.colors.pureWhite,
    fontFamily: 'Funnel Display',
    fontSize: 17,
    fontStyle: 'normal',
    fontWeight: '500',
  },
  episodeText: {
    width: '100%',
    color: tokens.colors.grey2,
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '500',
  },
  progressBarContainer: {
    width: '100%',
    alignSelf: 'stretch',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: tokens.colors.grey3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: tokens.colors.greenHighlight,
    borderRadius: 2,
  },
  episodesCount: {
    color: tokens.colors.grey2,
    textAlign: 'left',
    fontFamily: 'Funnel Display',
    fontSize: 8,
    fontStyle: 'normal',
    fontWeight: '300',
  },
});
