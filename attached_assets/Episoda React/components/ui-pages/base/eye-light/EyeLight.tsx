import {StyleSheet} from 'react-native-unistyles';
import {View} from 'react-native';
import Vector132 from './assets/vector132.svg';

import type {ViewStyle, StyleProp} from 'react-native';

export interface EyeLightProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function EyeLight(props: EyeLightProps) {
  return (
    <View testID={props.testID ?? "327:903"} style={[styles.root, props.style]}>
      <Vector132/>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    width: 24,
    height: 24,
    flexShrink: 0,
  },
}));
