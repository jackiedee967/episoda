import {StyleSheet} from 'react-native-unistyles';
import {View} from 'react-native';
import Vector9 from './assets/vector9.svg';

import type {ViewStyle, StyleProp} from 'react-native';

export interface ExpandLeftLightProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function ExpandLeftLight(props: ExpandLeftLightProps) {
  return (
    <View testID={props.testID ?? "330:1142"} style={[styles.root, props.style]}>
      <Vector9/>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    width: 18,
    height: 18,
  },
}));
