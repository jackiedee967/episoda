import {StyleSheet} from 'react-native-unistyles';
import {View, Text} from 'react-native';
import Arrow from './assets/arrow.svg';

import type {ViewStyle, StyleProp} from 'react-native';

export interface PlaylistCardProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function PlaylistCard(props: PlaylistCardProps) {
  return (
    <View testID={props.testID ?? "342:8620"} style={[styles.root, props.style]}>
      <View testID="344:31133" style={styles.titleAndShows}>
        <Text testID="342:8602" style={styles.playlistTitle}>
          {`Playlist Title`}
        </Text>
        <Text testID="342:8603" style={styles.$3Shows}>
          {`3 shows`}
        </Text>
      </View>
      <Arrow/>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    flexDirection: 'row',
    width: 392,
    height: 73,
    paddingTop: 19,
    paddingLeft: 23,
    paddingBottom: 16,
    paddingRight: 28.333,
    alignItems: 'center',
    rowGap: 95,
    columnGap: 95,
    flexShrink: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 0.5,
    borderStyle: 'solid',
    borderColor: 'Card.Stroke',
    backgroundColor: 'Card.Background',
  },
  playlistTitle: {
    color: 'Pure.White',
    fontFamily: 'Funnel Display',
    fontSize: 17,
    fontStyle: 'normal',
    fontWeight: '500',
  },
  $3Shows: {
    width: 238,
    height: 11,
    color: 'Grey.2',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  titleAndShows: {
    width: 238,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    rowGap: 5,
    columnGap: 5,
    flexShrink: 0,
  },
}));
