import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import tokens from '@/styles/tokens';

export interface ShowsEpisodeProgressBarProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>;
  /** Used to locate this view in end-to-end tests. */
  testID?: string;
  /** Episode info (e.g., "S01E05") */
  episodeNumber?: string;
  /** Episode title */
  episodeTitle?: string;
  /** Number of episodes logged */
  loggedCount: number;
  /** Total number of episodes in the show */
  totalCount: number;
}

export default function ShowsEpisodeProgressBar(props: ShowsEpisodeProgressBarProps) {
  const {
    style,
    testID,
    episodeNumber,
    episodeTitle,
    loggedCount,
    totalCount,
  } = props;

  // Calculate progress percentage (0-100)
  const progressPercentage = totalCount > 0 ? (loggedCount / totalCount) * 100 : 0;

  // Only show episode info if there's an episode logged
  const hasEpisode = episodeNumber && episodeTitle;

  return (
    <View testID={testID ?? "370:101728"} style={[styles.root, style]}>
      <View testID="370:101722" style={styles.showInfo}>
        {hasEpisode && (
          <Text testID="370:101723" style={styles.sEEpisodeTitle}>
            {`${episodeNumber} ${episodeTitle}`}
          </Text>
        )}
        <View testID="370:101724" style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
        </View>
        <Text testID="370:101727" style={styles.episodesCount}>
          {`${loggedCount} / ${totalCount} episodes`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 392,
    paddingTop: 9,
    paddingLeft: 11,
    paddingBottom: 9,
    paddingRight: 11,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 0.5,
    borderStyle: 'solid',
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
  },
  sEEpisodeTitle: {
    width: '100%',
    flexDirection: 'column',
    justifyContent: 'center',
    color: tokens.colors.grey2,
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '500',
  },
  showInfo: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    rowGap: 8,
    columnGap: 8,
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
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
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 8,
    fontStyle: 'normal',
    fontWeight: '300',
  },
});
