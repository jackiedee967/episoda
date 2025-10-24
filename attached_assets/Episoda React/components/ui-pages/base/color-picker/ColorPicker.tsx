import {StyleSheet} from 'react-native-unistyles';
import {View} from 'react-native';

import Vector579 from './assets/vector579.svg';
import Vector580 from './assets/vector580.svg';

import type {ViewStyle, StyleProp} from 'react-native';

export interface ColorPickerProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function ColorPicker(props: ColorPickerProps) {
  return (
    <View testID={props.testID ?? "330:604"} style={[styles.root, props.style]}>
      <Vector579/>
      <Vector580/>
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
