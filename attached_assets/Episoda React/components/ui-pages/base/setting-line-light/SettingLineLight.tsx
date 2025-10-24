import {StyleSheet} from 'react-native-unistyles';
import {View} from 'react-native';

import type {ViewStyle, StyleProp} from 'react-native';

export interface SettingLineLightProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function SettingLineLight(props: SettingLineLightProps) {
  return (
    <View testID={props.testID ?? "325:317"} style={[styles.root, props.style]}>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    height: 24,
    alignSelf: 'stretch',
  },
}));
