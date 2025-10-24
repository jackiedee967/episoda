import {StyleSheet} from 'react-native-unistyles';
import {View, Text} from 'react-native';

import type {ViewStyle, StyleProp} from 'react-native';

export interface ButtonSProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function ButtonS(props: ButtonSProps) {
  return (
    <View testID={props.testID ?? "341:2403"} style={[styles.root, props.style]}>
      <Text testID="341:2402" style={styles.follow}>
        {`Follow`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    flexDirection: 'row',
    width: 92,
    height: 25,
    paddingTop: 16,
    paddingLeft: 20,
    paddingBottom: 16,
    paddingRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    flexShrink: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'Green.Highlight',
  },
  follow: {
    width: 67,
    height: 24,
    flexDirection: 'column',
    justifyContent: 'center',
    flexShrink: 0,
    color: 'Black',
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '600',
  },
}));
