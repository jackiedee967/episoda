import {StyleSheet} from 'react-native-unistyles';
import {View} from 'react-native';
import Vector123 from './assets/vector123.svg';

import type {ViewStyle, StyleProp} from 'react-native';

export interface QuestionLightProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function QuestionLight(props: QuestionLightProps) {
  return (
    <View testID={props.testID ?? "325:312"} style={[styles.root, props.style]}>
      <Vector123/>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    width: 24,
    height: 24,
  },
}));
