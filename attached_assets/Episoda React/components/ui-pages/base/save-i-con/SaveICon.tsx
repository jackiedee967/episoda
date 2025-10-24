import {StyleSheet} from 'react-native-unistyles';
import {View} from 'react-native';
import SaveToPlaylistIcon from './assets/savetoplaylisticon.svg';

import type {ViewStyle, StyleProp} from 'react-native';

export interface SaveIConProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function SaveICon(props: SaveIConProps) {
  return (
    <View testID={props.testID ?? "348:16592"} style={[styles.root, props.style]}>
      <View testID="348:16589" style={styles.rectangle45}/>
      <SaveToPlaylistIcon/>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    width: 12,
    height: 12,
    flexShrink: 0,
  },
  rectangle45: {
    width: 12,
    height: 12,
    flexShrink: 0,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.3019607961177826)',
  },
}));
