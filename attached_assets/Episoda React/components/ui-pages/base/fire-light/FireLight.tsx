import {StyleSheet} from 'react-native-unistyles';
import {View} from 'react-native';

import type {ViewStyle, StyleProp} from 'react-native';

export interface FireLightProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function FireLight(props: FireLightProps) {
  return (
    <View testID={props.testID ?? "327:934"} style={[styles.root, props.style]}>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    width: 28,
    height: 28,
    flexShrink: 0,
  },
}));
